export const CHAT_EXPIRATION_HOURS = Number(process.env.CHAT_EXPIRATION_HOURS) || 72;

/**
 * Compute expiration date for a new chat (default 72 hours from creation).
 */
export function calculateExpirationDate(fromDate = new Date(), hours = CHAT_EXPIRATION_HOURS): Date {
  const expiresAt = new Date(fromDate.getTime());
  expiresAt.setTime(expiresAt.getTime() + hours * 60 * 60 * 1000);
  return expiresAt;
}

/**
 * Server-authoritative check whether a chat is expired.
 * Never relies on client-reported time.
 */
export function isExpired(expiresAt: Date | string | number): boolean {
  const expiryTime = new Date(expiresAt).getTime();
  return Date.now() >= expiryTime;
}

/**
 * Compute milliseconds remaining until expiration.
 */
export function getRemainingMs(expiresAt: Date | string | number): number {
  const expiryTime = new Date(expiresAt).getTime();
  return Math.max(0, expiryTime - Date.now());
}

/**
 * Format remaining time for UI countdown (e.g., "2d 23h 59m", "01h 22m", "15m").
 */
export function formatRemainingTime(expiresAt: Date | string | number): {
  formatted: string;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  isNearExpiry: boolean; // < 1 hour
  isUrgent: boolean; // < 15 minutes
} {
  const remainingMs = getRemainingMs(expiresAt);
  if (remainingMs <= 0) {
    return {
      formatted: "Expired",
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
      isNearExpiry: true,
      isUrgent: true,
    };
  }

  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let formatted = "";
  if (days > 0) {
    formatted = `${days}d ${hours.toString().padStart(2, "0")}h ${minutes.toString().padStart(2, "0")}m`;
  } else if (hours > 0) {
    formatted = `${hours.toString().padStart(2, "0")}h ${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`;
  } else {
    formatted = `${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`;
  }

  return {
    formatted,
    days,
    hours,
    minutes,
    seconds,
    isExpired: false,
    isNearExpiry: remainingMs < 60 * 60 * 1000,
    isUrgent: remainingMs < 15 * 60 * 1000,
  };
}
