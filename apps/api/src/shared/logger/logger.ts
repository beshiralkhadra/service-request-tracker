import pino, { type Logger } from "pino";

export const createLogger = (level: string): Logger =>
  pino({
    level,
    base: null,
    timestamp: pino.stdTimeFunctions.isoTime,
  });
