import type { Scored } from "@/lib/types";
import { BAND_HEX, BAND_LABEL, signed } from "@/lib/format";

/** SVG ring gauge: 0-100 colored by band, with a week-over-week delta. */
export function ScoreRing({
  score,
  prior,
  size = 132,
}: {
  score: Scored;
  prior?: Scored;
  size?: number;
}) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score.total)) / 100;
  const hex = BAND_HEX[score.band];
  const delta = prior ? score.total - prior.total : null;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={hex}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="central"
          textAnchor="middle"
          className="rotate-90 fill-foreground"
          style={{ transformOrigin: "center", fontSize: 30, fontWeight: 700 }}
        >
          {score.total}
        </text>
      </svg>
      <div className="mt-2 flex items-center gap-2 text-sm">
        <span className="font-medium" style={{ color: hex }}>
          {BAND_LABEL[score.band]}
        </span>
        {delta !== null && delta !== 0 && (
          <span className={delta > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
            {signed(delta)} WoW
          </span>
        )}
      </div>
    </div>
  );
}
