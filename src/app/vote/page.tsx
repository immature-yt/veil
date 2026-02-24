"use client";
// src/app/vote/page.tsx

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { CountdownTimer } from "@/components/CountdownTimer";
import { VeilLogo } from "@/components/VeilLogo";
import { Suspense } from "react";


interface MatchInfo {
  id: string;
  phase: string;
  outcome: string | null;
  myNick: string;
  theirNick: string;
  expiresAt: string;
  myVote: boolean | null;
  theirVoteSubmitted: boolean;
  revealData: { name: string; photoUrl: string | null } | null;
}

function VoteContent() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const matchId = searchParams.get("matchId");

  const [match, setMatch] = useState<MatchInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [voteResult, setVoteResult] = useState<"pending" | "resolved" | null>(null);

  useEffect(() => {
    if (!matchId || !token) return;
    fetchMatch();
    const id = setInterval(fetchMatch, 8000); // poll for partner vote
    return () => clearInterval(id);
  }, [matchId, token]);

  async function fetchMatch() {
    const res = await fetch("/api/match", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (json.success && json.data.match) {
      const m = json.data.match;
      setMatch(m);
      if (m.phase === "RESOLVED") {
        setTimeout(() => router.push("/"), 3000);
      }
    }
    setLoading(false);
  }

  async function submitVote(vote: boolean) {
    if (submitting || !matchId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ matchId, vote }),
      });
      const json = await res.json();
      if (json.success) {
        if (json.data.resolved) {
          setVoteResult("resolved");
          await fetchMatch();
        } else {
          setVoteResult("pending");
          await fetchMatch();
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-veil-accent animate-pulse"
              style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!match) return null;

  // Already resolved — redirect handled above
  if (match.phase === "RESOLVED") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-8 animate-fade-in">
        <VeilLogo />
        {match.outcome === "REVEALED" && match.revealData ? (
          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-veil-card border-2 border-veil-accent overflow-hidden mx-auto mb-4 animate-glow">
              {match.revealData.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={match.revealData.photoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl text-veil-accent">
                  {match.revealData.name[0]}
                </div>
              )}
            </div>
            <p className="font-display text-2xl text-veil-text">{match.revealData.name}</p>
            <p className="text-veil-success text-sm mt-2">Both said yes.</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-4xl mb-4">◌</p>
            <p className="font-display text-xl text-veil-textMuted italic">The veil holds.</p>
          </div>
        )}
        <p className="text-xs text-veil-muted">Redirecting home…</p>
      </div>
    );
  }

  // Already voted — waiting for partner
  if (match.myVote !== null || voteResult === "pending") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-8 px-8 animate-fade-in">
        <VeilLogo />
        <div className="text-center">
          <p className="font-display text-xl text-veil-text mb-2">
            Your vote is in.
          </p>
          <p className="text-veil-textMuted text-sm">
            You voted <span className={match.myVote ? "text-veil-success" : "text-veil-danger"}>
              {match.myVote ? "Yes" : "No"}
            </span>
          </p>
        </div>

        <div className="border border-veil-border rounded-2xl p-6 w-full bg-veil-card text-center">
          {match.theirVoteSubmitted ? (
            <p className="text-veil-accent text-sm font-mono">Both votes in. Resolving…</p>
          ) : (
            <p className="text-veil-textMuted text-sm">
              Waiting for <span className="text-veil-accent">{match.theirNick}</span> to vote…
            </p>
          )}
          <div className="flex gap-1.5 justify-center mt-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-veil-accent animate-pulse"
                style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        </div>

        {match.expiresAt && (
          <CountdownTimer targetDate={match.expiresAt} label="Vote window closes in" />
        )}
      </div>
    );
  }

  // Show vote screen
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 px-8 animate-fade-in">
      <VeilLogo />

      <div className="text-center">
        <p className="text-veil-textMuted text-xs font-mono tracking-widest uppercase mb-2">The Moment of Truth</p>
        <p className="font-display text-2xl text-veil-text leading-snug">
          Do you want to meet<br />
          <span className="text-veil-accent italic">{match.theirNick}</span>?
        </p>
      </div>

      <div className="border border-veil-border rounded-2xl p-5 bg-veil-card w-full text-sm text-veil-textMuted space-y-2">
        <div className="flex items-start gap-2.5">
          <span className="text-veil-accent font-mono text-xs mt-0.5">●</span>
          <span>If <strong className="text-veil-text">both</strong> vote Yes — your real identities are revealed.</span>
        </div>
        <div className="flex items-start gap-2.5">
          <span className="text-veil-danger font-mono text-xs mt-0.5">●</span>
          <span>If <strong className="text-veil-text">either</strong> votes No — this conversation is permanently deleted.</span>
        </div>
      </div>

      {match.expiresAt && (
        <CountdownTimer targetDate={match.expiresAt} label="Window closes in" />
      )}

      <div className="flex gap-4 w-full">
        <button
          onClick={() => submitVote(false)}
          disabled={submitting}
          className="flex-1 py-4 rounded-2xl border-2 border-veil-danger text-veil-danger font-mono text-sm tracking-widest uppercase
                     hover:bg-veil-danger hover:text-veil-black transition-all active:scale-95 disabled:opacity-40"
        >
          No
        </button>
        <button
          onClick={() => submitVote(true)}
          disabled={submitting}
          className="flex-1 py-4 rounded-2xl bg-veil-accent text-veil-black font-mono text-sm tracking-widest uppercase font-medium
                     hover:bg-veil-text transition-all active:scale-95 disabled:opacity-40
                     shadow-[0_0_20px_rgba(200,169,110,0.3)]"
        >
          Yes
        </button>
      </div>
      <p className="text-xs text-veil-muted text-center">Your choice is anonymous until both have voted.</p>
    </div>
  );
}

export default function VotePage() {
  return (
    <Suspense>
      <VoteContent />
    </Suspense>
  );
}
