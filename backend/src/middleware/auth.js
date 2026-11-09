import jwt from "jsonwebtoken";
import User from "../models/User.js";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === "change-this-secret" || secret.length < 32) {
    throw new Error("JWT_SECRET must be set to a unique random value of at least 32 characters");
  }
  return secret;
}

export function createAuthToken(user) {
  return jwt.sign({ sub: user._id.toString() }, getJwtSecret(), { expiresIn: "12h" });
}

export function getAuthenticatedUser(token) {
  const payload = jwt.verify(token, getJwtSecret());
  if (typeof payload !== "object" || typeof payload.sub !== "string") {
    throw new Error("Invalid authentication token");
  }
  return { id: payload.sub };
}

export async function requireAuth(req, res, next) {
  const authorization = req.get("authorization") || "";
  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const identity = getAuthenticatedUser(token);
    if (!/^[a-f\d]{24}$/i.test(identity.id)) {
      return res.status(401).json({ error: "Invalid authentication token" });
    }
    const user = await User.findById(identity.id);
    if (!user) return res.status(401).json({ error: "Account no longer exists" });
    req.user = user;
    return next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Invalid or expired authentication token" });
    }
    return next(error);
  }
}
