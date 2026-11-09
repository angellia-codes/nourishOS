import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCheck, Clock, Copy, Lock, Send } from 'lucide-react'
import { Button, Card, CardContent, Input, Spinner, StatusPill } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { PERMISSIONS } from '@/constants'
import { usePermissions, useToast } from '@/hooks'
import { formatDate } from '@/utils'
import * as welcomeService from '@/features/hr/welcome/welcomeService'
import * as recruitmentService from '../recruitmentService'
import type { OnboardingChecklist } from '@/types'

/** How many required documents are still outstanding — the same rule the server closes on. */
function outstandingMandatory(checklist: OnboardingChecklist): number {
  return checklist.documentChecklist.filter((item) => item.tier === 'mandatory' && item.status === 'pending').length
}

/**
 * Open onboarding checklists — one per hire, created automatically when a
 * candidate reaches Hired.
 */
export function OnboardingListPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { can } = usePermissions()
  const [rows, setRows] = useState<OnboardingChecklist[] | null>(null)
  const [denied, setDenied] = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)
  /**
   * welcome-portal.md §3.3 step 2 / §10.9 (v1.7) — the link each issue/reissue
   * returned, keyed by checklist id. Interim while Fonnte isn't connected (F4).
   * Memory only, on purpose: the raw token exists in that one response and is
   * never persisted, so a reload drops it and Resend mints a fresh one.
   */
  const [links, setLinks] = useState<Record<string, { url: string; expiresAt: string }>>({})

  useEffect(() => {
    return recruitmentService.subscribeToOnboardingChecklists(
      (next) => {
        setDenied(false)
        setRows(next)
      },
      () => {
        setDenied(true)
        setRows([])
      },
    )
  }, [])

  /**
   * welcome-portal.md §3.3 step 2. The employee record has to exist first:
   * reaching Hired creates this checklist but deliberately not the employee
   * (candidate data has no NIK, contract type or probation), and the welcome
   * link writes into that record. The server enforces the same precondition.
   */
  async function sendLink(row: OnboardingChecklist) {
    const resend = Boolean(row.welcomeInviteSentAt)
    setSendingId(row.id)
    try {
      const result = resend
        ? await welcomeService.reissueWelcomeInvite(row.id)
        : await welcomeService.issueWelcomeInvite(row.id)
      const link = result.link
      if (link) setLinks((current) => ({ ...current, [row.id]: { url: link, expiresAt: result.expiresAt } }))
      toast[result.delivered ? 'success' : 'warning'](
        result.delivered
          ? `Welcome link sent to ${row.candidateName}.`
          : link
            ? "Link created. WhatsApp isn't connected — copy the link below and send it to the hire."
            : 'Link created, but the WhatsApp message did not send. Check the phone number on the employee record.',
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send the welcome link.')
    } finally {
      setSendingId(null)
    }
  }

  async function copyLink(url: string, input: HTMLInputElement | null) {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied.')
    } catch {
      // Clipboard API blocked (insecure origin, permissions) — leave it selected.
      input?.select()
      toast.warning('Could not copy automatically. The link is selected — press Ctrl+C.')
    }
  }

  if (rows === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (denied) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon={<Lock className="h-8 w-8" aria-hidden="true" />}
          title="Access restricted"
          description="Onboarding checklists are limited to HR and above."
        />
      </div>
    )
  }

  const open = rows.filter((row) => row.status !== 'completed')
  const canInvite = can(PERMISSIONS.EMPLOYEES_INVITE)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Onboarding</h1>
        <p className="text-sm text-muted-foreground">
          {open.length} in progress · {rows.length - open.length} complete
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Nobody onboarding"
          description="A checklist is created automatically when a candidate is marked Hired."
        />
      ) : (
        rows.map((row) => {
          const outstanding = outstandingMandatory(row)
          const sent = Boolean(row.welcomeInviteSentAt)
          const showInvite = canInvite && row.status !== 'completed'
          const link = canInvite ? links[row.id] : undefined
          const inputId = `welcome-link-${row.id}`
          return (
            <Card key={row.id} className="cursor-pointer" onClick={() => navigate(`/recruitment/onboarding/${row.id}`)}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{row.candidateName}</p>
                  <p className="text-sm text-muted-foreground">
                    {row.joinDate ? `Joins ${row.joinDate}` : 'No join date'} ·{' '}
                    {row.employeeId ? 'Employee record created' : 'No employee record yet'}
                    {sent ? ' · Welcome link sent' : ''}
                  </p>
                  {showInvite && !row.employeeId ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Open this checklist and create the employee record before sending the welcome link.
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {row.status === 'completed' ? (
                    <StatusPill tone="closed" icon={CheckCheck} label="Complete" />
                  ) : (
                    <StatusPill
                      tone={outstanding === 0 ? 'success' : 'warning'}
                      icon={Clock}
                      label={outstanding === 0 ? 'Ready to close' : `${outstanding} required outstanding`}
                    />
                  )}
                  {showInvite ? (
                    <Button
                      variant="secondary"
                      disabled={!row.employeeId || sendingId === row.id}
                      onClick={(event) => {
                        event.stopPropagation()
                        void sendLink(row)
                      }}
                    >
                      <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                      {sendingId === row.id ? 'Sending…' : sent ? 'Resend welcome link' : 'Send welcome link'}
                    </Button>
                  ) : null}
                  <Button variant="secondary" onClick={() => navigate(`/recruitment/onboarding/${row.id}`)}>
                    Open
                  </Button>
                </div>
                {link ? (
                  // The whole card navigates on click; nothing in here should.
                  <div className="flex w-full flex-col gap-2" onClick={(event) => event.stopPropagation()}>
                    <label htmlFor={inputId} className="text-xs font-medium text-muted-foreground">
                      Welcome link
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        id={inputId}
                        readOnly
                        value={link.url}
                        className="min-w-0 flex-1 font-mono text-xs"
                        onFocus={(event) => event.currentTarget.select()}
                      />
                      <Button
                        variant="secondary"
                        onClick={() => void copyLink(link.url, document.getElementById(inputId) as HTMLInputElement | null)}
                      >
                        <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                        Copy link
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Valid until {formatDate(link.expiresAt)} · personal to {row.candidateName} — share it only with
                      them. It is shown once; Resend issues a new one.
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}
