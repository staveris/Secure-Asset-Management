import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes, SENSITIVE_FIELDS } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import helmet from "helmet";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

const PRIMARY_HOST = (process.env.ALLOWED_HOST || "cyres360.toolsoftech.eu")
  .toLowerCase()
  .replace(/\.$/, "")
  .split(":")[0];

// Legacy domain that should permanently redirect to PRIMARY_HOST
const LEGACY_HOST = "nis2compliance.toolsoftech.eu";

// Lightweight liveness/readiness endpoint for load balancer health checks.
// Registered BEFORE the host-gate so AWS ALB/ECS probes (which use IP-based
// Host headers) are not rejected. Does not expose any environment variables,
// secrets, or database internals.
app.get("/health", async (_req: Request, res: Response) => {
  let databaseStatus: "ok" | "error" | "not_checked" = "not_checked";
  try {
    const { pool } = await import("./db");
    await pool.query("SELECT 1");
    databaseStatus = "ok";
  } catch {
    databaseStatus = "error";
  }
  res.status(databaseStatus === "error" ? 503 : 200).json({
    status: databaseStatus === "error" ? "degraded" : "ok",
    service: "CyberResilience360",
    timestamp: new Date().toISOString(),
    database: databaseStatus,
  });
});

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);

  app.use((req: Request, res: Response, next: NextFunction) => {
    const rawHost = (req.headers.host || "").toLowerCase().replace(/\.$/, "").split(":")[0];

    // Redirect legacy domain to primary domain
    if (rawHost === LEGACY_HOST) {
      const redirectUrl = `https://${PRIMARY_HOST}${req.originalUrl}`;
      res.redirect(301, redirectUrl);
      return;
    }

    // Block any other host
    if (rawHost !== PRIMARY_HOST) {
      res.status(403).send("Forbidden");
      return;
    }

    next();
  });
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(
  express.json({
    limit: "10mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: "10mb" }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

const LOG_REDACT_FIELDS = new Set([
  ...SENSITIVE_FIELDS,
  "secret", "otpauthUrl", "otpauth_url", "qrCode", "qr_code",
  "inviteLink", "invite_link", "inviteToken", "invite_token",
]);

function redactForLog(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(redactForLog);
  if (obj instanceof Date || obj instanceof Buffer) return obj;
  const cleaned: any = {};
  for (const key of Object.keys(obj)) {
    cleaned[key] = LOG_REDACT_FIELDS.has(key) ? "[REDACTED]" : redactForLog(obj[key]);
  }
  return cleaned;
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(redactForLog(capturedJsonResponse))}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const { seedDatabase } = await import("./seed");

  await registerRoutes(httpServer, app);

  try {
    await seedDatabase();
  } catch (err) {
    console.error("Seed error:", err);
    if (process.env.NODE_ENV === "production") {
      console.error("Fatal seed error in production — exiting to prevent startup with unsafe state.");
      process.exit(1);
    }
  }

  try {
    const { seedAtomicControls } = await import("./atomic-seed");
    await seedAtomicControls();

    try {
      const { seedDoraControls } = await import("./dora-seed");
      const doraReport = await seedDoraControls();
      console.log(
        `DORA controls auto-seed: imported=${doraReport.imported} updated=${doraReport.updated} unchanged=${doraReport.unchanged} skipped=${doraReport.skipped} failed=${doraReport.failed}`,
      );
    } catch (err) {
      console.error("DORA controls auto-seed error:", err);
    }

    try {
      const { seedNis2ApplicabilityTags } = await import("./nis2-tags-seed");
      const tagsReport = await seedNis2ApplicabilityTags();
      console.log(
        `NIS2 applicability tags auto-seed: imported=${tagsReport.imported} updated=${tagsReport.updated} unchanged=${tagsReport.unchanged} skipped=${tagsReport.skipped} failed=${tagsReport.failed}`,
      );
    } catch (err) {
      console.error("NIS2 applicability tags auto-seed error:", err);
    }

    try {
      const { seedNis2Art21Risks } = await import("./cyber-risks-seed");
      const riskReport = await seedNis2Art21Risks();
      console.log(
        `NIS2 Art.21 risk library auto-seed: imported=${riskReport.imported} updated=${riskReport.updated} unchanged=${riskReport.unchanged} skipped=${riskReport.skipped} failed=${riskReport.failed}`,
      );
    } catch (err) {
      console.error("NIS2 Art.21 risk library auto-seed error:", err);
    }
  } catch (err) {
    console.error("Post-seed setup error:", err);
  }

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
