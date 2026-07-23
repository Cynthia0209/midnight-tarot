import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Midnight Tarot",
  description: "A quiet AI tarot reading ritual for reflection after dark.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sansBody">{children}</body>
    </html>
  );
}
