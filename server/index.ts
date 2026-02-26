import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { ConnectSessionKnexStore } from "connect-session-knex";
import jwt from "jsonwebtoken";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { runMigrations, runIncrementalMigrations } from "./db";
import { db } from "./db";
import { storage } from "./storage";

process.on("SIGHUP", () => {});

const app = express();
const httpServer = createServer(app);

declare module "express-session" {
  interface SessionData {
    userId: number;
    username: string;
    role: string;
  }
}

app.use(express.json());

app.use(express.urlencoded({ extended: false }));

const isProduction = process.env.NODE_ENV === "production";

if (isProduction) {
  app.set("trust proxy", 1);
}

const sessionStore = new ConnectSessionKnexStore({
  knex: db as any,
  createtable: true,
  tablename: "sessions",
});

app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || "financehub-dev-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: isProduction ? "none" : undefined,
    },
  })
);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  await runMigrations().catch((err) => console.error("Migration error:", err));
  await runIncrementalMigrations().catch((err) => console.error("Incremental migration error:", err));

  app.use(async (req: Request, res: Response, next: NextFunction) => {
    const ssoToken = req.query.sso_token as string;
    if (!ssoToken) return next();
    if ((req.session as any)?.userId) return next();

    const secret = process.env.SSO_HANDOFF_SECRET;
    if (!secret) return next();

    try {
      const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
      const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:5000";
      const audience = `${proto}://${host}`;

      const payload = jwt.verify(ssoToken, secret, {
        issuer: "launchpad",
        audience,
      }) as { oid?: string; email?: string; name?: string };

      const email = payload.email;
      if (!email) {
        console.warn("[SSO Handoff] Token missing email claim");
        return next();
      }

      let user = await storage.getUserByEmail(email);
      if (!user) {
        const bcrypt = await import("bcryptjs");
        const randomPassword = await bcrypt.hash(Math.random().toString(36) + Date.now().toString(36), 10);
        user = await storage.createUser({
          username: email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "_"),
          password: randomPassword,
          email,
          displayName: payload.name || email.split("@")[0],
          role: "user",
        });
        console.log(`[SSO Handoff] Auto-provisioned user: ${email}`);
      }

      const sessionSecret = process.env.SESSION_SECRET || "financehub-dev-secret-key";
      const authToken = jwt.sign(
        { userId: user.id, username: user.username, role: (user as any).role || "user", email },
        sessionSecret,
        { expiresIn: "24h", issuer: "financehub" }
      );

      const url = new URL(req.originalUrl, `${proto}://${host}`);
      url.searchParams.delete("sso_token");
      url.searchParams.set("auth_token", authToken);
      console.log(`[SSO Handoff] Authenticated ${email}, redirecting with auth token to ${url.pathname}`);
      res.redirect(url.pathname + url.search);
    } catch (err: any) {
      console.error("[SSO Handoff] Token validation failed:", err.message);
      next();
    }
  });

  app.use((req: Request, _res: Response, next: NextFunction) => {
    if ((req.session as any)?.userId) return next();

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return next();

    const token = authHeader.slice(7);
    const sessionSecret = process.env.SESSION_SECRET || "financehub-dev-secret-key";

    try {
      const payload = jwt.verify(token, sessionSecret, { issuer: "financehub" }) as {
        userId: number; username: string; role: string; email: string;
      };
      (req.session as any).userId = payload.userId;
      (req.session as any).username = payload.username;
      (req.session as any).role = payload.role;
    } catch {}

    next();
  });

  await registerRoutes(httpServer, app);

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
  httpServer.on("error", (err) => {
    console.log("[SERVER] httpServer error:", err);
  });

  httpServer.on("close", () => {
    console.log("[SERVER] httpServer closed");
  });

  httpServer.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
    log(`serving on port ${port}`);
  });
})();
