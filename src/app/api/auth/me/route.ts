// src/app/api/auth/me/route.ts
// GET /api/auth/me
// Returns the authenticated user's profile.
// Headers: Authorization: Bearer <token>  OR Cookie: veil_token=<token>

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { ok, unauthorized, err } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return unauthorized();

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, email: true, name: true, photoUrl: true, createdAt: true },
    });

    if (!user) return unauthorized();

    return ok({ user });
  } catch (e) {
    console.error("[me]", e);
    return err("Internal server error", 500);
  }
}
