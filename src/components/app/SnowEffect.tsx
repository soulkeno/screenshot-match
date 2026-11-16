import { useMemo } from "react";

interface Snowflake {
  id: number;
  left: string;
  size: string;
  duration: number;
  delay: number;
  opacity: number;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function SnowEffect() {
  const snowflakes = useMemo<Snowflake[]>(() => {
    return Array.from({ length: 35 }, (_, i) => {
      const r1 = seededRandom(i * 3 + 1);
      const r2 = seededRandom(i * 3 + 2);
      const r3 = seededRandom(i * 3 + 3);
      const r4 = seededRandom(i * 7 + 4);
      const r5 = seededRandom(i * 11 + 5);
      const sizePx = 3 + r1 * 8; // 3–11px
      return {
        id: i,
        left: `${r2 * 100}%`,
        size: `${sizePx}px`,
        duration: 7 + r3 * 10, // 7–17s
        delay: -(r4 * 20),     // -20s to 0s
        opacity: 0.35 + r5 * 0.45, // 0.35–0.8
      };
    });
  }, []);

  return (
    <>
      <style>{`
        @keyframes snowfall {
          0%   { transform: translateY(-20px) translateX(0px); opacity: 0; }
          15%  { opacity: 0.8; }
          50%  { transform: translateY(50vh) translateX(15px); }
          85%  { opacity: 0.6; }
          100% { transform: translateY(105vh) translateX(-10px); opacity: 0; }
        }
      `}</style>
      <div
        className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
        aria-hidden="true"
      >
        {snowflakes.map((flake) => (
          <span
            key={flake.id}
            style={{
              position: "absolute",
              left: flake.left,
              top: 0,
              width: flake.size,
              height: flake.size,
              borderRadius: "50%",
              background: "radial-gradient(circle, #ffffff 40%, rgba(255,255,255,0.4) 100%)",
              boxShadow: "0 0 6px rgba(255,255,255,0.8)",
              opacity: flake.opacity,
              animation: `snowfall ${flake.duration}s ease-in-out ${flake.delay}s infinite`,
            }}
          />
        ))}
      </div>
    </>
  );
}
