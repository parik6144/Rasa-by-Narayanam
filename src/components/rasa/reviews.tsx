"use client";
import { Star } from "lucide-react";

const REVIEWS = [
  { rating: 5, text: "The food tasted premium in every bite, yet the price left us genuinely surprised. Guests are still talking about the live chaat counter.", name: "Ananya & Rohit", event: "Wedding · Jamshedpur" },
  { rating: 5, text: "Spotless setup, warm service and a menu that felt truly royal. Narayanam's team handled 600 guests without a single hiccup.", name: "S. Agarwal", event: "Reception · Ranchi" },
  { rating: 5, text: "We booked for a corporate evening — professional, punctual, and the mithai studio was the highlight of the night. Will book again.", name: "Meghdoot Industries", event: "Corporate event · Bokaro" },
];

const GALLERY = [
  { src: "/gallery-0.jpg", alt: "Live Chaat Counter — Rasa by Narayanam", label: "Live Chaat Counter" },
  { src: "/gallery-1.jpg", alt: "The Royal Thali — Rasa by Narayanam", label: "The Royal Thali" },
  { src: "/gallery-2.jpg", alt: "Mithai Studio — Rasa by Narayanam", label: "Mithai Studio" },
  { src: "/gallery-3.jpg", alt: "Global Live Stations — Rasa by Narayanam", label: "Global Live Stations" },
];

export default function Reviews() {
  return (
    <section className="py-[104px]" id="reviews">
      <div className="max-w-[1220px] mx-auto px-5 sm:px-7">
        <div className="mb-14 max-w-[720px]">
          <div className="text-[0.72rem] font-semibold tracking-[0.32em] uppercase mb-2" style={{ color: "var(--gold)" }}>Kind Words</div>
          <h2 className="font-display mb-4" style={{ fontSize: "clamp(2.1rem,4.4vw,3.5rem)", color: "var(--ivory)" }}>Tables we've had the honour to serve.</h2>
          <p className="text-[1.06rem] font-light" style={{ color: "rgba(246,239,224,.62)" }}>
            From grand weddings to intimate gatherings across Jharkhand, Bengal, Chhattisgarh and Odisha.
          </p>
        </div>

        {/* Reviews */}
        <div className="grid md:grid-cols-3 gap-[22px] mb-16">
          {REVIEWS.map((r, i) => (
            <div key={i} className="glossy-card rounded-lg p-7">
              <div className="flex gap-1 mb-4">
                {Array.from({ length: r.rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-current" style={{ color: "var(--gold-bright)" }} />
                ))}
              </div>
              <p className="text-[0.96rem] font-light italic mb-5" style={{ color: "var(--ivory)" }}>"{r.text}"</p>
              <div className="pt-4 border-t" style={{ borderColor: "var(--paper-line)" }}>
                <div className="font-display text-[1.05rem]" style={{ color: "var(--gold-bright)" }}>{r.name}</div>
                <div className="text-[0.78rem] mt-0.5" style={{ color: "rgba(246,239,224,.5)" }}>{r.event}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Gallery — real food photos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {GALLERY.map((g, i) => (
            <div key={i} className="relative rounded-lg overflow-hidden group" style={{ aspectRatio: "4/3", border: "1px solid var(--paper-line)" }}>
              <img
                src={g.src}
                alt={g.alt}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 flex items-end" style={{ background: "linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.7) 100%)" }}>
                <span className="p-3 text-[0.86rem] font-medium" style={{ color: "#fff" }}>{g.label}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <div className="text-[0.82rem] font-light" style={{ color: "rgba(246,239,224,.5)" }}>
            A glimpse of Rasa — live chaat &amp; global stations, our Rajasthani Royal Thali and the Mithai Studio, all crafted fresh at your celebration.
          </div>
        </div>
      </div>
    </section>
  );
}
