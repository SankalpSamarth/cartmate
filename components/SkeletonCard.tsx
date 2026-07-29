"use client";

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-card__header">
        <div className="skeleton skeleton--badge" />
        <div className="skeleton skeleton--countdown" />
      </div>
      <div className="skeleton skeleton--hostel" />
      <div className="skeleton skeleton--note" />
      <div className="skeleton skeleton--note skeleton--note-short" />
      <div className="skeleton skeleton--btn" />
    </div>
  );
}
