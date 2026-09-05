import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Midnight Tarot | A private tarot ritual after dark",
    template: "%s | Midnight Tarot",
  },
  description: "Draw from a complete 78-card tarot deck and receive a reflective, private reading shaped around your question.",
  applicationName: "Midnight Tarot",
  keywords: ["tarot reading", "online tarot", "AI tarot", "tarot spreads", "塔罗牌", "在线塔罗"],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Midnight Tarot",
    description: "A private tarot ritual after dark, drawn from a complete 78-card deck.",
    type: "website",
    siteName: "Midnight Tarot",
  },
  twitter: {
    card: "summary",
    title: "Midnight Tarot",
    description: "A private tarot ritual after dark, drawn from a complete 78-card deck.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sansBody">
        {children}
      </body>
    </html>
  );
}
