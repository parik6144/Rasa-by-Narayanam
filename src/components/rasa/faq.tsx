"use client";
import { useState } from "react";
import { Plus } from "lucide-react";

const FAQS = [
  { q: "How does the booking process work?", a: "Send us an enquiry with your date, guest count and occasion — or build a menu right here and share it on WhatsApp or email. We confirm a transparent per-guest quotation, and our team handles setup and service on the day." },
  { q: "Is there a minimum guest requirement?", a: "Yes — the minimum order is 100 guests. If your guaranteed count is below 100, the event is billed at the 100-guest minimum. The guaranteed count cannot be reduced once confirmed, and we prepare for up to 105% of it." },
  { q: "How much advance payment is required?", a: "25% advance is due at the time of booking, 50% one week before the event, and the balance so that 100% is cleared before the event day." },
  { q: "What is the cancellation policy?", a: "Once a booking is confirmed, the guaranteed guest count cannot be reduced. For cancellations or date changes, please contact us as early as possible — we'll do our best to accommodate you, and specific terms are confirmed at the time of booking." },
  { q: "Which areas do you serve?", a: "Rasa by Narayanam serves premium weddings and corporate events across Jharkhand, Bengal, Chhattisgarh and Odisha. Bookings are currently centred on Jamshedpur and the surrounding 200km radius." },
  { q: "Can the menu be customised?", a: "Absolutely. Every package allows you to pick dishes course by course. You can also add custom dishes not listed in our menu — our chef will review and confirm them with pricing. Menu can be modified until 15 days before the event." },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="py-[104px] ivory-gradient" id="faq" style={{ color: "#3a2733" }}>
      <div className="max-w-[820px] mx-auto px-5 sm:px-7">
        <div className="mb-12 text-center">
          <div className="text-[0.72rem] font-semibold tracking-[0.32em] uppercase mb-2" style={{ color: "var(--anaar)" }}>Good to Know</div>
          <h2 className="font-display" style={{ fontSize: "clamp(2.1rem,4.4vw,3.5rem)", color: "#2c1a26" }}>Frequently asked questions.</h2>
        </div>
        <div className="space-y-3">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={i} className="rounded-lg overflow-hidden" style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(198,152,58,0.25)" }}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full text-left p-5 flex items-center justify-between gap-4"
                >
                  <span className="font-display text-[1.08rem]" style={{ color: "#2c1a26" }}>{f.q}</span>
                  <Plus className={`w-5 h-5 flex-shrink-0 transition-transform ${isOpen ? "rotate-45" : ""}`} style={{ color: "var(--gold)" }} />
                </button>
                <div
                  className="overflow-hidden transition-all"
                  style={{ maxHeight: isOpen ? "300px" : "0", opacity: isOpen ? 1 : 0 }}
                >
                  <div className="px-5 pb-5 text-[0.94rem] font-light" style={{ color: "var(--on-ivory-dim)" }}>{f.a}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
