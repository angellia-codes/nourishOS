import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileText, Image as ImageIcon, Upload, X } from 'lucide-react'
import { Avatar, Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { EmptyState, ErrorMessage } from '@/components/shared'
import { CONTRACT_TYPE_LABELS, EMPLOYMENT_STATUS_LABELS } from '@/constants/hr'
import { formatIsoDate, formatTenure, isContractExpiringSoon, isProbationEndingSoon } from '@/features/hr/utils/employeeIndicators'
import { MOCK_DOCUMENTS, MOCK_EMPLOYEES, type MockDocument } from './employeeDemoData'

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value || '—'}</p>
    </div>
  )
}

const IMAGE_TYPES = new Set(['jpg', 'jpeg', 'png'])

/**
 * Read-only visual preview of EmployeeProfilePage seeded with static mock
 * data — no auth, no backend calls. The Documents section stands in for the
 * generic File Storage service (module=hr, resourceType=employee): "uploads"
 * here only append to local state, they never touch Cloud Storage.
 */
export function EmployeeProfileDemoPage() {
  const { employeeId } = useParams<{ employeeId: string }>()
  const navigate = useNavigate()

  const employee = MOCK_EMPLOYEES.find((e) => e.id === employeeId)
  const [documents, setDocuments] = useState<MockDocument[]>(employeeId ? (MOCK_DOCUMENTS[employeeId] ?? []) : [])

  function handleMockUpload() {
    const nextId = `doc-demo-${documents.length + 1}`
    setDocuments((prev) => [
      { id: nextId, fileName: `New Document ${prev.length + 1}.pdf`, fileType: 'pdf', uploadedAt: new Date().toISOString().slice(0, 10) },
      ...prev,
    ])
  }

  function handleRemove(id: string) {
    setDocuments((prev) => prev.filter((d) => d.id !== id))
  }

  if (!employee) {
    return <ErrorMessage message="Employee not found in demo data." />
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto mb-6 max-w-3xl rounded-lg border border-dashed border-border bg-surface p-3 text-center text-xs text-muted-foreground">
        Demo — mock data, no Firebase calls. Document uploads here only update local state.
      </div>

      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate('/demo/hr/employees')}
            aria-label="Back to employees"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Avatar name={employee.fullName} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-foreground">{employee.fullName}</h1>
              {employee.status === 'active' ? (
                <Badge variant="success">Active</Badge>
              ) : (
                <Badge variant="neutral">Inactive</Badge>
              )}
              {isProbationEndingSoon(employee) && <Badge variant="warning">Probation ending</Badge>}
              {isContractExpiringSoon(employee) && <Badge variant="error">Contract expiring</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">
              {employee.employeeNumber} &middot; {employee.position} &middot; Tenure {formatTenure(employee.joinDate)}
            </p>
          </div>
        </div>

        {/* Personal */}
        <Card>
          <CardHeader>
            <CardTitle>Personal</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Preferred name" value={employee.preferredName} />
            <Field label="Gender" value={employee.gender === 'male' ? 'Male' : 'Female'} />
            <Field label="Birth date" value={formatIsoDate(employee.birthDate)} />
            <Field label="National ID (NIK)" value={employee.nationalId} />
            <Field label="Tax number (NPWP)" value={employee.taxNumber} />
            <Field label="Religion" value={employee.religion} />
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Phone" value={employee.phone} />
            <Field label="Email" value={employee.email} />
            <Field label="Address" value={employee.address} />
            <Field label="Emergency contact" value={employee.emergencyContactName} />
            <Field label="Emergency phone" value={employee.emergencyContactPhone} />
          </CardContent>
        </Card>

        {/* Employment & contract */}
        <Card>
          <CardHeader>
            <CardTitle>Employment</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Employment status" value={EMPLOYMENT_STATUS_LABELS[employee.employmentStatus]} />
            <Field label="Department" value={employee.departmentId} />
            <Field label="Outlet" value={employee.outletId} />
            <Field label="Join date" value={formatIsoDate(employee.joinDate)} />
            <Field
              label="Probation ends"
              value={employee.probationEndDate ? formatIsoDate(employee.probationEndDate) : 'No probation'}
            />
            <Field label="Contract type" value={CONTRACT_TYPE_LABELS[employee.contractType]} />
            <Field label="Contract start" value={formatIsoDate(employee.contractStartDate)} />
            <Field label="Contract end" value={formatIsoDate(employee.contractEndDate)} />
          </CardContent>
        </Card>

        {/* Documents — HR.md §5 Documents; real page backs this with the generic File Storage service */}
        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div
              onClick={handleMockUpload}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handleMockUpload()
              }}
              className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-center transition-colors duration-150 hover:border-primary/50"
            >
              <Upload className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-primary">Click to add a demo document</span>
              </p>
              <p className="text-xs text-muted-foreground">ID Card, NPWP, BPJS, Contract, Certificates</p>
            </div>

            {documents.length === 0 ? (
              <EmptyState title="No documents yet" description="Upload the employee's ID card, contract, or certificates." />
            ) : (
              <ul className="flex flex-col gap-2">
                {documents.map((doc) => {
                  const Icon = IMAGE_TYPES.has(doc.fileType) ? ImageIcon : FileText
                  return (
                    <li key={doc.id} className="flex items-center gap-3 rounded-md border border-border p-2 text-sm">
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="flex-1 truncate text-foreground">{doc.fileName}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{formatIsoDate(doc.uploadedAt)}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(doc.id)}
                        aria-label={`Remove ${doc.fileName}`}
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
