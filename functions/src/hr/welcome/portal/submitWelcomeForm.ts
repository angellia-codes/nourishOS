import { onCall } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'
import {
  db,
  COLLECTIONS,
  REGION,
  recordAuditEvent,
  updatedFields,
  todayIso,
  AppError,
  handleError,
  successResponse,
} from '../../../lib'
import { submitApprovalInternal } from '../../../shared/approval'
import { createTaskInternal } from '../../../shared/tasks'
import { notifyUsersByRole } from '../../../shared/notifications'
import { setEmployeeBankDetailsInternal } from '../../employees/updateEmployeeCompensation'
import { resolveWelcomeInviteForEdit, welcomeActor } from '../invite'
import { pickWelcomeDraft, validateWelcomeSubmission } from '../whitelist'

/**
 * welcome-portal.md §3.3 step 6 — the one write that leaves the invite and
 * lands on the employee record.
 *
 * The server validates the stored draft, not the payload: the client's own
 * checks are a courtesy (§11 "Server is authoritative"), and anything sent in
 * this call is merged through the same whitelist as an autosave before it
 * counts. A caller who skips every save and posts the whole form at once gets
 * exactly the same treatment as one who typed it step by step.
 */

interface SubmitInput {
  token: string
  values?: Record<string, unknown>
}

export const submitWelcomeForm = onCall({ region: REGION, maxInstances: 10 }, async (request) => {
  try {
    const data = (request.data ?? {}) as Partial<SubmitInput>
    // ForEdit, not the plain resolver: §2 D6 locks the form on submit, so a
    // second submit is refused here rather than silently overwriting.
    const { ref, invite, employeeId, employee, employeeRef } = await resolveWelcomeInviteForEdit(data.token)

    const stored = (invite.draft ?? {}) as Record<string, unknown>
    const { draft: lastMinute, rejected } = pickWelcomeDraft(data.values ?? {})
    if (rejected.length > 0) {
      throw new AppError('invalid-argument', rejected[0].message, { rejected })
    }
    const draft = { ...stored, ...lastMinute }

    const { employeeUpdates, bank, issues } = validateWelcomeSubmission(draft, todayIso())
    if (issues.length > 0) {
      throw new AppError('invalid-argument', issues[0].message, { issues })
    }

    const actor = welcomeActor(employeeId, employee)

    // §10.6 — a duplicate NIK is detected here and surfaced only on HR's
    // verify task. The hire is never told: they cannot act on it, and telling
    // them turns this form into an oracle for whether a given NIK is on file.
    const duplicateNik = await findDuplicateNationalId(employeeUpdates.nationalId as string, employeeId)

    await employeeRef.update({
      ...employeeUpdates,
      onboardingStatus: 'submitted',
      onboardingSubmittedAt: new Date().toISOString(),
      onboardingRejectionReason: null,
      ...updatedFields(actor.uid),
    })

    // Bank details never touch the employee document (§10.4) — merge-safe so
    // an HR-entered salary survives the hire filling in their BCA number.
    await setEmployeeBankDetailsInternal(actor, employeeId, bank)

    await ref.update({ draft, lockedAt: new Date().toISOString(), ...updatedFields(actor.uid) })

    await recordAuditEvent({
      eventType: 'OnboardingDataSubmitted',
      category: 'HR',
      module: 'hr',
      resourceType: 'employee',
      resourceId: employeeId,
      action: 'update',
      user: actor,
      // Field names only. This audit entry is read by more people than the
      // employee document is, and the values include a NIK.
      newValues: { fields: Object.keys(employeeUpdates).sort(), duplicateNik: Boolean(duplicateNik) },
    })

    // Everything below is after-the-fact: the hire's data is committed, and a
    // failed notification must not read to them as a failed submission.
    const fullName = (employeeUpdates.fullName as string) || 'A new hire'
    try {
      await notifyUsersByRole({
        role: 'hrManager',
        module: 'hr',
        title: 'Onboarding data submitted',
        message: duplicateNik
          ? `${fullName} submitted their details. Their NIK matches an existing employee — check before verifying.`
          : `${fullName} submitted their onboarding details. Verify them against the contract.`,
        referenceId: employeeId,
        priority: duplicateNik ? 'high' : 'medium',
      })

      // No HR Manager account means no task; the approval request below still
      // queues for whoever claims the role later.
      const assignees = await hrManagerUids()
      if (assignees.length > 0) {
        await createTaskInternal({
          title: `Verify onboarding data — ${fullName}`,
          description: duplicateNik
            ? `Check the submitted details against the contract and the uploaded KTP/KK. Note: this NIK already exists on employee ${duplicateNik}.`
            : 'Check the submitted details against the contract and the uploaded KTP/KK.',
          taskType: 'documentReview',
          sourceModule: 'hr',
          referenceId: employeeId,
          assignedTo: assignees,
          assignedBy: actor.uid,
          priority: 'high',
          tags: ['onboarding-verify'],
        })
      }

      await submitApprovalInternal({
        module: 'hr',
        resourceType: 'onboardingVerification',
        resourceId: employeeId,
        requestedBy: actor.uid,
        priority: 'high',
        context: {
          departmentId: (employee.departmentId as string | null) ?? null,
          outletId: (employee.outletId as string | null) ?? null,
        },
      })

      await employeeRef.update({ onboardingStatus: 'pendingVerification', ...updatedFields(actor.uid) })
    } catch (error) {
      // §3.4 leaves the employee at 'submitted' in this case, which is honest:
      // the data is in, HR just has no request in their queue yet.
      logger.error(`Onboarding submitted for ${employeeId} but the HR hand-off failed`, error)
    }

    return successResponse({ employeeId, fullName }, 'Thank you — your details are with HR.')
  } catch (error) {
    return handleError(error)
  }
})

/** §10.6. Bare equality on an indexed field — no composite index needed. */
async function findDuplicateNationalId(nationalId: string, employeeId: string): Promise<string | null> {
  const snap = await db
    .collection(COLLECTIONS.EMPLOYEES)
    .where('nationalId', '==', nationalId)
    .limit(2)
    .get()
  const other = snap.docs.find((doc) => doc.id !== employeeId)
  return other ? other.id : null
}

/**
 * createTaskInternal wants uids, and there is no authenticated caller here to
 * borrow a role queue from. Same query notifyUsersByRole runs.
 */
async function hrManagerUids(): Promise<string[]> {
  const snap = await db
    .collection(COLLECTIONS.USERS)
    .where('roleId', '==', 'hrManager')
    .where('status', '==', 'active')
    .get()
  return snap.docs.map((doc) => doc.id)
}
