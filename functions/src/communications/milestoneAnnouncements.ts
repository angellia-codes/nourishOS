import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onCall } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'
import { FieldValue } from 'firebase-admin/firestore'
import {
  db,
  COLLECTIONS,
  REGION,
  BUSINESS_TIME_ZONE,
  todayIso,
  requireActiveUser,
  recordAuditEvent,
  newDocumentBaseFields,
  AppError,
  handleError,
  successResponse,
  type AuthedUser,
} from '../lib'
import { FONNTE_TOKEN } from '../lib/secrets'
import { sendWhatsApp } from '../shared/notifications'
import { publishInternal, type AnnouncementFields } from './announcements'
import { milestonesFor, yearsOfService, type MilestoneKind } from './milestoneMatch'

/**
 * Employee milestone announcements — birthday, work anniversary, new hire and
 * farewell, auto-created and auto-published company-wide at 07:00 WITA.
 *
 * Three things shape this file:
 *
 * 1. **One collection scan, four milestones.** `birthDate`/`joinDate` are full
 *    'YYYY-MM-DD' civil dates, so `contractAlerts.ts`'s exact-day equality
 *    query cannot match a recurring MM-DD; and a farewell has to be found on
 *    an already-`inactive` employee (see milestoneMatch.ts). Both dissolve into
 *    one unfiltered read filtered in memory.
 *    ponytail: one employees scan per day. Fine at Nourish's headcount — the
 *    same ceiling `resolveAudienceUids` already accepts, and for the same
 *    reason.
 * 2. **A deterministic announcement id is the dedup.** These publish with no
 *    human in the loop, so "the day passes once" is not enough on its own — a
 *    retried run would post twice. `.create()` on
 *    `milestone_{kind}_{employeeId}_{date}` throws ALREADY_EXISTS instead.
 * 3. **The celebrant is reached by phone, not by uid.** Nothing populates
 *    `users/{uid}.employeeId` yet, so `whatsAppTargetForUid` resolves to null
 *    for almost everyone. `employee.phone` goes in as `whatsappTarget`, which
 *    is exactly the case that override exists for.
 */

const SYSTEM_USER: AuthedUser = {
  uid: 'system:milestoneAnnouncements',
  email: null,
  displayName: 'System (Milestones)',
  roleId: 'system',
  departmentId: null,
  outletId: null,
  permissions: [],
  employeeId: null,
}

/** The five taps offered under a milestone post. Rejecting anything else keeps the emoji slot from becoming a second message field. */
export const WISH_EMOJI = ['🎉', '🎂', '❤️', '👏', '🔥'] as const

const WISH_MESSAGE_MAX = 280

interface MilestoneEmployee {
  fullName: string
  phone?: string | null
  joinDate?: string | null
}

/**
 * Announcement copy per milestone. Category is `events` and priority is
 * `medium` on purpose: the feed renders a priority badge for everything except
 * medium, and a birthday post does not need one.
 */
function buildFields(kind: MilestoneKind, employee: MilestoneEmployee, today: string): AnnouncementFields {
  const name = employee.fullName
  const base = {
    category: 'events' as const,
    priority: 'medium' as const,
    isPinned: false,
    outletIds: [],
    departmentIds: [],
    roleIds: [],
  }

  switch (kind) {
    case 'birthday':
      return {
        ...base,
        title: `🎂 Happy Birthday, ${name}!`,
        body: `Today is ${name}'s birthday! 🎉\n\nTap an emoji or leave a message below to send your wishes. 🥳`,
      }
    case 'anniversary': {
      const years = yearsOfService(employee.joinDate ?? today, today)
      return {
        ...base,
        title: `🎊 ${years} Year${years === 1 ? '' : 's'} at Nourish — ${name}`,
        body: `${name} is celebrating ${years} year${years === 1 ? '' : 's'} with Nourish Group today. 🎊\n\nThank you for everything — leave a note below. 👏`,
      }
    }
    case 'newHire':
      return {
        ...base,
        title: `👋 Welcome to the team, ${name}!`,
        body: `${name} joins Nourish Group today. 👋\n\nSay hello below and help them settle in. 🙌`,
      }
    case 'farewell':
      return {
        ...base,
        title: `🙏 Farewell, ${name}`,
        body: `Today is ${name}'s last working day at Nourish Group. 🙏\n\nLeave a farewell message below — all the best for what comes next. 👋`,
      }
  }
}

/** A personal WhatsApp on top of the company post. Not for a farewell — that one is for the team to write, not for the company to send. */
function personalGreeting(kind: MilestoneKind, employee: MilestoneEmployee, today: string): string | null {
  switch (kind) {
    case 'birthday':
      return `Happy Birthday, ${employee.fullName}! 🎂 Everyone at Nourish Group wishes you a wonderful day. 🎉`
    case 'anniversary': {
      const years = yearsOfService(employee.joinDate ?? today, today)
      return `Congratulations on ${years} year${years === 1 ? '' : 's'} with Nourish Group, ${employee.fullName}! 🎊 Thank you for everything you bring to the team.`
    }
    case 'newHire':
      return `Welcome to Nourish Group, ${employee.fullName}! 👋 We are glad to have you with us — have a great first day.`
    case 'farewell':
      return null
  }
}

/** Firestore surfaces a duplicate create as gRPC code 6; the message is checked too so a wrapped error still matches. */
function isAlreadyExists(error: unknown): boolean {
  const code = (error as { code?: number | string } | null)?.code
  return code === 6 || code === 'already-exists' || String(error).includes('ALREADY_EXISTS')
}

export const milestoneAnnouncements = onSchedule(
  { schedule: '0 7 * * *', timeZone: BUSINESS_TIME_ZONE, region: REGION, secrets: [FONNTE_TOKEN] },
  async () => {
    const today = todayIso()
    const snap = await db.collection(COLLECTIONS.EMPLOYEES).get()

    for (const doc of snap.docs) {
      const employee = doc.data() as MilestoneEmployee & Parameters<typeof milestonesFor>[0]

      for (const kind of milestonesFor(employee, today)) {
        try {
          await postMilestone(kind, doc.id, employee, today)
        } catch (error) {
          // One malformed employee record must not take the rest of the run
          // down with it — same containment as contractAlerts.ts.
          logger.error(`Failed to post ${kind} milestone for employee ${doc.id}`, error)
        }
      }
    }
  },
)

async function postMilestone(
  kind: MilestoneKind,
  employeeId: string,
  employee: MilestoneEmployee,
  today: string,
): Promise<void> {
  const fields = buildFields(kind, employee, today)
  const announcementId = `milestone_${kind}_${employeeId}_${today}`
  const ref = db.collection(COLLECTIONS.ANNOUNCEMENTS).doc(announcementId)

  try {
    await ref.create({
      ...fields,
      milestoneType: kind,
      milestoneEmployeeId: employeeId,
      wishCount: 0,
      announcementStatus: 'draft',
      audienceUids: [],
      publishedAt: null,
      publishedBy: null,
      ...newDocumentBaseFields(SYSTEM_USER.uid),
    })
  } catch (error) {
    if (isAlreadyExists(error)) {
      logger.info(`Milestone ${announcementId} already posted — skipping.`)
      return
    }
    throw error
  }

  const audienceUids = await publishInternal(announcementId, fields, SYSTEM_USER)

  // sendWhatsApp directly rather than sendNotificationInternal: the celebrant
  // already got the in-app announcement notification from publishInternal
  // above, and most employees have no `users` doc to address a second one to.
  // Never throws — an unprovisioned FONNTE_TOKEN is a SKIPPED result.
  const greeting = personalGreeting(kind, employee, today)
  if (greeting && employee.phone) {
    const result = await sendWhatsApp(employee.phone, `*${fields.title}*\n\n${greeting}`)
    if (result.status !== 'sent') {
      logger.info(`Milestone WhatsApp for ${announcementId}: ${result.status}`, result.error)
    }
  }

  await recordAuditEvent({
    eventType: 'AnnouncementPublished',
    category: 'Communications',
    module: 'communications',
    resourceType: 'announcement',
    resourceId: announcementId,
    action: 'publish',
    user: SYSTEM_USER,
    severity: 'informational',
    newValues: { milestoneType: kind, milestoneEmployeeId: employeeId, title: fields.title },
    metadata: { recipientCount: audienceUids.length },
  })
}

/**
 * One wish document per (announcement, person), id `${announcementId}_${uid}` —
 * the same idempotent composite id `recordAnnouncementRead` uses. An emoji tap
 * writes it with an empty message; adding text or changing the emoji updates
 * the same document, so a person holds one wish rather than a tally.
 *
 * No permission string: identity-gated like `recordAnnouncementRead`, which
 * also keeps this clear of the module's recurring "existing `roles/{roleId}`
 * docs need the new string added by hand" gotcha.
 *
 * The `milestoneType` precondition is load-bearing. `announcementWishes` is
 * readable by any signed-in user, and that is only sound while every wishable
 * announcement is company-wide — which milestone posts are by construction.
 */
export const sendMilestoneWish = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)

    const { announcementId, emoji, message } = (request.data ?? {}) as {
      announcementId?: string
      emoji?: string
      message?: string
    }

    if (!announcementId) {
      throw new AppError('invalid-argument', 'announcementId is required.')
    }
    if (!emoji || !(WISH_EMOJI as readonly string[]).includes(emoji)) {
      throw new AppError('invalid-argument', `emoji must be one of: ${WISH_EMOJI.join(' ')}.`)
    }
    const text = message?.trim() ?? ''
    if (text.length > WISH_MESSAGE_MAX) {
      throw new AppError('invalid-argument', `A wish must be ${WISH_MESSAGE_MAX} characters or fewer.`)
    }

    const announcementRef = db.collection(COLLECTIONS.ANNOUNCEMENTS).doc(announcementId)
    const announcementSnap = await announcementRef.get()
    if (!announcementSnap.exists) {
      throw new AppError('not-found', 'That announcement no longer exists.')
    }
    const announcement = announcementSnap.data()!
    if (!announcement.milestoneType) {
      throw new AppError('failed-precondition', 'Wishes can only be left on a milestone announcement.')
    }
    if (announcement.announcementStatus !== 'published') {
      throw new AppError('failed-precondition', 'That announcement is not open for wishes.')
    }

    const wishRef = db.collection(COLLECTIONS.ANNOUNCEMENT_WISHES).doc(`${announcementId}_${user.uid}`)
    const existing = await wishRef.get()

    await wishRef.set(
      {
        announcementId,
        uid: user.uid,
        senderName: user.displayName ?? 'Someone',
        emoji,
        message: text,
        ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )

    // Only a first wish moves the counter — otherwise editing a wish would
    // inflate the badge the feed renders from it.
    if (!existing.exists) {
      await announcementRef.update({ wishCount: FieldValue.increment(1) })
    }

    return successResponse({ announcementId }, 'Wish sent.')
  } catch (error) {
    return handleError(error)
  }
})
