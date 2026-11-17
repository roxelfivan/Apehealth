import { useTranslator } from "@/lib/i18n/useTranslator";
import { formatGrams, formatKcal } from "@/lib/nutrition";
import type { FoodItem } from "@/lib/types";

type Props = {
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  items: FoodItem[];
};

function MacroIcon({ kind }: { kind: "calories" | "protein" | "carbs" | "fat" }) {
  const className = "h-5 w-5";
  if (kind === "calories") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden>
        <path
          fill="currentColor"
          d="M12 21c-4.4-2.6-7.5-6.1-7.5-9.7C4.5 8.2 6.9 6 9.4 6c1.4 0 2.6.7 3.4 1.8C13.6 6.7 14.8 6 16.2 6c2.5 0 4.9 2.2 4.9 5.3C21.1 14.9 18 18.4 12 21Z"
        />
      </svg>
    );
  }
  if (kind === "protein") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden>
        <path
          fill="currentColor"
          d="M4.5 13.2c1.8-3.8 4.1-5.8 7.5-7.7 3.4 1.9 5.7 3.9 7.5 7.7-1.4 3.6-4.1 6-7.5 6s-6.1-2.4-7.5-6Zm7.5-1.4a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4Z"
        />
      </svg>
    );
  }
  if (kind === "carbs") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden>
        <path
          fill="currentColor"
          d="M12 3c2.6 1.8 4.8 4.5 6 8.2-1.5.6-3.7 1-6 1s-4.5-.4-6-1C7.2 7.5 9.4 4.8 12 3Zm-7 11.3c1.8.7 4.3 1.2 7 1.2s5.2-.5 7-1.2c-.5 3.7-3.4 6.7-7 6.7s-6.5-3-7-6.7Z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M8 5.5c0-1.4 1.1-2.5 2.5-2.5S13 4.1 13 5.5V8h4.2c.7 0 1.3.6 1.3 1.3 0 3.7-2.2 8.2-6.5 9.6v1.6h-2v-1.6C5.7 17.5 3.5 13 3.5 9.3 3.5 8.6 4.1 8 4.8 8H8V5.5Z"
      />
    </svg>
  );
}

function MacroCell({
  kind,
  label,
  value,
  color,
}: {
  kind: "calories" | "protein" | "carbs" | "fat";
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1 text-center">
      <p className="text-sm font-semibold tabular-nums sm:text-base" style={{ color }}>
        {value}
      </p>
      <span style={{ color }}>
        <MacroIcon kind={kind} />
      </span>
      <p className="text-[11px] text-[var(--muted)]">{label}</p>
    </div>
  );
}

export function NutritionBreakdown({ calories, protein, carbs, fat, items }: Props) {
  const { t } = useTranslator();
  const hasMacros = protein != null || carbs != null || fat != null;
  if (!hasMacros && items.length === 0) return null;

  return (
    <section className="space-y-4">
      {hasMacros && (
        <div className="grid grid-cols-4 gap-2 rounded-[1.4rem] border border-[var(--line)] bg-[var(--card)] px-2 py-4">
          <MacroCell
            kind="calories"
            label={t("nutrition.calories")}
            value={formatKcal(calories)}
            color="var(--foreground)"
          />
          <MacroCell
            kind="protein"
            label={t("nutrition.protein")}
            value={protein == null ? "—" : formatGrams(protein)}
            color="var(--protein)"
          />
          <MacroCell
            kind="carbs"
            label={t("nutrition.carb")}
            value={carbs == null ? "—" : formatGrams(carbs)}
            color="var(--carb)"
          />
          <MacroCell
            kind="fat"
            label={t("nutrition.fat")}
            value={fat == null ? "—" : formatGrams(fat)}
            color="var(--fat)"
          />
        </div>
      )}

      {items.length > 0 && (
        <div className="overflow-hidden rounded-[1.4rem] border border-[var(--line)] bg-[var(--chip)]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-[13px] font-semibold">
                <th className="px-4 py-3">{t("nutrition.foodItem")}</th>
                <th className="px-2 py-3 text-right">{t("nutrition.calories")}</th>
                <th className="px-4 py-3 text-right">{t("nutrition.carbsColumn")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr
                  key={`${item.name}-${index}`}
                  className={index % 2 === 0 ? "bg-[var(--card)]" : "bg-transparent"}
                >
                  <td className="px-4 py-2.5">{item.name}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums text-[var(--muted)]">
                    {formatKcal(item.calories, true)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-[var(--muted)]">
                    {formatGrams(item.carbs)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
