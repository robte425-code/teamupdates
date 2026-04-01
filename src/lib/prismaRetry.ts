const TRANSIENT_ERROR_CODES = new Set(["P1001", "P1002", "P1008", "P1017"]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isTransientPrismaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybeCode = (error as { code?: unknown }).code;
  if (typeof maybeCode === "string" && TRANSIENT_ERROR_CODES.has(maybeCode)) return true;
  const message = (error as { message?: unknown }).message;
  if (typeof message !== "string") return false;
  return (
    message.includes("Can't reach database server") ||
    message.includes("connection") ||
    message.includes("timed out")
  );
}

export async function withPrismaRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isTransientPrismaError(error) || attempt === maxAttempts) {
        throw error;
      }
      const delay = 250 * 2 ** (attempt - 1);
      await sleep(delay);
    }
  }
  throw lastError;
}
