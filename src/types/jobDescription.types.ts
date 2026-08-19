import type { BaseDocument } from './firestore.types'
import type { Role } from '@/constants/roles'

/**
 * A row in the Job Descriptions register — documents.md §5/§20.
 *
 * `pdfUrl` is an external link, not a `files` record queried by
 * resourceType/resourceId the way Employee/Appraisal/PatrolLog attachments are
 * (FILE_STORAGE.md §15). The job description PDFs already live in the company's
 * Drive, so nothing is uploaded to Storage here and there is no file metadata
 * doc to join against. The Cloud Function restricts the link to http(s).
 *
 * `roleId` is the RBAC role, not a POSITIONS.md position, so the department →
 * role dropdown chain can reuse DEPARTMENT_ROLES and so the access allowlist
 * speaks the same vocabulary as the register itself.
 */
export interface JobDescription extends BaseDocument {
  departmentId: string
  roleId: Role
  title: string
  pdfUrl: string
  notes?: string | null
}

/** systemSettings/jobDescriptionAccess — the roles allowed to read the register. */
export interface JobDescriptionAccess extends BaseDocument {
  roleIds: Role[]
}
