/**
 * Consistent error classes for the application.
 */

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }

  static badRequest(message: string, code?: string) {
    return new ApiError(400, message, code || "BAD_REQUEST");
  }

  static unauthorized(message = "Unauthorized") {
    return new ApiError(401, message, "UNAUTHORIZED");
  }

  static forbidden(message = "Forbidden") {
    return new ApiError(403, message, "FORBIDDEN");
  }

  static notFound(message = "Resource not found") {
    return new ApiError(404, message, "NOT_FOUND");
  }

  static conflict(message: string) {
    return new ApiError(409, message, "CONFLICT");
  }

  static tooManyRequests(message = "Too many requests") {
    return new ApiError(429, message, "RATE_LIMITED");
  }

  static internal(message = "Internal server error") {
    return new ApiError(500, message, "INTERNAL_ERROR");
  }
}

export class AuthError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "AuthError";
  }

  static invalidCredentials() {
    return new AuthError("Invalid credentials", "INVALID_CREDENTIALS");
  }

  static accountLocked(unlockAt?: Date) {
    const err = new AuthError("Account is locked", "ACCOUNT_LOCKED");
    (err as unknown as Record<string, unknown>).unlockAt = unlockAt;
    return err;
  }

  static sessionExpired() {
    return new AuthError("Session expired", "SESSION_EXPIRED");
  }

  static insufficientRole() {
    return new AuthError("Insufficient permissions", "INSUFFICIENT_ROLE");
  }
}

export class ContentError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "ContentError";
  }

  static aiContentRequiresReview() {
    return new ContentError(
      "AI-generated content must go through human review before publishing",
      "AI_CONTENT_REQUIRES_REVIEW"
    );
  }

  static insufficientApprovals(required: number, current: number) {
    return new ContentError(
      `Requires ${required} approvals, currently has ${current}`,
      "INSUFFICIENT_APPROVALS"
    );
  }

  static lessonLocked() {
    return new ContentError(
      "Complete the previous lesson first",
      "LESSON_LOCKED"
    );
  }
}

/**
 * Circuit breaker for external API calls.
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";

  constructor(
    private threshold = 5,
    private resetTimeout = 60000 // 1 minute
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = "HALF_OPEN";
      } else {
        throw new ApiError(503, "Service temporarily unavailable", "CIRCUIT_OPEN");
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = "CLOSED";
  }

  private onFailure() {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= this.threshold) {
      this.state = "OPEN";
    }
  }
}
