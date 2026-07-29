"use client";

import dynamic from "next/dynamic";

const Board = dynamic(
  () => import("@/components/Board").then((m) => m.Board),
  { ssr: false }
);

export default function HomePage() {
  return <Board />;
}
