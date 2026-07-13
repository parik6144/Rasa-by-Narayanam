"use client";

const WHY_POINTS = [
  { title: "No middlemen, no venue commission", body: "We work direct with you — nothing is quietly added on top." },
  { title: "We spend on food & chefs, not theatrics", body: "Ingredients and skilled hands get the budget — not showpieces you didn't ask for." },
  { title: "One hygienic central kitchen", body: "Efficient, professionally run preparation keeps quality high and cost sensible." },
  { title: "Transparent per-guest pricing", body: "What you see in your quotation is what you pay — GST shown, no surprises." },
];

export default function WhyRasa() {
  return (
    <section className="py-[104px]" id="why">
      <div className="max-w-[1220px] mx-auto px-5 sm:px-7">
        <div className="mb-10 max-w-[720px]">
          <div className="text-[0.72rem] font-semibold tracking-[0.32em] uppercase mb-2" style={{ color: "var(--gold)" }}>Honest Pricing</div>
          <h2 className="font-display mb-4" style={{ fontSize: "clamp(2.1rem,4.4vw,3.5rem)", color: "var(--ivory)" }}>Why Rasa costs less.</h2>
          <p className="text-[1.06rem] font-light" style={{ color: "rgba(246,239,224,.62)" }}>
            Not by cutting corners on food — but by cutting everything that was never about the food. The savings come from removing unnecessary frills, never from compromising on the quality, freshness or craft of what reaches your plate.
          </p>
        </div>

        <p className="mb-10 max-w-[420px] font-display italic text-[clamp(1.15rem,2.4vw,1.55rem)]" style={{ color: "var(--ivory)" }}>
          One kitchen. Direct to your celebration.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-[22px]">
          {WHY_POINTS.map((p, i) => (
            <div key={i} className="glossy-card rounded-lg p-7">
              <div className="font-display italic text-[1rem] mb-3" style={{ color: "var(--gold)" }}>{["i.", "ii.", "iii.", "iv."][i]}</div>
              <h4 className="font-display text-[1.18rem] mb-2" style={{ color: "var(--ivory)" }}>{p.title}</h4>
              <p className="text-[0.92rem] font-light" style={{ color: "rgba(246,239,224,.62)" }}>{p.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 p-6 rounded-lg" style={{ background: "rgba(198,152,58,.06)", border: "1px solid var(--paper-line)" }}>
          <p className="text-[0.95rem] font-light text-center" style={{ color: "rgba(246,239,224,.72)" }}>
            The same four standards apply to every plate — from the <b style={{ color: "var(--gold-bright)" }}>₹699</b> table to the royal <b style={{ color: "var(--gold-bright)" }}>₹1,499</b> one:
            <br />a hygienic kitchen, trained chefs, no-frill service, and fair rates.
          </p>
        </div>
      </div>
    </section>
  );
}
