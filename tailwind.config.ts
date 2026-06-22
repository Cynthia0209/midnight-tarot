import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#07050B",
        midnight: "#100918",
        deepviolet: "#21122F",
        moon: "#F1EDF6",
        lavender: "#B9A1C9",
        antiqueGold: "#D8BF88",
        softgold: "#E7D3A8",
      },
      fontFamily: {
        display: ["Iowan Old Style", "Baskerville", "Times New Roman", "serif"],
        serifDisplay: ["Iowan Old Style", "Baskerville", "Times New Roman", "serif"],
        zhSerif: ["Songti SC", "STSong", "Noto Serif SC", "SimSun", "serif"],
        sansBody: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        cardGlow: "0 0 25px rgba(214,228,255,0.18)",
      },
    },
  },
  plugins: [],
};
export default config;
