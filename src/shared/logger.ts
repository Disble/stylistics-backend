import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

const transport = isProduction
  ? undefined
  : {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
        ignore: "pid,hostname",
      },
    };

export const logger = pino({
  name: "mastra-api",
  level: process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug"),
  transport,
});
