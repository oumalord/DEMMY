import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Role, User } from "../types.js";
import { users } from "../data/demoData.js";
import { findUserById } from "../repositories.js";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      sessionId?: string;
    }
  }
}

const jwtSecret = process.env.JWT_SECRET ?? (process.env.NODE_ENV === "production" ? "" : "rentflow-development-secret");

if (!jwtSecret) {
  throw new Error("JWT_SECRET must be configured in production.");
}

export function signAccessToken(user: User) {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email }, jwtSecret, { expiresIn: "2h" });
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  try {
    const payload = jwt.verify(header.slice(7), jwtSecret) as jwt.JwtPayload;
    const user = await findUserById(String(payload.sub)).catch(() => users.find((candidate) => candidate.id === payload.sub) ?? null);
    if (!user) return res.status(401).json({ error: "Unknown token subject" });
    req.user = user;
    req.sessionId = String(payload.jti ?? "demo-session");
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRoles(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Authentication required" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Insufficient permissions" });
    return next();
  };
}
