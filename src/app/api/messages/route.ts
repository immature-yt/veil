// src/app/api/messages/route.ts
// GET  /api/messages?matchId=<id>  — Fetch all messages for a match
// POST /api/messages               — Send a message

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { ok, unauthorized, err } from "@/lib/apiResponse";

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return unauthorized();

    const matchId = req.nextUrl.searchParams.get("matchId");
    if (!matchId) return err("matchId is required");

    // Verify caller is a participant
    const match = await prisma.match.findFirst({
      where: {
        id: matchId,
        OR: [{ user1Id: auth.userId }, { user2Id: auth.userId }],
      },
    });
    if (!match) return err("Match not found", 404);

    const isUser1 = match.user1Id === auth.userId;
    const myNick = isUser1 ? match.user1Nick : match.user2Nick;
    const theirNick = isUser1 ? match.user2Nick : match.user1Nick;

    const messages = await prisma.message.findMany({
      where: { matchId },
      orderBy: { createdAt: "asc" },
      select: { id: true, senderId: true, content: true, createdAt: true },
    });

    // Map sender IDs to anonymous nicknames
    const mappedMessages = messages.map((m) => ({
      id: m.id,
      content: m.content,
      createdAt: m.createdAt,
      isMe: m.senderId === auth.userId,
      senderNick: m.senderId === auth.userId ? myNick : theirNick,
    }));

    return ok({ messages: mappedMessages });
  } catch (e) {
    console.error("[messages GET]", e);
    return err("Internal server error", 500);
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return unauthorized();

    const { matchId, content } = await req.json();

    if (!matchId || !content?.trim()) {
      return err("matchId and content are required");
    }
    if (content.trim().length > 1000) {
      return err("Message too long (max 1000 chars)");
    }

    // Verify caller is participant and chat is still open
    const match = await prisma.match.findFirst({
      where: {
        id: matchId,
        OR: [{ user1Id: auth.userId }, { user2Id: auth.userId }],
      },
    });

    if (!match) return err("Match not found", 404);
    if (match.phase !== "CHAT") return err("Chat is locked", 403);
    if (new Date() > match.expiresAt) {
      // Auto-transition to VOTE phase
      await prisma.match.update({ where: { id: matchId }, data: { phase: "VOTE" } });
      return err("Chat has expired — vote phase has begun", 403);
    }

    const message = await prisma.message.create({
      data: { matchId, senderId: auth.userId, content: content.trim() },
      select: { id: true, content: true, createdAt: true },
    });

    // ── REAL-TIME HOOK ────────────────────────────────────────────────────────
    // When you add Pusher or Socket.io, trigger the event here:
    // await pusher.trigger(`match-${matchId}`, "new-message", { message });
    // ─────────────────────────────────────────────────────────────────────────

    return ok({ message: { ...message, isMe: true } }, 201);
  } catch (e) {
    console.error("[messages POST]", e);
    return err("Internal server error", 500);
  }
}
