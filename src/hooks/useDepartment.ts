import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store'
import { getDocument } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import { canAccessDepartment as canAccessDepartmentUtil } from '@/utils'
import type { Department } from '@/types'

export function useDepartment() {
  const profile = useAuthStore((s) => s.profile)
  const [department, setDepartment] = useState<Department | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.departmentId) {
      setDepartment(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    getDocument<Department>(COLLECTIONS.DEPARTMENTS, profile.departmentId).then((result) => {
      if (!cancelled) {
        setDepartment(result)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [profile?.departmentId])

  return {
    departmentId: profile?.departmentId ?? null,
    department,
    loading,
    canAccessDepartment: (targetDepartmentId: string) =>
      profile ? canAccessDepartmentUtil(profile, targetDepartmentId) : false,
  }
}
