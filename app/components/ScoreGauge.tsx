import { useEffect, useRef, useState } from "react";

// SVG dasharray/dashoffset of 0 renders as a solid, fully-visible stroke —
// not hidden. Starting pathLength at a value larger than the real arc
// length guarantees the arc renders empty on the very first paint, before
// getTotalLength() has a chance to measure the actual path.
const SENTINEL_LENGTH = 1000;

const ScoreGauge = ({ score = 75 }: { score: number }) => {
  const [pathLength, setPathLength] = useState(SENTINEL_LENGTH);
  const [animatedScore, setAnimatedScore] = useState(0);
  const pathRef = useRef<SVGPathElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;

    const length = path.getTotalLength();
    setPathLength(length);
    setAnimatedScore(0);

    // Animated manually with requestAnimationFrame rather than a CSS
    // transition — a CSS transition on dashoffset was unreliable here since
    // the offset briefly jumps when pathLength updates from the sentinel to
    // its real value, causing a visible flash/retraction on load.
    const duration = 1200;
    let startTime: number | null = null;

    const step = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic

      setAnimatedScore(Math.round(eased * score));

      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [score]);

  const percentage = animatedScore / 100;
  const dashOffset = pathLength - pathLength * percentage;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-40 h-20">
        <svg viewBox="0 0 100 50" className="w-full h-full">
          <defs>
            <linearGradient
              id="gaugeGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>

          <path
            d="M10,50 A40,40 0 0,1 90,50"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="10"
            strokeLinecap="round"
          />

          <path
            ref={pathRef}
            d="M10,50 A40,40 0 0,1 90,50"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={pathLength}
            strokeDashoffset={dashOffset}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
          <div className="text-xl font-semibold pt-4">{animatedScore}/100</div>
        </div>
      </div>
    </div>
  );
};

export default ScoreGauge;
