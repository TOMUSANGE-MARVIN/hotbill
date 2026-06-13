import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'UGX') {
  return `${currency} ${new Intl.NumberFormat('en-UG').format(amount)}`
}

export function formatDate(date: string | Date) {
  return format(new Date(date), 'dd MMM yyyy')
}

export function formatDateTime(date: string | Date) {
  return format(new Date(date), 'dd MMM yyyy HH:mm')
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function statusColor(status: string) {
  const map: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    suspended: 'bg-yellow-100 text-yellow-800',
    expired: 'bg-red-100 text-red-800',
    inactive: 'bg-gray-100 text-gray-800',
    online: 'bg-green-100 text-green-800',
    offline: 'bg-red-100 text-red-800',
    unknown: 'bg-gray-100 text-gray-800',
    completed: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    failed: 'bg-red-100 text-red-800',
  }
  return map[status] ?? 'bg-gray-100 text-gray-800'
}
