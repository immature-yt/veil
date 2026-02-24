// src/lib/auth.ts
// JWT helpers — works for both web and Android clients (Authorization: Bearer <token>)

import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-change-me"
);

export interface JWTPayload {
  userId: string;
  email: string;
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Extract & verify JWT from:
 *  1. Authorization: Bearer <token>  (Android / API clients)
 *  2. Cookie: veil_token=<token>     (Web clients)
 */
export async function getAuthUser(req: NextRequest): Promise<JWTPayload | null> {
  // Header first (Android / Postman)
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return verifyToken(authHeader.slice(7));
  }

  // Cookie fallback (web browser)
  const cookieStore = cookies();
  const cookieToken = cookieStore.get("veil_token")?.value;
  if (cookieToken) {
    return verifyToken(cookieToken);
  }

  return null;
}
