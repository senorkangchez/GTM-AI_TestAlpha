import type { Band } from "@/lib/types";
import { BAND_CLASSES, BAND_LABEL } from "@/lib/format";

export function BandPill({ band }: { band: Band }) {
  const c = BAND_CLASSES[band];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${c.soft}`}>
      {BAND_LABEL[band]}
    </span>
  );
}

export function BandDot({ band }: { band: Band }) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${BAND_CLASSES[band].bg}`} />;
}
