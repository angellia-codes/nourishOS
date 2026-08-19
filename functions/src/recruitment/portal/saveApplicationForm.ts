import { onCall } from 'firebase-functions/v2/https'
import { REGION, recordAuditEvent, handleError, successResponse } from '../../lib'
import { parseApplicationForm, missingRequiredSections } from './applicationForm'
import { requirePayloadUnderLimit } from './guard'
import { portalActor, resolveCandidateForEdit } from './token'

/**
 * candidate_portal.md §15 Screen 4 / employment-application-form.md §4.
 *
 * Idempotent whole-form save: the portal posts everything it has each time a
 * step is completed, so re-saving is normal and the last write wins. Sensitive
 * answers land in the `confidential` sub-collection instead of on the
 * candidate document (§3), which is what makes the `recruitment.viewSensitive`
 * rule enforceable — Firestore rules gate documents, not fields.
 */
export const saveApplicationForm = onCall({ region: REGION }, async (request) => {
  try {
    const data = (request.data ?? {}) as Record<string, unknown>
    requirePayloadUnderLimit(data)

    const { candidateId, candidate, ref } = await resolveCandidateForEdit(data.applicationToken)
    const { form, sensitive } = parseApplicationForm((data.form ?? {}) as Record<string, unknown>)

    await ref.update({
      applicationForm: form,
      updatedAt: new Date(),
      updatedBy: `portal:${candidateId}`,
    })

    await ref.collection('confidential').doc('application').set(
      {
        ...sensitive,
        updatedAt: new Date(),
        updatedBy: `portal:${candidateId}`,
      },
      { merge: true },
    )

    await recordAuditEvent({
      eventType: 'PortalApplicationFormSaved',
      category: 'HR',
      module: 'hr',
      resourceType: 'candidate',
      resourceId: candidateId,
      action: 'update',
      user: portalActor(candidateId, candidate),
      newValues: { declarationAccepted: form.declarationAccepted },
    })

    return successResponse({ candidateId, missing: missingRequiredSections(form) }, 'Saved.')
  } catch (error) {
    return handleError(error)
  }
})
