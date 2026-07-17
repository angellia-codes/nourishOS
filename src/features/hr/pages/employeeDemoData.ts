import { Timestamp } from 'firebase/firestore'
import { EMPLOYMENT_STATUS } from '@/constants/hr'
import type { Employee } from '@/types'

const now = Timestamp.now()

function mockEmployee(overrides: Partial<Employee> & Pick<Employee, 'id' | 'fullName' | 'employeeNumber'>): Employee {
  return {
    createdAt: now,
    createdBy: 'demo',
    updatedAt: now,
    updatedBy: 'demo',
    isArchived: false,
    status: 'active',
    gender: 'female',
    birthDate: '1995-01-01',
    phone: '+62 812-0000-0000',
    email: 'demo@nourishgroup.id',
    position: 'Waiter',
    departmentId: 'fnb',
    outletId: 'outlet-sanur',
    employmentStatus: EMPLOYMENT_STATUS.PERMANENT,
    joinDate: '2023-01-01',
    probationMonths: 3,
    probationEndDate: null,
    contractType: 'permanent',
    ...overrides,
  }
}

export const MOCK_EMPLOYEES: Employee[] = [
  mockEmployee({
    id: 'demo-1',
    employeeNumber: 'N-0001',
    fullName: 'Ni Made Ayu Ratih',
    position: 'Waiter',
    outletId: 'outlet-sanur',
  }),
  mockEmployee({
    id: 'demo-2',
    employeeNumber: 'N-0002',
    fullName: 'I Wayan Surya Aditya',
    position: 'Barista',
    outletId: 'outlet-canggu',
    employmentStatus: EMPLOYMENT_STATUS.PERMANENT,
    probationEndDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  }),
  mockEmployee({
    id: 'demo-3',
    employeeNumber: 'N-0003',
    fullName: 'Kadek Bagus Prananda',
    position: 'Cook',
    outletId: 'outlet-sanur',
    contractType: 'fixedTerm',
    contractEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  }),
  mockEmployee({
    id: 'demo-4',
    employeeNumber: 'DW-0004',
    fullName: 'Putu Indah Lestari',
    position: 'Cashier',
    outletId: 'outlet-ubud',
    employmentStatus: 'dailyWorker',
  }),
  mockEmployee({
    id: 'demo-5',
    employeeNumber: 'N-0005',
    fullName: 'Gede Arya Wibawa',
    position: 'Outlet Leader',
    outletId: 'outlet-canggu',
    departmentId: 'management',
    status: 'inactive',
  }),
]

export interface MockDocument {
  id: string
  fileName: string
  fileType: 'pdf' | 'jpg' | 'png'
  uploadedAt: string
}

/** Static per-employee document lists — stands in for the `files` collection (module=hr, resourceType=employee) in the demo. */
export const MOCK_DOCUMENTS: Record<string, MockDocument[]> = {
  'demo-1': [
    { id: 'doc-1', fileName: 'KTP - Ni Made Ayu Ratih.pdf', fileType: 'pdf', uploadedAt: '2023-01-02' },
    { id: 'doc-2', fileName: 'Employment Contract.pdf', fileType: 'pdf', uploadedAt: '2023-01-02' },
  ],
  'demo-2': [
    { id: 'doc-3', fileName: 'NPWP.jpg', fileType: 'jpg', uploadedAt: '2023-03-15' },
  ],
  'demo-3': [],
  'demo-4': [
    { id: 'doc-4', fileName: 'BPJS Kesehatan.pdf', fileType: 'pdf', uploadedAt: '2023-06-01' },
  ],
  'demo-5': [
    { id: 'doc-5', fileName: 'KTP - Gede Arya Wibawa.pdf', fileType: 'pdf', uploadedAt: '2021-02-10' },
    { id: 'doc-6', fileName: 'Employment Contract.pdf', fileType: 'pdf', uploadedAt: '2021-02-10' },
    { id: 'doc-7', fileName: 'Resignation Letter.pdf', fileType: 'pdf', uploadedAt: '2026-05-20' },
  ],
}
