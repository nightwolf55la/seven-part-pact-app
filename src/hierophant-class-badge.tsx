import { isValidHierophantBuiltinClassId, type HierophantBuiltinClassId } from "../shared/domain";

const CLASS_BADGE_TONE: Record<HierophantBuiltinClassId, string> = {
  peasant: "border-stone-500/70 bg-stone-100 text-stone-800 dark:border-stone-400/60 dark:bg-stone-900 dark:text-stone-100",
  artisan: "border-teal-700/55 bg-teal-50 text-teal-950 dark:border-teal-400/50 dark:bg-teal-950/70 dark:text-teal-50",
  merchant: "border-yellow-800/50 bg-yellow-50 text-yellow-950 dark:border-yellow-500/45 dark:bg-yellow-950/60 dark:text-yellow-50",
  gentry: "border-violet-800/50 bg-violet-50 text-violet-950 dark:border-violet-400/50 dark:bg-violet-950/70 dark:text-violet-50",
  pariah: "border-lime-900/45 bg-lime-50 text-lime-950 dark:border-lime-500/40 dark:bg-lime-950/60 dark:text-lime-50",
};

const FALLBACK_TONE =
  "border-slate-500/60 bg-slate-100 text-slate-800 dark:border-slate-400/50 dark:bg-slate-900 dark:text-slate-100";

export default function HierophantClassBadge({
  classId,
  label,
}: {
  readonly classId: string;
  readonly label: string;
}) {
  const tone = isValidHierophantBuiltinClassId(classId) ? CLASS_BADGE_TONE[classId] : FALLBACK_TONE;
  return (
    <span
      data-class-badge={classId}
      className={`inline-flex items-center rounded-sm border px-1 py-px text-[10px] font-semibold uppercase tracking-wide ${tone}`}
    >
      {label}
    </span>
  );
}
