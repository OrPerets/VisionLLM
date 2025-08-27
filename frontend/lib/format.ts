import { APIError } from "./types";

export function formatApiError(error: unknown): string {
  if (error instanceof APIError) {
    switch (error.status) {
      case 400:
        return "Invalid request. Please check your input.";
      case 401:
        return "Authentication required.";
      case 403:
        return "Access denied.";
      case 404:
        return "Resource not found.";
      case 409:
        return "Resource already exists or conflict detected.";
      case 422:
        return "Validation error. Please check your input.";
      case 429:
        return "Too many requests. Please try again later.";
      case 500:
        return "Server error. Please try again.";
      case 502:
      case 503:
      case 504:
        return "Service temporarily unavailable. Please try again.";
      default:
        return `Request failed (${error.status}): ${error.message}`;
    }
  }
  
  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return "Request was cancelled.";
    }
    if (error.name === "TypeError" && error.message.includes("fetch")) {
      return "Network error. Please check your connection.";
    }
    return error.message;
  }
  
  return "An unexpected error occurred.";
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function formatPercentage(value: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

export function formatNumber(num: number): string {
  if (num < 1000) return num.toString();
  if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
  if (num < 1000000000) return `${(num / 1000000).toFixed(1)}M`;
  return `${(num / 1000000000).toFixed(1)}B`;
}

export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}
