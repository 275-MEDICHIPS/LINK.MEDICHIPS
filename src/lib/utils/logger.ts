/**
 * Structured JSON logger with GCP severity mapping.
 * PII auto-masking for email, phone, PIN.
 */

type LogLevel = "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL";

const GCP_SEVERITY: Record<LogLevel, string> = {
  DEBUG: "DEBUG",
  INFO: "INFO",
  WARNING: "WARNING",
  ERROR: "ERROR",
  CRITICAL: "CRITICAL",
};

// PII patterns to mask
const PII_PATTERNS = [
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b/gi, replacement: "[EMAIL]" },
  { pattern: /\b\d{3}[-.]?\d{3,4}[-.]?\d{4}\b/g, replacement: "[PHONE]" },
  { pattern: /\bpin[:\s=]+\w+/gi, replacement: "pin=[REDACTED]" },
  { pattern: /\bpassword[:\s=]+\w+/gi, replacement: "password=[REDACTED]" },
  { pattern: /\btoken[:\s=]+[\w.-]+/gi, replacement: "token=[REDACTED]" },
];

function maskPII(message: string): string {
  let masked = message;
  for (const { pattern, replacement } of PII_PATTERNS) {
    masked = masked.replace(pattern, replacement);
  }
  return masked;
}

interface LogEntry {
  severity: string;
  message: string;
  timestamp: string;
  correlationId?: string;
  service?: string;
  [key: string]: unknown;
}

function createLogEntry(
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>
): LogEntry {
  const entry: LogEntry = {
    severity: GCP_SEVERITY[level],
    message: maskPII(message),
    timestamp: new Date().toISOString(),
    service: "medichips-link",
  };

  if (meta) {
    for (const [key, value] of Object.entries(meta)) {
      if (typeof value === "string") {
        entry[key] = maskPII(value);
      } else {
        entry[key] = value;
      }
    }
  }

  return entry;
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>) {
    if (process.env.NODE_ENV === "production") return;
    console.debug(JSON.stringify(createLogEntry("DEBUG", message, meta)));
  },

  info(message: string, meta?: Record<string, unknown>) {
    console.log(JSON.stringify(createLogEntry("INFO", message, meta)));
  },

  warn(message: string, meta?: Record<string, unknown>) {
    console.warn(JSON.stringify(createLogEntry("WARNING", message, meta)));
  },

  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>) {
    const entry = createLogEntry("ERROR", message, meta);
    if (error instanceof Error) {
      entry.errorName = error.name;
      entry.errorMessage = maskPII(error.message);
      entry.stack = error.stack;
    }
    console.error(JSON.stringify(entry));
  },

  critical(message: string, error?: Error | unknown, meta?: Record<string, unknown>) {
    const entry = createLogEntry("CRITICAL", message, meta);
    if (error instanceof Error) {
      entry.errorName = error.name;
      entry.errorMessage = maskPII(error.message);
      entry.stack = error.stack;
    }
    console.error(JSON.stringify(entry));
  },
};
