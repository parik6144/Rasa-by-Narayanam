"use client";

const PILLARS = [
  { no: "i.", title: "A hygienic kitchen", body: "Food is prepared in a fully hygienic, professionally run kitchen — cleanliness is the first ingredient, never an afterthought." },
  { no: "ii.", title: "Trained chefs", body: "Highly trained professional chefs cook every dish, so consistency and craft show up on the plate at any scale." },
  { no: "iii.", title: "No-frill service", body: "We spend on the food and the people, not on theatrics you didn't ask for. Honest service, gracefully delivered." },
  { no: "iv.", title: "Fair rates", body: "Premium taste at the most affordable rates we can offer — the whole reason Rasa exists." },
];

export default function Promise() {
  return (
    <section className="py-[104px] ivory-gradient" id="promise" style={{ color: "#3a2733" }}>
      <div className="max-w-[1220px] mx-auto px-5 sm:px-7">
        <div className="mb-14 max-w-[720px]">
          <div className="text-[0.72rem] font-semibold tracking-[0.32em] uppercase mb-2" style={{ color: "var(--anaar)" }}>The Rasa Promise</div>
          <h2 className="font-display mb-4" style={{ fontSize: "clamp(2.1rem,4.4vw,3.5rem)", color: "#2c1a26" }}>Four things we refuse to compromise.</h2>
          <p className="text-[1.06rem] font-light" style={{ color: "var(--on-ivory-dim)" }}>
            Every plate that leaves our kitchen is held to the same four standards — whether it's the ₹699 table or the royal ₹1,499 one.
          </p>
        </div>
        <div className="grid md:grid-cols-4 border-t" style={{ borderColor: "var(--paper-line)" }}>
          {PILLARS.map((p, i) => (
            <div key={p.title} className="p-[38px_30px_34px] relative" style={{ borderRight: i < 3 ? "1px solid var(--paper-line)" : "none" }}>
              <div className="font-display italic text-[1rem]" style={{ color: "var(--gold)" }}>{p.no}</div>
              <h4 className="font-display text-[1.28rem] my-[0.9em_0_0.5em]" style={{ color: "#2c1a26" }}>{p.title}</h4>
              <p className="text-[0.94rem] font-light" style={{ color: "var(--on-ivory-dim)" }}>{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
