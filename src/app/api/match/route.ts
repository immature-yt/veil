// src/app/api/match/route.ts
// GET  /api/match  — Fetch the current user's active match for today
// POST /api/match  — Admin/cron trigger to run the daily matchmaking (called at 10 AM)
export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { ok, unauthorized, err } from "@/lib/apiResponse";
import { todayUTC, getTodayDropTime, getChatExpiry, generateNickname, getCurrentPhase } from "@/lib/matchUtils";

// ── GET: Fetch today's match ──────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return unauthorized();

    const today = todayUTC();
    const { phase, nextTransition } = getCurrentPhase();

    const match = await prisma.match.findFirst({
      where: {
        date: today,
        OR: [{ user1Id: auth.userId }, { user2Id: auth.userId }],
      },
      include: {
        votes: { select: { userId: true, vote: true } },
      },
    });

    if (!match) {
      return ok({
        match: null,
        phase,
        nextTransition,
        message:
          phase === "WAITING"
            ? "Your daily match will drop at 10:00 AM."
            : "No match found for today. Check back tomorrow.",
      });
    }

    // Determine which "slot" the caller is
    const isUser1 = match.user1Id === auth.userId;
    const myNick = isUser1 ? match.user1Nick : match.user2Nick;
    const theirNick = isUser1 ? match.user2Nick : match.user1Nick;

    // Has the caller voted?
    const myVote = match.votes.find((v) => v.userId === auth.userId);
    const theirVote = match.votes.find((v) => v.userId !== auth.userId);

    // Build reveal data only if both voted Yes
    let revealData = null;
    if (match.outcome === "REVEALED") {
      const partnerId = isUser1 ? match.user2Id : match.user1Id;
      const partner = await prisma.user.findUnique({
        where: { id: partnerId },
        select: { name: true, photoUrl: true },
      });
      revealData = partner;
    }

    return ok({
      match: {
        id: match.id,
        phase: match.phase,
        outcome: match.outcome,
        myNick,
        theirNick,
        expiresAt: match.expiresAt,
        resolvedAt: match.resolvedAt,
        myVote: myVote?.vote ?? null,
        theirVoteSubmitted: !!theirVote,
        revealData,
      },
      phase,
      nextTransition,
    });
  } catch (e) {
    console.error("[match GET]", e);
    return err("Internal server error", 500);
  }
}

// ── POST: Run daily matchmaking ───────────────────────────────────────────────
// Protect this with a secret header in production (called by cron/scheduler)
// Header: x-cron-secret: <CRON_SECRET env var>
export async function POST(req: NextRequest) {
  try {
    const cronSecret = req.headers.get("x-cron-secret");
    if (cronSecret !== process.env.CRON_SECRET) {
      return unauthorized();
    }

    const today = todayUTC();
    const dropTime = getTodayDropTime();
    const chatExpiry = getChatExpiry(dropTime);

    // Find all users who don't have a match today
    const usersWithMatch = await prisma.match.findMany({
      where: { date: today },
      select: { user1Id: true, user2Id: true },
    });
    const matchedIds = new Set(
      usersWithMatch.flatMap((m) => [m.user1Id, m.user2Id])
    );

    const unmatchedUsers = await prisma.user.findMany({
      where: { id: { notIn: Array.from(matchedIds) } },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });

    // Simple round-robin pairing (replace with preference-based in production)
    const created: string[] = [];
    for (let i = 0; i + 1 < unmatchedUsers.length; i += 2) {
      const u1 = unmatchedUsers[i];
      const u2 = unmatchedUsers[i + 1];
      const seed1 = `${u1.id}-${today}`;
      const seed2 = `${u2.id}-${today}`;

      const match = await prisma.match.create({
        data: {
          user1Id: u1.id,
          user2Id: u2.id,
          user1Nick: generateNickname(seed1),
          user2Nick: generateNickname(seed2),
          date: today,
          phase: "CHAT",
          expiresAt: chatExpiry,
        },
      });
      created.push(match.id);
    }

    return ok({ matchesCreated: created.length, unpairedCount: unmatchedUsers.length % 2 });
  } catch (e) {
    console.error("[match POST]", e);
    return err("Internal server error", 500);
  }
}
