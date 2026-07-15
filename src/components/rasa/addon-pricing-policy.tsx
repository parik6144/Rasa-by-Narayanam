"use client";
import {
  ADDON_PRICING_POLICY_TITLE,
  ADDON_PRICING_POLICY_POINTS,
} from "@/lib/addon-pricing";

type Theme = "light" | "dark";

/**
 * Formal add-on pricing policy block for booking extras / review / quotation.
 */
export default function AddonPricingPolicy({
  theme = "light",
  selectedCount,
  guests,
}: {
  theme?: Theme;
  selectedCount?: number;
  guests?: number;
}) {
  const isDark = theme === "dark";
  const titleColor = isDark ? "var(--gold-bright)" : "#2c1a26";
  const bodyColor = isDark ? "rgba(246,239,224,.88)" : "var(--on-ivory-dim)";
  const labelColor = isDark ? "var(--ivory)" : "#2c1a26";
  const iconColor = isDark ? "var(--gold-bright)" : "var(--gold)";
  const boxStyle = isDark
    ? {
        background: "rgba(198,152,58,.14)",
        border: "1px solid rgba(226,182,88,.4)",
      }
    : {
        background: "rgba(198,152,58,.12)",
        border: "1px solid rgba(198,152,58,.35)",
      };

  return (
    <div className="rounded-lg p-3.5 text-sm flex items-start gap-2.5" style={boxStyle}>
      <span
        className="mt-0.5 flex-shrink-0 text-[0.95rem] font-bold leading-none"
        style={{ color: iconColor }}
        aria-hidden
      >
        ⓘ
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-semibold mb-2" style={{ color: titleColor }}>
          {ADDON_PRICING_POLICY_TITLE}
        </div>
        {(guests != null || selectedCount != null) && (
          <p className="mb-2 text-[0.8rem]" style={{ color: bodyColor }}>
            {guests != null && (
              <>
                Your party: <b style={{ color: labelColor }}>{guests.toLocaleString("en-IN")} guests</b>
              </>
            )}
            {guests != null && selectedCount != null && " · "}
            {selectedCount != null && (
              <>
                Selected: <b style={{ color: labelColor }}>{selectedCount} extra(s)</b>
              </>
            )}
          </p>
        )}
        <ul className="space-y-2 m-0 p-0 list-none">
          {ADDON_PRICING_POLICY_POINTS.map((p) => (
            <li key={p.label} style={{ color: bodyColor }}>
              <b style={{ color: labelColor }}>{p.label}:</b> {p.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
