"use client";

import { cn } from "@/lib/utils";

type RubikLoaderProps = {
  label?: string;
  className?: string;
};

export function RubikLoader({ label = "Rubik is loading…", className }: RubikLoaderProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div className="rubik-cube">
        {Array.from({ length: 9 }).map((_, idx) => (
          <div key={idx} className="rubik-cell" />
        ))}
      </div>
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{label}</p>
      <style jsx>{`
        .rubik-cube {
          width: 40px;
          height: 40px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2px;
          padding: 3px;
          border-radius: 0.6rem;
          background: radial-gradient(circle at 0% 0%, #22d3ee, #0f172a);
          box-shadow: 0 0 18px rgba(56, 189, 248, 0.3);
          transform-style: preserve-3d;
          animation: rubik-rotate 1.4s ease-in-out infinite;
        }

        .rubik-cell {
          border-radius: 0.2rem;
          background: linear-gradient(135deg, #38bdf8, #22c55e);
          box-shadow: 0 0 6px rgba(148, 163, 184, 0.3) inset;
          animation: rubik-shift 1.4s ease-in-out infinite;
        }

        .rubik-cell:nth-child(2),
        .rubik-cell:nth-child(4),
        .rubik-cell:nth-child(6),
        .rubik-cell:nth-child(8) {
          background: linear-gradient(135deg, #22c55e, #f97316);
        }

        .rubik-cell:nth-child(1),
        .rubik-cell:nth-child(9) {
          background: linear-gradient(135deg, #f97316, #e11d48);
        }

        @keyframes rubik-rotate {
          0% {
            transform: rotateX(18deg) rotateY(-18deg);
          }
          25% {
            transform: rotateX(22deg) rotateY(18deg);
          }
          50% {
            transform: rotateX(-12deg) rotateY(26deg);
          }
          75% {
            transform: rotateX(-16deg) rotateY(-14deg);
          }
          100% {
            transform: rotateX(18deg) rotateY(-18deg);
          }
        }

        @keyframes rubik-shift {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }
          25% {
            transform: translate3d(0.5px, -0.5px, 0);
          }
          50% {
            transform: translate3d(-0.5px, 0.5px, 0);
          }
          75% {
            transform: translate3d(0.5px, 0.5px, 0);
          }
        }
      `}</style>
    </div>
  );
}


