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
    return Array.from({ length: 25 }, (_, i) => {
      const r1 = seededRandom(i * 3 + 1);
      const r2 = seededRandom(i * 3 + 2);
      const r3 = seededRandom(i * 3 + 3);
      const r4 = seededRandom(i * 7 + 4);
      const r5 = seededRandom(i * 11 + 5);
      const sizePx = 6 + r1 * 8; // 6–14px
      return {
        id: i,
        left: `${r2 * 100}%`,
        size: `${sizePx}px`,
        duration: 8 + r3 * 12, // 8–20s
        delay: -(r4 * 20),     // -20s to 0s
        opacity: 0.5 + r5 * 0.2, // 0.5–0.7
      };
    });
  }, []);

  return (
    <>
      <style>{`
        @keyframes snowfall {
          0%   { transform: translateY(-10px) translateX(0px); opacity: 0; }
          10%  { opacity: 0.7; }
          90%  { opacity: 0.5; }
          100% { transform: translateY(100vh) translateX(30px); opacity: 0; }
        }
      `}</style>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          overflow: "hidden",
        }}
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
              background: "white",
              opacity: flake.opacity,
              animation: `snowfall ${flake.duration}s linear ${flake.delay}s infinite`,
            }}
          />
        ))}
      </div>
    </>
  );
}
