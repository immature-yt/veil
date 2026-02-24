// src/app/api/auth/login/route.ts
// POST /api/auth/login
// Body: { email, password }
// Returns: { token, user }

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { ok, err } from "@/lib/apiResponse";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return err("email and password are required");
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return err("Invalid credentials", 401);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return err("Invalid credentials", 401);
    }

    const token = await signToken({ userId: user.id, email: user.email });

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      photoUrl: user.photoUrl,
      createdAt: user.createdAt,
    };

    return ok({ token, user: safeUser });
  } catch (e) {
    console.error("[login]", e);
    return err("Internal server error", 500);
  }
}
