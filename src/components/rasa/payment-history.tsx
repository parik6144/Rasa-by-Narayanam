import { CONFIG } from "@/lib/rasa-data";

export type PaymentLine = {
  id: string;
  amount: number; // paise
  method: string;
  status: string;
  gateway: string;
  note?: string | null;
  proofUrl?: string | null;
  createdAt: string;
  confirmedAt?: string | null;
};

function gatewayLabel(gateway: string, method: string) {
  if (gateway === "stripe") return "Stripe (card)";
  if (gateway === "upi_manual") return "UPI (Paytm / GPay / PhonePe)";
  if (gateway === "mock") return "Recorded (legacy)";
  return `${gateway} / ${method}`;
}

function statusStyle(status: string): { bg: string; color: string } {
  if (status === "success") return { bg: "rgba(31,122,92,.2)", color: "#7dba9a" };
  if (status === "pending") return { bg: "rgba(198,152,58,.2)", color: "var(--gold)" };
  return { bg: "rgba(156,42,56,.2)", color: "var(--anaar-bright)" };
}

export default function PaymentHistory({
  payments,
  theme = "dark",
  title = "Payment history",
}: {
  payments: PaymentLine[];
  theme?: "dark" | "light";
  title?: string;
}) {
  if (!payments?.length) {
    return (
      <div
        className="text-xs py-2"
        style={{ color: theme === "light" ? "var(--on-ivory-dim)" : "rgba(246,239,224,.55)" }}
      >
        No payments recorded yet for this order.
      </div>
    );
  }

  const sorted = [...payments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const muted = theme === "light" ? "var(--on-ivory-dim)" : "rgba(246,239,224,.55)";
  const text = theme === "light" ? "#2c1a26" : "var(--ivory)";
  const border = theme === "light" ? "rgba(58,39,51,.12)" : "var(--paper-line)";
  const rowBg = theme === "light" ? "rgba(47,30,47,.04)" : "rgba(246,239,224,.04)";

  const fmt = (paise: number) =>
    "₹" + (paise / 100).toLocaleString("en-IN");

  return (
    <div className="space-y-2">
      <div
        className="text-[0.68rem] tracking-[0.2em] uppercase font-semibold"
        style={{ color: theme === "light" ? "var(--gold)" : "var(--gold)" }}
      >
        {title}
      </div>
      {sorted.map((p) => {
        const st = statusStyle(p.status);
        return (
          <div
            key={p.id}
            className="flex flex-wrap items-start justify-between gap-2 p-3 rounded-md text-sm"
            style={{ background: rowBg, border: `1px solid ${border}` }}
          >
            <div className="min-w-0 flex-1">
              <div className="font-semibold" style={{ color: text }}>
                {fmt(p.amount)}
                <span
                  className="ml-2 text-[0.65rem] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold"
                  style={st}
                >
                  {p.status}
                </span>
              </div>
              <div className="text-xs mt-0.5" style={{ color: muted }}>
                {gatewayLabel(p.gateway, p.method)}
                {p.note ? ` · ${p.note}` : ""}
              </div>
              <div className="text-[0.7rem] mt-0.5" style={{ color: muted }}>
                {new Date(p.createdAt).toLocaleString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {p.confirmedAt
                  ? ` · confirmed ${new Date(p.confirmedAt).toLocaleDateString("en-IN")}`
                  : ""}
              </div>
            </div>
            {p.proofUrl && (
              <a
                href={p.proofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[0.66rem] font-semibold px-2 py-1 rounded"
                style={{
                  color: theme === "light" ? "#2c1a26" : "var(--gold-bright)",
                  border: `1px solid ${border}`,
                }}
              >
                Proof
              </a>
            )}
          </div>
        );
      })}
      <div className="text-[0.7rem]" style={{ color: muted }}>
        Questions? Call {CONFIG.phoneDisplay}
      </div>
    </div>
  );
}
