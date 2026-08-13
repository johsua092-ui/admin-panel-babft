import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // nhentai-inspired dark palette (no purple/neon, no gradients)
        bg: {
          base: "#0f0f14",
          panel: "#16161c",
          panel2: "#1c1c24",
          border: "#26262e",
        },
        fg: {
          primary: "#e6e6e9",
          muted: "#9a9aa3",
          dim: "#6b6b75",
        },
        accent: {
          DEFAULT: "#c0392b", // deep red — nhentai signature
          hover: "#a93226",
          soft: "#2a1d1c",
        },
        ok: "#2ecc71",
        warn: "#f39c12",
        danger: "#e74c3c",
        info: "#3498db",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "Menlo", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
    },
  },
  plugins: [],
};

export default config;
