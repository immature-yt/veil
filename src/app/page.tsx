"use client";
// src/app/page.tsx — Main app shell / router

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { CountdownTimer } from "@/components/CountdownTimer";
import { VeilLogo } from "@/components/VeilLogo";

interface MatchData {
  id: string;
  phase: "CHAT" | "VOTE" | "RESOLVED";
  outcome: "REVEALED" | "WIPED" | null;
  myNick: string;
  theirNick: string;
  expiresAt: string;
  myVote: boolean | null;
  theirVoteSubmitted: boolean;
  revealData: { name: string; photoUrl: string | null } | null;
}

interface AppData {
  match: MatchData | null;
  phase: "WAITING" | "CHAT" | "VOTE";
  nextTransition: string;
  message?: string;
}

export default function Home() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [appData, setAppData] = useState<AppData | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (token) {
      fetchMatch();
      // Poll every 30s for phase transitions
      const id = setInterval(fetchMatch, 30000);
      return () => clearInterval(id);
    }
  }, [token]);

  async function fetchMatch() {
    try {
      const res = await fetch("/api/match", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setAppData(json.data);
    } finally {
      setFetching(false);
    }
  }

  if (loading || fetching) return <LoadingScreen />;
  if (!user || !appData) return null;

  // Route to correct view
  if (!appData.match) return <WaitingScreen appData={appData} userName={user.name} />;
  if (appData.match.phase === "CHAT") return <GoToChat matchId={appData.match.id} />;
  if (appData.match.phase === "VOTE") return <GoToVote matchId={appData.match.id} />;
  if (appData.match.phase === "RESOLVED") return <ResolvedScreen match={appData.match} />;

  return <WaitingScreen appData={appData} userName={user.name} />;
}

// ── Sub-screens ───────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-screen gap-4">
      <VeilLogo />
      <div className="flex gap-1.5 mt-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-veil-accent animate-pulse"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
}

function WaitingScreen({ appData, userName }: { appData: AppData; userName: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-screen px-8 gap-8 animate-fade-in">
      <VeilLogo />

      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-veil-textMuted text-sm">
          Good to see you, <span className="text-veil-text">{userName.split(" ")[0]}</span>
        </p>
        <p className="text-veil-textMuted text-xs leading-relaxed max-w-[240px]">
          {appData.message ?? "Your anonymous match drops at 10:00 AM."}
        </p>
      </div>

      <div className="border border-veil-border rounded-2xl p-6 w-full bg-veil-card text-center">
        <CountdownTimer
          targetDate={appData.nextTransition}
          label={appData.phase === "WAITING" ? "Next drop in" : "Vote closes in"}
        />
      </div>

      <div className="flex flex-col gap-3 text-center">
        {[
          { icon: "◉", text: "One match. Every day at 10 AM." },
          { icon: "◌", text: "22 hours to talk. No faces, no names." },
          { icon: "◈", text: "Vote to reveal — or vanish forever." },
        ].map(({ icon, text }) => (
          <div key={text} className="flex items-center gap-3 text-left">
            <span className="text-veil-accent text-sm font-mono">{icon}</span>
            <span className="text-veil-textMuted text-xs">{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GoToChat({ matchId }: { matchId: string }) {
  const router = useRouter();
  useEffect(() => { router.push(`/chat?matchId=${matchId}`); }, [matchId, router]);
  return <LoadingScreen />;
}

function GoToVote({ matchId }: { matchId: string }) {
  const router = useRouter();
  useEffect(() => { router.push(`/vote?matchId=${matchId}`); }, [matchId, router]);
  return <LoadingScreen />;
}

function ResolvedScreen({ match }: { match: MatchData }) {
  if (match.outcome === "REVEALED" && match.revealData) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-screen px-8 gap-8 animate-fade-in">
        <VeilLogo />
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-24 h-24 rounded-full bg-veil-card border-2 border-veil-accent overflow-hidden animate-glow">
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
          <p className="text-veil-success text-sm">Veil lifted — you both said yes.</p>
        </div>
        <p className="text-xs text-veil-textMuted">Next match drops at 10:00 AM tomorrow.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-screen px-8 gap-8 animate-fade-in">
      <VeilLogo />
      <div className="text-center">
        <p className="text-4xl mb-4">◌</p>
        <p className="font-display text-xl text-veil-textMuted italic">The veil holds.</p>
        <p className="text-xs text-veil-textMuted mt-3">This conversation has been erased.</p>
      </div>
      <p className="text-xs text-veil-textMuted">Next match drops at 10:00 AM tomorrow.</p>
    </div>
  );
}

export function VeilLogo() {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-veil-accent opacity-10 blur-xl scale-150" />
        <span className="relative font-display text-4xl text-veil-accent tracking-widest">veil</span>
      </div>
      <div className="h-px w-12 bg-gradient-to-r from-transparent via-veil-accentDim to-transparent" />
    </div>
  );
}
