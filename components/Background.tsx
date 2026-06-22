"use client";

const stars = Array.from({ length: 64 }, (_, index) => ({
  left: `${(index * 47 + 11) % 100}%`,
  top: `${(index * 67 + 7) % 100}%`,
  delay: `${(index % 11) * 0.37}s`,
  size: index % 9 === 0 ? 2 : 1,
}));

export function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden bg-ink">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(82,43,105,.35),transparent_34%),radial-gradient(circle_at_12%_78%,rgba(72,37,91,.22),transparent_28%),linear-gradient(180deg,#07050b_0%,#11091a_52%,#060509_100%)]" />
      <div className="absolute inset-0 opacity-[.12] [background-image:url('data:image/svg+xml,%3Csvg_viewBox=%220_0_180_180%22_xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter_id=%22n%22%3E%3CfeTurbulence_type=%22fractalNoise%22_baseFrequency=%22.85%22_numOctaves=%223%22_stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect_width=%22100%25%22_height=%22100%25%22_filter=%22url(%23n)%22_opacity=%22.45%22/%3E%3C/svg%3E')]" />
      <div className="absolute left-1/2 top-[12%] h-[32rem] w-[32rem] -translate-x-1/2 rounded-full border border-antiqueGold/[.07]" />
      <div className="absolute left-1/2 top-[18%] h-[22rem] w-[22rem] -translate-x-1/2 rounded-full border border-lavender/[.06]" />
      <div className="candle-glow absolute -left-20 bottom-[-8rem] h-[30rem] w-[24rem] rounded-full bg-amber-400/[.07] blur-3xl" />
      <div className="candle-glow absolute -right-20 bottom-[-10rem] h-[32rem] w-[25rem] rounded-full bg-violet-500/[.08] blur-3xl [animation-delay:1.2s]" />
      {stars.map((star, index) => (
        <i
          key={index}
          className="star absolute rounded-full bg-white/60"
          style={{ left: star.left, top: star.top, width: star.size, height: star.size, animationDelay: star.delay }}
        />
      ))}
      <div className="absolute inset-0 shadow-[inset_0_0_180px_80px_rgba(0,0,0,.72)]" />
    </div>
  );
}
