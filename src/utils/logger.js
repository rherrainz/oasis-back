import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "*.password",
      "*.token",
      "*.JWT_SECRET",
      "*.ADMIN_KEY",
      "*.DATABASE_URL",
      "*.CLOUDINARY_API_SECRET"
    ],
    censor: "[REDACTED]"
  }
});
