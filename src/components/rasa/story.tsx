"use client";
import { SITE_IMAGES } from "@/lib/site-images";

export default function Story() {
  return (
    <>
      <section className="py-16" style={{ background: "var(--ivory-2)", color: "#3a2733" }}>
        <div className="max-w-[1220px] mx-auto px-5 sm:px-7 grid md:grid-cols-[auto_1fr] gap-12 items-center">
          <div className="font-deva leading-[0.8]" style={{ fontSize: "clamp(6rem,12vw,10rem)", color: "var(--anaar)" }}>रस</div>
          <div>
            <div className="text-[0.72rem] font-semibold tracking-[0.32em] uppercase mb-2" style={{ color: "var(--anaar)" }}>रस · rasa</div>
            <h3 className="font-display text-[clamp(1.5rem,3vw,2.2rem)] mb-2" style={{ color: "#2c1a26" }}>Essence. Juice. Flavour. Feeling.</h3>
            <p className="text-[1.08rem] font-light max-w-[640px]" style={{ color: "var(--on-ivory-dim)" }}>
              In the old texts, <b style={{ color: "#2c1a26" }}>rasa</b> is the essence a dish leaves on the tongue — and the emotion
              it leaves on the heart. Ayurveda names <b style={{ color: "#2c1a26" }}>six tastes</b>; a table set well carries all of them.
              That balance, made hygienic and made affordable, is the whole of what we do.
            </p>
          </div>
        </div>
      </section>

      <section className="pt-[88px] pb-[104px]" id="story">
        <div className="max-w-[1220px] mx-auto px-5 sm:px-7">
          {/* Headline block — title then subhead, then the royal kitchen */}
          <div className="mb-8 max-w-[820px]">
            <div className="text-[0.72rem] font-semibold tracking-[0.32em] uppercase mb-3" style={{ color: "var(--gold)" }}>
              The Kitchen
            </div>
            <h2
              className="font-display mb-3"
              style={{ fontSize: "clamp(2rem,4.2vw,3.2rem)", color: "var(--ivory)", lineHeight: 1.12 }}
            >
              A hygienic &amp; royal kitchen
            </h2>
            <p
              className="font-display italic"
              style={{ fontSize: "clamp(1.25rem,2.6vw,1.85rem)", color: "var(--gold-bright)", lineHeight: 1.35 }}
            >
              Premium food, freed from a premium price.
            </p>
          </div>

          {/* Full showcase of the royal kitchen image */}
          <div
            className="relative rounded-lg overflow-hidden mb-14 group"
            style={{
              border: "1px solid rgba(226,182,88,.35)",
              boxShadow: "0 28px 60px -28px rgba(0,0,0,.65), 0 0 0 1px rgba(198,152,58,.08)",
            }}
          >
            <div className="relative w-full" style={{ aspectRatio: "16 / 9", minHeight: 280 }}>
              <img
                src={SITE_IMAGES.storyKitchen}
                alt="Rasa — a hygienic and royal professional kitchen"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                loading="lazy"
              />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(26,15,25,.18) 0%, transparent 28%, transparent 62%, rgba(26,15,25,.72) 100%)",
                }}
              />
              <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="text-[0.68rem] tracking-[0.22em] uppercase mb-1" style={{ color: "var(--gold-bright)" }}>
                    Where every plate begins
                  </div>
                  <div className="font-display text-[1.15rem] sm:text-[1.35rem]" style={{ color: "var(--ivory)" }}>
                    Hygienic craft · royal ambience
                  </div>
                </div>
                <div
                  className="text-[0.78rem] px-3 py-1.5 rounded-full"
                  style={{ border: "1px solid rgba(226,182,88,.4)", color: "rgba(246,239,224,.75)", background: "rgba(26,15,25,.45)" }}
                >
                  Fully hygienic · professionally run
                </div>
              </div>
            </div>
          </div>

          {/* Founder / brand narrative */}
          <div className="grid md:grid-cols-2 gap-[48px] lg:gap-[72px] items-start">
            <p className="font-display italic leading-[1.28]" style={{ fontSize: "clamp(1.55rem,2.6vw,2.15rem)", color: "var(--ivory)" }}>
              Somewhere along the way, fine catering grew <span style={{ color: "var(--gold-bright)" }}>heavy and expensive</span> —
              long on show, short on honesty. Rasa is the correction.
            </p>
            <div>
              <p className="mb-4 font-light text-[1.04rem]" style={{ color: "rgba(246,239,224,.62)" }}>
                Rasa is born from <b style={{ color: "var(--ivory)" }}>Narayanam</b>, one of the finest catering names in Jharkhand, trusted
                with premium weddings and corporate events across <b style={{ color: "var(--ivory)" }}>Jharkhand, Bengal, Chhattisgarh and Odisha</b>.
              </p>
              <p className="mb-4 font-light text-[1.04rem]" style={{ color: "rgba(246,239,224,.62)" }}>
                Its founder, <b style={{ color: "var(--ivory)" }}>Devendra Purohit</b>, is a food connoisseur whose work spans industrial
                kitchens, healthcare kitchens, restaurants, clubs and bars. He watched premium catering become bloated and costly — and set out to design something leaner and truer.
              </p>
              <p className="mb-6 font-light text-[1.04rem]" style={{ color: "rgba(246,239,224,.62)" }}>
                The idea is simple. Food worthy of the finest table, <b style={{ color: "var(--ivory)" }}>cooked in a fully hygienic kitchen
                by highly trained professional chefs</b>, and brought to your celebration without the markup.
              </p>
              <div className="pt-[26px] border-t" style={{ borderColor: "var(--paper-line)" }}>
                <div className="font-display text-[1.3rem]" style={{ color: "var(--gold-bright)" }}>Devendra Purohit</div>
                <div className="text-[0.82rem] tracking-[0.14em] uppercase mt-1" style={{ color: "rgba(246,239,224,.62)" }}>Founder · Narayanam Foods &amp; Catering</div>
              </div>
              <div className="flex flex-wrap gap-3 mt-7">
                {[
                  { b: "4 states", l: "served" },
                  { b: "Weddings", l: "& corporates" },
                  { b: "Hygienic", l: "royal kitchen" },
                ].map((c) => (
                  <span key={c.b} className="px-[18px] py-2 rounded-full text-[0.82rem]" style={{ border: "1px solid var(--paper-line)", color: "rgba(246,239,224,.62)" }}>
                    <b style={{ color: "var(--ivory)", fontWeight: 500 }}>{c.b}</b> {c.l}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
