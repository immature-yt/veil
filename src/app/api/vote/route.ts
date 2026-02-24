// src/app/api/vote/route.ts
// POST /api/vote
// Body: { matchId, vote: true | false }
// Resolves the match if both users have voted.
export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { ok, unauthorized, err } from "@/lib/apiResponse";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return unauthorized();

    const { matchId, vote } = await req.json();

    if (!matchId || typeof vote !== "boolean") {
      return err("matchId and vote (boolean) are required");
    }

    // Verify caller is participant
    const match = await prisma.match.findFirst({
      where: {
        id: matchId,
        OR: [{ user1Id: auth.userId }, { user2Id: auth.userId }],
      },
      include: { votes: true },
    });

    if (!match) return err("Match not found", 404);
    if (match.phase === "CHAT") return err("Vote phase hasn't started yet", 403);
    if (match.phase === "RESOLVED") return err("This match is already resolved", 409);

    // Prevent double-voting
    const alreadyVoted = match.votes.find((v) => v.userId === auth.userId);
    if (alreadyVoted) return err("You have already voted", 409);

    // Record the vote
    await prisma.vote.create({
      data: { matchId, userId: auth.userId, vote },
    });

    // Check if both users have now voted
    const allVotes = await prisma.vote.findMany({ where: { matchId } });
    const bothVoted = allVotes.length === 2;

    if (bothVoted) {
      const bothYes = allVotes.every((v) => v.vote === true);
      const outcome = bothYes ? "REVEALED" : "WIPED";

      await prisma.match.update({
        where: { id: matchId },
        data: { phase: "RESOLVED", outcome, resolvedAt: new Date() },
      });

      // If wiped, permanently delete messages
      if (outcome === "WIPED") {
        await prisma.message.deleteMany({ where: { matchId } });
      }

      return ok({ resolved: true, outcome });
    }

    return ok({ resolved: false, message: "Vote recorded. Waiting for your match." });
  } catch (e) {
    console.error("[vote POST]", e);
    return err("Internal server error", 500);
  }
}
