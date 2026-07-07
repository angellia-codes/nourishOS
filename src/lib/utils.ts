import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge conditional class names and resolve Tailwind conflicts.
 * Required by every shadcn/ui primitive — keep this file dependency-free
 * of anything business-related.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
