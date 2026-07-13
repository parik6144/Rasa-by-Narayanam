"use client";

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

      <section className="py-[104px]" id="story">
        <div className="max-w-[1220px] mx-auto px-5 sm:px-7">
          <div className="mb-14 max-w-[720px]">
            <div className="text-[0.72rem] font-semibold tracking-[0.32em] uppercase mb-2" style={{ color: "var(--gold)" }}>The Story</div>
            <h2 className="font-display text-[clamp(2.1rem,4.4vw,3.5rem)]" style={{ color: "var(--ivory)" }}>Premium food, freed from a premium price.</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-[72px] items-start">
            <p className="font-display italic leading-[1.28]" style={{ fontSize: "clamp(1.6rem,2.8vw,2.3rem)", color: "var(--ivory)" }}>
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
                  { b: "Hygienic", l: "pro kitchen" },
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
