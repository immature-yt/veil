"use client";
// src/components/CountdownTimer.tsx

import { useEffect, useState } from "react";

interface CountdownTimerProps {
  targetDate: string; // ISO string
  label: string;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function CountdownTimer({ targetDate, label }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0, done: false });

  useEffect(() => {
    const target = new Date(targetDate).getTime();

    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setTimeLeft({ h: 0, m: 0, s: 0, done: true });
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft({ h, m, s, done: false });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  if (timeLeft.done) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs font-mono tracking-[0.2em] uppercase text-veil-textMuted">{label}</p>
      <div className="flex items-center gap-3">
        {[
          { val: pad(timeLeft.h), unit: "h" },
          { val: pad(timeLeft.m), unit: "m" },
          { val: pad(timeLeft.s), unit: "s" },
        ].map(({ val, unit }) => (
          <div key={unit} className="flex flex-col items-center">
            <span className="font-mono text-3xl font-medium text-veil-accent tabular-nums">
              {val}
            </span>
            <span className="text-[10px] text-veil-muted uppercase tracking-widest font-mono mt-0.5">
              {unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
