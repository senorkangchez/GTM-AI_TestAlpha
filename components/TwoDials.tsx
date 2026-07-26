import type { ProgressionScore, Scored } from "@/lib/types";
import { BAND_HEX, BAND_LABEL } from "@/lib/format";

function Gauge({
  value,
  color,
  caption,
  sub,
}: {
  value: number;
  color: string;
  caption: string;
  sub: string;
}) {
  const size = 132;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value)) / 100;
  return (
    <div className="flex flex-col items-center text-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
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
          {value}
        </text>
      </svg>
      <div className="mt-2 font-medium" style={{ color }}>
        {caption}
      </div>
      <div className="text-xs text-muted">{sub}</div>
    </div>
  );
}

/** The two dials, explicitly allowed to disagree: how far along vs how healthy. */
export function TwoDials({
  progression,
  health,
}: {
  progression: ProgressionScore;
  health: Scored;
}) {
  const accent = "var(--accent)";
  return (
    <div className="card p-5">
      <div className="grid grid-cols-2 gap-4">
        <Gauge
          value={progression.progression}
          color={accent}
          caption={`Progression · ${progression.label}`}
          sub="how far along"
        />
        <Gauge
          value={health.total}
          color={BAND_HEX[health.band]}
          caption={`Health · ${BAND_LABEL[health.band]}`}
          sub="how well it's going"
        />
      </div>
      <p className="mt-4 text-center text-sm text-muted">
        A deal can be <span className="text-foreground font-medium">far along</span> and{" "}
        <span className="text-foreground font-medium">unhealthy</span> at the same time. When these
        disagree, that gap is the story.
      </p>
    </div>
  );
}
