import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Midnight Tarot",
  description: "在午夜与牌相遇，让它成为照见内心的一面镜子。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="font-sansBody">{children}</body>
    </html>
  );
}
