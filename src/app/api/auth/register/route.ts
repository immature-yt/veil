// src/app/api/auth/register/route.ts
// POST /api/auth/register
// Body: { email, password, name }
// Returns: { token, user }
export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { ok, err } from "@/lib/apiResponse";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return err("email, password, and name are required");
    }
    if (password.length < 8) {
      return err("Password must be at least 8 characters");
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return err("An account with this email already exists", 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, name, passwordHash },
      select: { id: true, email: true, name: true, photoUrl: true, createdAt: true },
    });

    const token = await signToken({ userId: user.id, email: user.email });

    return ok({ token, user }, 201);
  } catch (e) {
    console.error("[register]", e);
    return err("Internal server error", 500);
  }
}
