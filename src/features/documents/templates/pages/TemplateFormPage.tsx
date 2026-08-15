import { ResourceFormPage } from '../../resources/pages/ResourceFormPage'

export function TemplateFormPage() {
  return <ResourceFormPage kind="template" title="Template" basePath="/documents/templates" paramName="templateId" />
}
