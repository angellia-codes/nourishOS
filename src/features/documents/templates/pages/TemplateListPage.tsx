import { ResourceListPage } from '../../resources/pages/ResourceListPage'

export function TemplateListPage() {
  return (
    <ResourceListPage kind="template" title="Templates" description="Word, Excel and PDF templates." basePath="/documents/templates" />
  )
}
