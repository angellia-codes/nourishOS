import { ResourceListPage } from '../../resources/pages/ResourceListPage'

export function CompanyFormListPage() {
  return (
    <ResourceListPage
      kind="form"
      title="Company Forms"
      description="Downloadable company forms."
      basePath="/documents/company-forms"
    />
  )
}
