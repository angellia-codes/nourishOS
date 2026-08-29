import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from '@/components/ui'
import { useAuth } from '@/hooks'
import { callFunction } from '@/services/api'
import { auth } from '@/services/firebase'
import {
  ROUTES,
  OUTLETS,
  DEPARTMENTS,
  OUTLET_DEPARTMENTS,
  rolesFor,
  ROLE_LABELS,
  optionsFor,
} from '@/constants'

/**
 * First-run registration for a signed-in account with no users/{uid} profile.
 *
 * Deviates from AUTHENTICATION.md §5, which specifies HR-provisioned accounts
 * and no self-registration — that provisioning flow has no UI yet, so this is
 * the only way anyone but the bootstrap superAdmin gets in. The registerUser
 * callable re-validates every field against the same org chart; this page
 * only decides what is offered.
 *
 * Outlet → Department → Role narrow in that order (OUTLETS_DEPARTMENTS.md §1/§2,
 * RBAC.md §4), and the chosen role is what resolves to a permission set.
 */
export function RegisterPage() {
  const { user, profile, status, loading } = useAuth()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState(user?.displayName ?? '')
  const [outletId, setOutletId] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [roleId, setRoleId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const departmentOptions = useMemo(
    () => optionsFor(OUTLET_DEPARTMENTS[outletId] ?? [], DEPARTMENTS),
    [outletId],
  )
  const roleOptions = useMemo(() => rolesFor(outletId, departmentId), [outletId, departmentId])

  if (status === 'unauthenticated') {
    return <Navigate to={ROUTES.LOGIN} replace />
  }
  // Already provisioned — nothing to register. Covers a bookmarked /register
  // and the moment the profile subscription delivers the doc just written.
  if (!loading && profile) {
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  const canSubmit = fullName.trim() !== '' && outletId !== '' && departmentId !== '' && roleId !== ''

  async function handleRegister() {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      await callFunction('registerUser', { fullName: fullName.trim(), outletId, departmentId, roleId })

      // syncUserClaims writes role/departmentId/outletId onto the ID token,
      // and firestore.rules reads them from there — force a refresh so the
      // first dashboard read isn't denied by a token minted before the
      // profile existed.
      // ponytail: single refresh, no retry. The claims trigger runs async, so
      // a slow cold start can still lose the race — the fix then is a page
      // reload. Add a short poll on getIdTokenResult().claims.role if that
      // shows up in practice.
      await auth.currentUser?.getIdToken(true)

      navigate(ROUTES.DASHBOARD, { replace: true })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Registration failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Complete your registration</CardTitle>
        <p className="text-sm text-muted-foreground">
          Signed in as {user?.email}. Tell us where you work — your role decides what you can access.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="registerName">Full Name *</Label>
          <Input
            id="registerName"
            value={fullName}
            maxLength={120}
            placeholder="As it appears on your KTP"
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="registerOutlet">Outlet *</Label>
          <Select
            id="registerOutlet"
            value={outletId}
            onChange={(e) => {
              setOutletId(e.target.value)
              setDepartmentId('')
              setRoleId('')
            }}
          >
            <option value="">Select an outlet…</option>
            {OUTLETS.map((outlet) => (
              <option key={outlet.id} value={outlet.id}>
                {outlet.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="registerDepartment">Department *</Label>
          <Select
            id="registerDepartment"
            value={departmentId}
            disabled={outletId === ''}
            onChange={(e) => {
              setDepartmentId(e.target.value)
              setRoleId('')
            }}
          >
            <option value="">{outletId === '' ? 'Select an outlet first' : 'Select a department…'}</option>
            {departmentOptions.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="registerRole">Role *</Label>
          <Select
            id="registerRole"
            value={roleId}
            disabled={departmentId === ''}
            onChange={(e) => setRoleId(e.target.value)}
          >
            <option value="">{departmentId === '' ? 'Select a department first' : 'Select a role…'}</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </Select>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button onClick={handleRegister} disabled={!canSubmit} loading={submitting} className="w-full">
          Register
        </Button>
      </CardContent>
    </Card>
  )
}
