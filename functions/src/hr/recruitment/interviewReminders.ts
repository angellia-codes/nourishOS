import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions/v2'
import { Timestamp } from 'firebase-admin/firestore'
import { db, COLLECTIONS, REGION, BUSINESS_TIME_ZONE } from '../../lib'
import { FONNTE_TOKEN } from '../../lib/secrets'
import { whatsAppTargetForUid } from '../../shared/notifications'
import { STAGE_LABELS, type CandidateStage } from './helpers'
import { notifyInterviewReminder } from './whatsappTemplates'

/**
 * HR_OPERATIONS.md §9.5 template 3 / §9.11's "Interview scheduled … + 24h
 * prior" row: reminds the candidate and the interviewer the day before.
 *
 * Runs hourly rather than once a day because interviews are scheduled to the
 * minute: a single daily pass would either remind ~24h early or ~24h late for
 * most slots. Each run takes the window 24–25 hours out, so every interview
 * falls in exactly one window and no `reminderSent` flag is needed — the same
 * stateless-by-construction argument `contractAlerts.ts` makes for its
 * exact-day-match query.
 */
export const sendInterviewReminders = onSchedule(
  { schedule: '0 * * * *', timeZone: BUSINESS_TIME_ZONE, region: REGION, secrets: [FONNTE_TOKEN] },
  async () => {
    const windowStart = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const windowEnd = new Date(windowStart.getTime() + 60 * 60 * 1000)

    const snap = await db
      .collection(COLLECTIONS.INTERVIEWS)
      .where('outcome', '==', 'pending')
      .where('scheduledAt', '>=', Timestamp.fromDate(windowStart))
      .where('scheduledAt', '<', Timestamp.fromDate(windowEnd))
      .get()

    for (const doc of snap.docs) {
      const interview = doc.data()
      try {
        const candidateSnap = await db.collection(COLLECTIONS.CANDIDATES).doc(interview.candidateId as string).get()
        if (!candidateSnap.exists) continue

        await notifyInterviewReminder({
          candidate: candidateSnap.data()!,
          stageLabel: STAGE_LABELS[interview.stage as CandidateStage],
          scheduledAt: (interview.scheduledAt as Timestamp).toDate(),
          location: interview.location as string,
          interviewerPhone: await whatsAppTargetForUid(interview.interviewerUid as string),
        })
      } catch (error) {
        logger.error(`Failed to send interview reminder for ${doc.id}`, error)
      }
    }
  },
)
