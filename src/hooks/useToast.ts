import { useCallback } from 'react'
import { useToastStore } from '@/store'

export function useToast() {
  const addToast = useToastStore((s) => s.addToast)

  return {
    success: useCallback((message: string) => addToast('success', message), [addToast]),
    error: useCallback((message: string) => addToast('error', message), [addToast]),
    warning: useCallback((message: string) => addToast('warning', message), [addToast]),
    info: useCallback((message: string) => addToast('info', message), [addToast]),
  }
}
