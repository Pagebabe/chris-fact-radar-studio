type LogLevel = "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

function sanitize(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: process.env.NODE_ENV === "development" ? value.stack : undefined,
    };
  }

  if (Array.isArray(value)) return value.map(sanitize);

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
        if (/token|secret|key|password|authorization/i.test(key)) return [key, "[redacted]"];
        return [key, sanitize(entry)];
      })
    );
  }

  return value;
}

export function serverLog(level: LogLevel, scope: string, message: string, context: LogContext = {}) {
  const payload = {
    ts: new Date().toISOString(),
    app: "chris-fact-radar",
    level,
    scope,
    message,
    context: sanitize(context),
  };

  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export function logServerError(scope: string, message: string, error: unknown, context: LogContext = {}) {
  serverLog("error", scope, message, { ...context, error });
}
