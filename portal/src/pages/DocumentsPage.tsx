import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Field, Notice, Select } from '../ui'
import { getApplicationStatus, toBase64, uploadCandidateDocument } from '../api'
import { readToken } from '../token'

/** candidate_portal.md §15 Screen 5 / §27 — PDF, JPG or PNG, under 8MB. */
const TYPES = [
  { value: 'cv', label: 'CV / résumé (required)' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'idCard', label: 'ID card (KTP)' },
  { value: 'other', label: 'Other' },
]

export function DocumentsPage() {
  const navigate = useNavigate()
  const token = readToken()

  const [documentType, setDocumentType] = useState('cv')
  const [uploaded, setUploaded] = useState<{ documentType: string; fileName: string }[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!token) {
      navigate('/', { replace: true })
      return
    }
    getApplicationStatus(token)
      .then((status) => setUploaded(status.documents))
      .catch((problem: Error) => setError(problem.message))
  }, [token, navigate])

  async function handleFile(file: File | undefined) {
    if (!file || !token) return
    setBusy(true)
    setError('')
    try {
      const result = await uploadCandidateDocument({
        applicationToken: token,
        documentType,
        fileName: file.name,
        mimeType: file.type,
        contentBase64: await toBase64(file),
      })
      setUploaded((current) => [...current, { documentType: result.documentType, fileName: result.fileName }])
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Could not upload that file.')
    } finally {
      setBusy(false)
    }
  }

  const hasCv = uploaded.some((file) => file.documentType === 'cv')

  return (
    <>
      <h1 className="text-xl font-semibold">Your documents</h1>
      {error && <Notice tone="error">{error}</Notice>}

      <Card className="flex flex-col gap-3">
        <Field label="Document type">
          <Select value={documentType} onChange={(event) => setDocumentType(event.target.value)}>
            {TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="File" hint="PDF, JPG or PNG, up to 8MB.">
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            disabled={busy}
            onChange={(event) => handleFile(event.target.files?.[0])}
            className="text-sm text-muted-foreground file:mr-3 file:h-11 file:rounded-md file:border file:border-border file:bg-sunken file:px-4 file:text-sm file:text-foreground"
          />
        </Field>

        {busy && <p className="text-sm text-muted-foreground">Uploading…</p>}
      </Card>

      <Card className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">Uploaded ({uploaded.length})</h2>
        {uploaded.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing uploaded yet.</p>
        ) : (
          uploaded.map((file, index) => (
            <p key={`${file.fileName}-${index}`} className="text-sm">
              <span className="text-muted-foreground">{file.documentType}</span> · {file.fileName}
            </p>
          ))
        )}
      </Card>

      <div className="flex justify-between pb-8">
        <Button variant="secondary" onClick={() => navigate('/apply/form')}>
          Back to form
        </Button>
        <Button onClick={() => navigate('/apply/disc')} disabled={!hasCv}>
          Continue to assessment
        </Button>
      </div>
    </>
  )
}
