"use client";
import { useState } from "react";
import { Plus } from "lucide-react";

const FAQS = [
  { q: "How does the booking process work?", a: "Send an enquiry with date, guests and occasion — or build a menu here and share on WhatsApp. We confirm a clear per-guest quote; our team handles setup and service." },
  { q: "Is there a minimum guest requirement?", a: "Yes — minimum 100 guests. Below that, billing is still at 100. Guaranteed count can’t be reduced once confirmed; we prepare for up to 105% of it." },
  { q: "How much advance payment is required?", a: "25% at booking, 50% one week before the event, and the balance so 100% is cleared before event day." },
  { q: "What is the cancellation policy?", a: "After confirmation the guest count can’t be reduced. For cancellations or date changes, contact us early — terms are confirmed at booking." },
  { q: "Which areas do you serve?", a: "Jharkhand, Bengal, Chhattisgarh and Odisha — centred on Jamshedpur and about 200km around." },
  { q: "Can the menu be customised?", a: "Yes. Pick dishes course by course, add custom dishes for chef review, and edit until 15 days before the event." },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="py-16 md:py-20 ivory-gradient" id="faq" style={{ color: "#3a2733" }}>
      <div className="max-w-[1100px] mx-auto px-5 sm:px-7">
        <div className="mb-8 text-center">
          <div className="text-[0.72rem] font-semibold tracking-[0.32em] uppercase mb-2" style={{ color: "var(--anaar)" }}>Good to Know</div>
          <h2 className="font-display" style={{ fontSize: "clamp(1.9rem,3.8vw,2.8rem)", color: "#2c1a26" }}>Frequently asked questions.</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-x-6 gap-y-2.5">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div
                key={i}
                className="rounded-md overflow-hidden self-start"
                style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(198,152,58,0.25)" }}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full text-left px-4 py-3 flex items-center justify-between gap-3"
                >
                  <span className="font-display text-[0.98rem] leading-snug" style={{ color: "#2c1a26" }}>{f.q}</span>
                  <Plus className={`w-4 h-4 flex-shrink-0 transition-transform ${isOpen ? "rotate-45" : ""}`} style={{ color: "var(--gold)" }} />
                </button>
                {isOpen && (
                  <div className="px-4 pb-3.5 text-[0.88rem] font-light leading-relaxed" style={{ color: "var(--on-ivory-dim)" }}>
                    {f.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
