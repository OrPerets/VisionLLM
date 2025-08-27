import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const target = new Date(date)
  const diffMs = now.getTime() - target.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) {
    return "just now"
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`
  } else if (diffHours < 24) {
    return `${diffHours}h ago`
  } else if (diffDays < 7) {
    return `${diffDays}d ago`
  } else {
    return target.toLocaleDateString()
  }
}

export function formatTimestamp(date: string | Date): string {
  const target = new Date(date)
  return target.toLocaleString()
}

export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

export function formatTokensPerSecond(tps?: number): string {
  if (!tps) return ""
  return `${tps.toFixed(1)} tokens/sec`
}

export function formatElapsedTime(seconds?: number): string {
  if (!seconds) return ""
  if (seconds < 1) {
    return `${Math.round(seconds * 1000)}ms`
  }
  return `${seconds.toFixed(1)}s`
}

export function formatTokenCount(count?: number): string {
  if (!count) return ""
  if (count < 1000) {
    return count.toString()
  }
  return `${(count / 1000).toFixed(1)}K`
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T {
  let timeout: NodeJS.Timeout
  return ((...args: any[]) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }) as T
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length - 3) + "..."
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text)
  } else {
    // Fallback for older browsers
    const textArea = document.createElement("textarea")
    textArea.value = text
    textArea.style.position = "absolute"
    textArea.style.left = "-999999px"
    document.body.prepend(textArea)
    textArea.select()
    try {
      document.execCommand("copy")
    } catch (error) {
      console.error("Fallback copy failed:", error)
    } finally {
      textArea.remove()
    }
    return Promise.resolve()
  }
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

export function isValidUrl(string: string): boolean {
  try {
    new URL(string)
    return true
  } catch (_) {
    return false
  }
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function scrollToBottom(element: HTMLElement, smooth = true): void {
  element.scrollTo({
    top: element.scrollHeight,
    behavior: smooth ? "smooth" : "auto",
  })
}

export function isScrolledToBottom(element: HTMLElement, threshold = 100): boolean {
  return (
    element.scrollHeight - element.scrollTop - element.clientHeight < threshold
  )
}
