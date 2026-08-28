import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, SlidersHorizontal } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, Checkbox, Label, Select, Spinner } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { ROLES, ROLE_LABELS, PERMISSIONS } from '@/constants'
import { useRole, useToast } from '@/hooks'
import * as settingsService from '../settingsService'
import type { Role } from '@/constants/roles'

const ACRONYMS: Record<string, string> = { hr: 'HR', sops: 'SOPs' }

/** camelCase/PascalCase -> "Title Cased Words", with a couple of acronyms kept upper-case. */
function humanize(id: string): string {
  return id
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .map((word) => ACRONYMS[word.toLowerCase()] ?? word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

interface PermissionGroup {
  moduleId: string
  moduleLabel: string
  entries: { key: string; value: string; label: string }[]
}

/** Grouped from PERMISSIONS itself (module.action strings) rather than a hand-maintained map, so it never drifts as permissions are added. */
const PERMISSION_GROUPS: PermissionGroup[] = (() => {
  const groups = new Map<string, PermissionGroup>()
  for (const [key, value] of Object.entries(PERMISSIONS)) {
    const [moduleId, ...actionParts] = value.split('.')
    let group = groups.get(moduleId)
    if (!group) {
      group = { moduleId, moduleLabel: humanize(moduleId), entries: [] }
      groups.set(moduleId, group)
    }
    group.entries.push({ key, value, label: humanize(actionParts.join('.')) })
  }
  return Array.from(groups.values()).sort((a, b) => a.moduleLabel.localeCompare(b.moduleLabel))
})()

function sameSet(a: Set<string>, b: string[]): boolean {
  return a.size === b.length && b.every((v) => a.has(v))
}

/**
 * Settings: Roles & Permissions — RBAC.md §4/§5/§16, closing the recurring
 * "existing role docs need the new permission string added by hand" gap.
 * Gated by role identity (not a permission string) for the same reason the
 * backend callable uses requireSuperAdmin: a permission string that gates
 * editing permissions would live inside the system it edits.
 */
export function RolePermissionsPage() {
  const navigate = useNavigate()
  const { isRole } = useRole()
  const isSuperAdmin = isRole(ROLES.SUPER_ADMIN)
  const toast = useToast()

  const [roleId, setRoleId] = useState<Role>(ROLES.SUPER_ADMIN)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [original, setOriginal] = useState<string[]>([])
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [exists, setExists] = useState(true)

  useEffect(() => {
    if (!isSuperAdmin) return
    let cancelled = false
    setLoading(true)
    settingsService.getRole(roleId).then((role) => {
      if (cancelled) return
      const permissions = role?.permissions ?? []
      setOriginal(permissions)
      setChecked(new Set(permissions))
      setExists(role !== null)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [roleId, isSuperAdmin])

  const dirty = useMemo(() => !sameSet(checked, original), [checked, original])
  const isEditingSuperAdmin = roleId === ROLES.SUPER_ADMIN

  function toggle(permission: string) {
    setChecked((current) => {
      const next = new Set(current)
      if (next.has(permission)) next.delete(permission)
      else next.add(permission)
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    try {
      const permissions = Array.from(checked)
      await settingsService.updateRolePermissions(roleId, permissions)
      setOriginal(permissions)
      setExists(true)
      toast.success('Role permissions updated.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save permissions.')
    } finally {
      setSaving(false)
    }
  }

  // Communication Settings is self-service (every signed-in user manages their
  // own notification preferences and muted channels), unlike everything else on
  // this page — so it renders above the super-admin gate rather than behind it.
  const communicationSettingsCard = (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <SlidersHorizontal className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-medium text-foreground">Communication Settings</p>
            <p className="text-sm text-muted-foreground">Notification preferences and muted channels.</p>
          </div>
        </div>
        <Button variant="secondary" onClick={() => navigate('/settings/communications')}>
          Open
        </Button>
      </CardContent>
    </Card>
  )

  if (!isSuperAdmin) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        {communicationSettingsCard}
        <EmptyState
          icon={<Lock className="h-8 w-8" aria-hidden="true" />}
          title="Super admin only"
          description="Only a super admin can view or change role permissions."
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      {communicationSettingsCard}

      <div>
        <h1 className="text-xl font-semibold text-foreground">Roles & Permissions</h1>
        <p className="text-sm text-muted-foreground">Pick a role, then toggle which permissions it grants.</p>
      </div>

      <Select value={roleId} onChange={(e) => setRoleId(e.target.value as Role)} aria-label="Select role">
        {(Object.values(ROLES) as Role[]).map((role) => (
          <option key={role} value={role}>
            {ROLE_LABELS[role]}
          </option>
        ))}
      </Select>

      {loading ? (
        <div className="flex justify-center p-12">
          <Spinner />
        </div>
      ) : (
        <>
          {!exists && (
            <p className="text-sm text-muted-foreground">
              This role hasn't been claimed yet — saving will create its permission set.
            </p>
          )}

          {isEditingSuperAdmin && (
            <p className="text-sm text-muted-foreground">
              superAdmin bypasses every permission check at runtime — this list is for visibility and audit only.
              Editing it has no effect on what a super admin can do.
            </p>
          )}

          <div className="flex flex-col gap-4">
            {PERMISSION_GROUPS.map((group) => (
              <Card key={group.moduleId}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{group.moduleLabel}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 pt-0">
                  {group.entries.map((entry) => (
                    <div key={entry.value} className="flex items-center gap-3">
                      <Checkbox
                        id={`perm-${entry.value}`}
                        checked={checked.has(entry.value)}
                        disabled={isEditingSuperAdmin}
                        onChange={() => toggle(entry.value)}
                      />
                      <Label htmlFor={`perm-${entry.value}`}>{entry.label}</Label>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} loading={saving} disabled={!dirty || isEditingSuperAdmin}>
              Save permissions
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
