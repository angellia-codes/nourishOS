import type { BaseDocument } from './firestore.types'
import type { Role } from '@/constants/roles'

/**
 * A row in the SOP Library — documents.md §6.
 *
 * `driveUrl` is an external link, not a `files` record queried by
 * resourceType/resourceId (FILE_STORAGE.md §15): the SOPs already live in the
 * company's Google Drive, so nothing is uploaded to Storage here. The Cloud
 * Function restricts the link to http(s).
 *
 * §6 also lists version history, approval workflow, tags and search. None of
 * that ships here — this is the browse-by-department register, and a versioned
 * SOP would belong to the `documents` collection instead.
 */
export interface Sop extends BaseDocument {
  departmentId: string
  sopNumber: string
  topic: string
  driveUrl: string
}

/** systemSettings/sopAccess — the roles allowed to read the library. */
export interface SopAccess extends BaseDocument {
  roleIds: Role[]
}
