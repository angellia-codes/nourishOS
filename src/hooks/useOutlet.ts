import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store'
import { getDocument } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import { canAccessOutlet as canAccessOutletUtil } from '@/utils'
import type { Outlet } from '@/types'

export function useOutlet() {
  const profile = useAuthStore((s) => s.profile)
  const [outlet, setOutlet] = useState<Outlet | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.outletId) {
      setOutlet(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    getDocument<Outlet>(COLLECTIONS.OUTLETS, profile.outletId).then((result) => {
      if (!cancelled) {
        setOutlet(result)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [profile?.outletId])

  return {
    outletId: profile?.outletId ?? null,
    outlet,
    loading,
    canAccessOutlet: (targetOutletId: string) => (profile ? canAccessOutletUtil(profile, targetOutletId) : false),
  }
}
