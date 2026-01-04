/**
 * Client-side logger for browser environments
 *
 * Provides a consistent logging interface for client components.
 * In development: logs to console with formatting
 * In production: could be extended to send to a logging service
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

const isDev = process.env.NODE_ENV === "development";

function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : "";
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

function shouldLog(level: LogLevel): boolean {
  // In production, only log warnings and errors
  if (!isDev && (level === "debug" || level === "info")) {
    return false;
  }
  return true;
}

export const clientLogger = {
  debug(message: string, context?: LogContext): void {
    if (shouldLog("debug")) {
      console.debug(formatMessage("debug", message, context));
    }
  },

  info(message: string, context?: LogContext): void {
    if (shouldLog("info")) {
      console.info(formatMessage("info", message, context));
    }
  },

  warn(message: string, context?: LogContext): void {
    if (shouldLog("warn")) {
      console.warn(formatMessage("warn", message, context));
    }
  },

  error(message: string, context?: LogContext): void {
    if (shouldLog("error")) {
      console.error(formatMessage("error", message, context));

      // In production, could send to error tracking service
      // e.g., Sentry, LogRocket, etc.
      // if (!isDev && typeof window !== 'undefined') {
      //   sendToErrorTrackingService({ message, context });
      // }
    }
  },
};

// Alias for common use case
export const logError = (message: string, error?: unknown, context?: LogContext): void => {
  const errorContext: LogContext = {
    ...context,
    error: error instanceof Error ? { name: error.name, message: error.message } : error,
  };
  clientLogger.error(message, errorContext);
};
