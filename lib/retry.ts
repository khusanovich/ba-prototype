/**
 * Retry utilities for handling rate limits and transient errors
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
  } = options;

  let lastError: Error | undefined;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if this is a rate limit error (429) or a server error (5xx)
      const isRetryable =
        lastError.message.includes("429") ||
        lastError.message.includes("rate limit") ||
        lastError.message.includes("quota") ||
        lastError.message.includes("500") ||
        lastError.message.includes("503");

      if (!isRetryable || attempt === maxRetries) {
        throw lastError;
      }

      console.log(
        `Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`,
        lastError.message
      );

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Exponential backoff
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError;
}
