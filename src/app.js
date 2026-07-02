import "dotenv/config";

import express from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import authRoutes from "./routes/authRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import { logger } from "./utils/logger.js";

const app = express();

app.use(
  pinoHttp({
    logger,
    customProps: (req) => ({
      ip: req.ip,
      userAgent: req.get("user-agent")
    }),
    serializers: {
      req(req) {
        return {
          method: req.method,
          url: req.url,
          remoteAddress: req.remoteAddress,
          remotePort: req.remotePort
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode
        };
      }
    },
    autoLogging: {
      ignore: (req) => req.url === "/api/health"
    }
  })
);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api", postRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Ruta no encontrada." });
});

app.use((error, req, res, next) => {
  if (error.message === "El archivo debe ser una imagen.") {
    req.log?.warn({ err: error }, "Fallo de validación al subir imagen");
    return res.status(400).json({ message: error.message });
  }

  req.log?.error({ err: error }, "Error inesperado del servidor");
  return res.status(500).json({ message: "Error interno del servidor." });
});

export default app;
