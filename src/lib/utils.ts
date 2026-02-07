import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: Array<string | null | undefined | false>) {
  return twMerge(clsx(inputs))
}
