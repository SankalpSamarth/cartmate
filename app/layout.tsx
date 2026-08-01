import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

export const metadata: Metadata = {
  title: "CartMate — Split Campus Orders",
  description:
    "Find hostelmates ordering from Blinkit or Swiggy Instamart right now. Join their cart to split delivery fees and skip minimums.",
  keywords: ["quick-commerce", "hostel", "blinkit", "instamart", "campus delivery", "split order"],
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CartMate",
  },
  openGraph: {
    title: "CartMate 🛒",
    description: "See who's ordering on campus right now. Join their cart instantly.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">{children}</div>
        <Analytics />
      </body>
    </html>
  );
}
