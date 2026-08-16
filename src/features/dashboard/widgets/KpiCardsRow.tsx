import { useEffect, useState } from 'react'
import { collection, query, where, getCountFromServer } from 'firebase/firestore'
import { Users, Stamp, ListChecks, Megaphone } from 'lucide-react'
import { db } from '@/services/firebase'
import { MetricTile } from '@/components/shared'
import { useAuth } from '@/hooks'
import { COLLECTIONS, DEPARTMENT_ROLES } from '@/constants'
import { approvalService, taskService } from '@/services/shared'
import * as announcementService from '@/features/communications/announcements/announcementService'
import { isTerminal } from '@/features/communications/tasks/taskFormat'

/**
 * dashboard.md §7 — FEATURE_SPECIFICATIONS.md Module 2 KPI Cards. Three of
 * four tiles reuse the same subscriptions the widgets below already hold
 * (zero new Firestore reads); Active Employees is the one new read, a single
 * count aggregation query (no documents fetched, no listener — headcount
 * doesn't need to be live-second-accurate on a dashboard). For a department
 * manager (roleId is that department's leader role per DEPARTMENT_ROLES[0],
 * same convention as contractAlerts.ts), the count is scoped to their own
 * department instead of the whole company.
 */
export function KpiCardsRow() {
  const { user, profile } = useAuth()
  const uid = user?.uid ?? null
  const roleId = profile?.roleId ?? null
  const departmentId = profile?.departmentId ?? null
  const isDepartmentManager = Boolean(departmentId && DEPARTMENT_ROLES[departmentId]?.[0] === roleId)

  const [activeEmployees, setActiveEmployees] = useState<number | null>(null)
  const [pendingApprovals, setPendingApprovals] = useState<number | null>(null)
  const [openTasks, setOpenTasks] = useState<number | null>(null)
  const [announcementCount, setAnnouncementCount] = useState<number | null>(null)

  useEffect(() => {
    const constraints = [where('status', '==', 'active')]
    if (isDepartmentManager && departmentId) constraints.push(where('departmentId', '==', departmentId))
    getCountFromServer(query(collection(db, COLLECTIONS.EMPLOYEES), ...constraints))
      .then((snap) => setActiveEmployees(snap.data().count))
      .catch(() => setActiveEmployees(null))
  }, [isDepartmentManager, departmentId])

  useEffect(() => {
    if (!roleId) return
    return approvalService.subscribeToApprovalQueue(
      roleId,
      (rows) => setPendingApprovals(rows.length),
      () => setPendingApprovals(0),
    )
  }, [roleId])

  useEffect(() => {
    if (!uid) return
    return taskService.subscribeToMyTasks(
      uid,
      (tasks) => setOpenTasks(tasks.filter((task) => !isTerminal(task.taskStatus)).length),
      () => setOpenTasks(0),
    )
  }, [uid])

  useEffect(() => {
    if (!uid) return
    return announcementService.subscribeToMyFeed(
      uid,
      (rows) => setAnnouncementCount(rows.length),
      () => setAnnouncementCount(0),
    )
  }, [uid])

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <MetricTile
        label={isDepartmentManager ? 'Active Employees (Dept)' : 'Active Employees'}
        value={activeEmployees}
        icon={Users}
      />
      <MetricTile label="Pending Approvals" value={pendingApprovals} icon={Stamp} />
      <MetricTile label="Open Tasks" value={openTasks} icon={ListChecks} />
      <MetricTile label="Announcements" value={announcementCount} icon={Megaphone} />
    </div>
  )
}
