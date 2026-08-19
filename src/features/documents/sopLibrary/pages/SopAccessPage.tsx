import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, Checkbox, Label, Spinner } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { ROLES, ROLE_LABELS } from '@/constants'
import { useRole, useToast } from '@/hooks'
import * as sopService from '../sopService'
import type { Role } from '@/constants/roles'

const LIST_ROUTE = '/documents/sop-library'

/**
 * Which roles may read the SOP Library.
 *
 * This writes systemSettings/sopAccess, which is exactly what the
 * firestore.rules `get()` reads — unticking a role revokes the read itself, not
 * just the nav item.
 *
 * superAdmin/director/generalManager are shown ticked and locked: the rule's
 * isElevated() arm lets them through regardless, so offering a toggle that
 * changes nothing would be a lie.
 */
const ALWAYS_ALLOWED: Role[] = [ROLES.SUPER_ADMIN, ROLES.DIRECTOR, ROLES.GENERAL_MANAGER]

const SELECTABLE_ROLES = (Object.values(ROLES) as Role[]).filter((role) => !ALWAYS_ALLOWED.includes(role))

export function SopAccessPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { isRole } = useRole()
  const isSuperAdmin = isRole(ROLES.SUPER_ADMIN)

  const [selected, setSelected] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false

    sopService
      .getSopAccess()
      .then((access) => {
        if (cancelled) return
        setSelected(access?.roleIds ?? [])
        setLoading(false)
      })
      .catch(() => {
        // No doc yet is the normal first-run state, and getDocument resolves
        // null for that — a rejection here means the read itself failed.
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  function toggle(role: Role) {
    setSelected((current) =>
      current.includes(role) ? current.filter((entry) => entry !== role) : [...current, role],
    )
  }

  async function handleSave() {
    setSaving(true)
    try {
      await sopService.setSopAccess(selected)
      toast.success('Module access updated.')
      navigate(LIST_ROUTE)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save access settings.')
      setSaving(false)
    }
  }

  if (!isSuperAdmin) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          icon={<Lock className="h-8 w-8" aria-hidden="true" />}
          title="Super admin only"
          description="Only a super admin can change who has access to the SOP library."
          action={
            <Button variant="secondary" onClick={() => navigate(LIST_ROUTE)}>
              Back to SOP Library
            </Button>
          }
        />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle>SOP Library — Module Access</CardTitle>
        <p className="text-sm text-muted-foreground">
          Tick the roles that may open this module. Anyone not ticked sees an access-restricted message.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          {ALWAYS_ALLOWED.map((role) => (
            <div key={role} className="flex items-center gap-3 rounded-md bg-sunken px-3 py-2 opacity-70">
              <Checkbox id={`sop-role-${role}`} checked disabled readOnly />
              <Label htmlFor={`sop-role-${role}`}>{ROLE_LABELS[role]}</Label>
              <span className="ml-auto text-xs text-muted-foreground">Always allowed</span>
            </div>
          ))}

          {SELECTABLE_ROLES.map((role) => (
            <div key={role} className="flex items-center gap-3 px-3 py-2">
              <Checkbox
                id={`sop-role-${role}`}
                checked={selected.includes(role)}
                onChange={() => toggle(role)}
              />
              <Label htmlFor={`sop-role-${role}`}>{ROLE_LABELS[role]}</Label>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => navigate(LIST_ROUTE)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving}>
            Save access
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
