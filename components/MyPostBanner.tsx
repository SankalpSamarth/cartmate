"use client";

import { useEffect, useState } from "react";
import { StoredPost } from "@/lib/device";

interface MyPostBannerProps {
  post: StoredPost;
  pendingCount: number;
  onCancel: () => void;
  onViewRequests: () => void;
}

function formatCountdown(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const totalSecs = Math.floor(diff / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function MyPostBanner({ post, pendingCount, onCancel, onViewRequests }: MyPostBannerProps) {
  const [countdown, setCountdown] = useState(() => formatCountdown(post.expires_at));

  useEffect(() => {
    const id = setInterval(() => setCountdown(formatCountdown(post.expires_at)), 1000);
    return () => clearInterval(id);
  }, [post.expires_at]);

  return (
    <div className="my-post-banner">
      <button onClick={onViewRequests} className="my-post-banner__left">
        <span className="my-post-banner__dot" />
        <span className="my-post-banner__text">
          Your <strong>{post.platform}</strong> post is live
        </span>
        <span className="my-post-banner__countdown">{countdown}</span>
        {pendingCount > 0 && (
          <span className="requests-badge">
            {pendingCount} {pendingCount === 1 ? "request" : "requests"}
          </span>
        )}
      </button>
      <button onClick={onCancel} className="my-post-banner__cancel">
        Cancel
      </button>
    </div>
  );
}
