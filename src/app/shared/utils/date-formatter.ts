/**
 * Date formatting utilities
 */

/**
 * Format date string to localized short format
 * @param dateString - ISO date string
 * @param locale - Locale string (defaults to 'en-GB')
 * @returns Formatted date string or original string if parsing fails
 */
export function formatShortDate(dateString: string, locale: string = 'en-GB'): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: '2-digit'
    });
  } catch {
    return dateString;
  }
}

/**
 * Format date string to relative time (e.g., "2 days ago")
 * @param dateString - ISO date string
 * @returns Relative time string
 */
export function formatRelativeDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    
    return formatShortDate(dateString);
  } catch {
    return dateString;
  }
}