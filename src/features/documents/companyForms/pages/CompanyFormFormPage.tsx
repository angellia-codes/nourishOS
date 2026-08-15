import { ResourceFormPage } from '../../resources/pages/ResourceFormPage'

export function CompanyFormFormPage() {
  return <ResourceFormPage kind="form" title="Company Form" basePath="/documents/company-forms" paramName="companyFormId" />
}
