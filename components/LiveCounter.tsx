"use client";

import { useEffect, useState } from "react";
import { fetchStats, type Stats } from "@/lib/api";

interface LiveCounterProps {
  count: number;
  realtimeConnected: boolean;
}

export function LiveCounter({ count, realtimeConnected }: LiveCounterProps) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetchStats().then(setStats);
    const id = setInterval(() => fetchStats().then(setStats), 60_000);
    return () => clearInterval(id);
  }, []);

  const activeText =
    count === 0
      ? "No one ordering right now"
      : count === 1
      ? "1 person ordering right now"
      : `${count} people ordering right now`;

  return (
    <div className="live-counter-wrap">
      <div className="live-counter">
        {/* Green pulse dot — a status signal, not a badge */}
        <span className={`pulse-dot ${realtimeConnected ? "pulse-dot--live" : "pulse-dot--offline"}`} />
        <span className="live-counter__text">{activeText}</span>
      </div>
      {stats && stats.lastHour > 0 && (
        <div className="stats-bar">
          <strong>{stats.lastHour}</strong> order{stats.lastHour !== 1 ? "s" : ""} split in the last hour
          {stats.today > stats.lastHour && (
            <> &middot; <strong>{stats.today}</strong> today</>
          )}
        </div>
      )}
    </div>
  );
}
