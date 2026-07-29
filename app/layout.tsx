import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CartMate — Split Campus Orders",
  description:
    "Find hostelmates ordering from Blinkit or Swiggy Instamart right now. Join their cart to split delivery fees and skip minimums.",
  keywords: ["quick-commerce", "hostel", "blinkit", "instamart", "campus delivery", "split order"],
  manifest: "/manifest.json",
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
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#4338ca",
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
      </body>
    </html>
  );
}
