import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0c0a14",
          color: "#f1ece7",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        <div style={{ fontSize: 64, letterSpacing: 6, color: "#d8bf88" }}>Midnight Tarot</div>
        <div style={{ marginTop: 28, width: 220, height: 1, backgroundColor: "rgba(216,191,136,.5)" }} />
        <div style={{ marginTop: 28, fontSize: 26, letterSpacing: 3, color: "rgba(241,236,231,.6)" }}>
          A private midnight ritual
        </div>
      </div>
    ),
    { ...size },
  );
}
