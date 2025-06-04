
// Create a global error boundary for timestamp issues
// src/app/shared/utils/error-handlers.ts
export function withTimestampErrorHandling<T>(
  operation: () => T,
  fallback: T,
  context: string = 'Unknown'
): T {
  try {
    return operation();
  } catch (error) {
    if (error instanceof Error && error.message.includes('toDate')) {
      console.warn(`[${context}] Timestamp conversion error:`, error);
      return fallback;
    }
    throw error; // Re-throw if it's not a timestamp error
  }
}
