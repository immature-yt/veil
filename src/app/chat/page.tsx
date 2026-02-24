"use client";
// src/app/chat/page.tsx

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { CountdownTimer } from "@/components/CountdownTimer";
import { VeilLogo } from "@/components/VeilLogo";
import { Suspense } from "react";

interface Message {
  id: string;
  content: string;
  createdAt: string;
  isMe: boolean;
  senderNick: string;
}

interface MatchInfo {
  id: string;
  phase: string;
  myNick: string;
  theirNick: string;
  expiresAt: string;
}

function ChatContent() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const matchId = searchParams.get("matchId");

  const [messages, setMessages] = useState<Message[]>([]);
  const [match, setMatch] = useState<MatchInfo | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!matchId || !token) return;
    fetchMessages();
    fetchMatch();
    // Poll messages every 5 seconds (replace with WebSocket/Pusher in production)
    const id = setInterval(fetchMessages, 5000);
    return () => clearInterval(id);
  }, [matchId, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchMatch() {
    const res = await fetch("/api/match", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (json.success && json.data.match) {
      const m = json.data.match;
      if (m.phase === "VOTE") { router.push(`/vote?matchId=${m.id}`); return; }
      if (m.phase === "RESOLVED") { router.push("/"); return; }
      setMatch(m);
    }
  }

  async function fetchMessages() {
    if (!matchId) return;
    const res = await fetch(`/api/messages?matchId=${matchId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (json.success) setMessages(json.data.messages);
    setLoading(false);
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;

    setSending(true);
    const content = input.trim();
    setInput("");

    // Optimistic update
    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      content,
      createdAt: new Date().toISOString(),
      isMe: true,
      senderNick: match?.myNick ?? "You",
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ matchId, content }),
      });
      const json = await res.json();
      if (!json.success) {
        // Remove optimistic msg on error
        setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
        if (json.error?.includes("locked") || json.error?.includes("expired")) {
          fetchMatch(); // Re-fetch to transition phase
        }
      }
    } finally {
      setSending(false);
    }
  }

  if (!matchId) return <p className="text-center text-veil-textMuted p-8">No match found.</p>;

  return (
    <div className="flex flex-col h-full min-h-screen">
      {/* Header */}
      <div className="flex-none px-5 pt-8 pb-4 border-b border-veil-border bg-veil-black/80 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <VeilLogo />
          <div className="text-right">
            <p className="text-[10px] font-mono text-veil-textMuted tracking-widest uppercase">Chatting with</p>
            <p className="text-sm font-mono text-veil-accent">{match?.theirNick ?? "···"}</p>
          </div>
        </div>
        {match?.expiresAt && (
          <div className="flex justify-center">
            <CountdownTimer targetDate={match.expiresAt} label="Chat locks in" />
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-veil-accent animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
            <p className="text-veil-textMuted text-sm">
              You&apos;re connected with <span className="text-veil-accent">{match?.theirNick}</span>.
            </p>
            <p className="text-veil-muted text-xs">No faces. No names. Just words.</p>
            <p className="text-veil-muted text-xs">You are <span className="text-veil-text font-mono">{match?.myNick}</span>.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-none px-4 py-4 border-t border-veil-border bg-veil-black/80 backdrop-blur-sm">
        <form onSubmit={sendMessage} className="flex gap-3 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(e as unknown as React.FormEvent); } }}
            placeholder="Say something..."
            rows={1}
            className="flex-1 bg-veil-card border border-veil-border rounded-2xl px-4 py-3 text-sm text-veil-text
                       placeholder:text-veil-muted focus:outline-none focus:border-veil-accentDim
                       resize-none transition-colors font-body max-h-32"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="flex-none w-11 h-11 rounded-2xl bg-veil-accent text-veil-black flex items-center justify-center
                       font-mono text-lg disabled:opacity-30 disabled:cursor-not-allowed
                       hover:bg-veil-text transition-all active:scale-95"
          >
            {sending ? "·" : "↑"}
          </button>
        </form>
        <p className="text-center text-[10px] text-veil-muted mt-2 font-mono tracking-wider">
          YOU ARE · <span className="text-veil-accent">{match?.myNick ?? "···"}</span>
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  return (
    <div className={`flex flex-col gap-1 animate-slide-up ${msg.isMe ? "items-end" : "items-start"}`}>
      <span className="text-[9px] font-mono text-veil-muted tracking-widest px-1">
        {msg.senderNick}
      </span>
      <div
        className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          msg.isMe
            ? "bg-veil-accent text-veil-black rounded-br-sm"
            : "bg-veil-card text-veil-text border border-veil-border rounded-bl-sm"
        }`}
      >
        {msg.content}
      </div>
      <span className="text-[9px] text-veil-muted px-1 font-mono">
        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </span>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense>
      <ChatContent />
    </Suspense>
  );
}
