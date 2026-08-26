type LogContext = Record<string, unknown>;

function write(
  level: "INFO" | "WARN" | "ERROR",
  message: string,
  context?: LogContext,
) {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
    }),
  );
}

export const logger = {
  info(message: string, context?: LogContext) {
    write("INFO", message, context);
  },

  warn(message: string, context?: LogContext) {
    write("WARN", message, context);
  },

  error(message: string, context?: LogContext) {
    write("ERROR", message, context);
  },
};
