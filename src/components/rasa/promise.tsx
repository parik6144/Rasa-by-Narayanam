"use client";
import { SITE_IMAGES } from "@/lib/site-images";

const PILLARS = [
  { no: "i.", title: "A hygienic kitchen", body: "Food is prepared in a fully hygienic, professionally run kitchen — cleanliness is the first ingredient, never an afterthought.", img: SITE_IMAGES.storyKitchen },
  { no: "ii.", title: "Trained chefs", body: "Highly trained professional chefs cook every dish, so consistency and craft show up on the plate at any scale.", img: SITE_IMAGES.promiseChef },
  { no: "iii.", title: "No-frill service", body: "We spend on the food and the people, not on theatrics you didn't ask for. Honest service, gracefully delivered.", img: SITE_IMAGES.howService },
  { no: "iv.", title: "Fair rates", body: "Premium taste at the most affordable rates we can offer — the whole reason Rasa exists.", img: SITE_IMAGES.packages["rasa-utsav-799"] },
];

export default function Promise() {
  return (
    <section className="py-[104px] ivory-gradient" id="promise" style={{ color: "#3a2733" }}>
      <div className="max-w-[1220px] mx-auto px-5 sm:px-7">
        <div className="mb-14 max-w-[720px]">
          <div className="text-[0.72rem] font-semibold tracking-[0.32em] uppercase mb-2" style={{ color: "var(--anaar)" }}>The Rasa Promise</div>
          <h2 className="font-display mb-4" style={{ fontSize: "clamp(2.1rem,4.4vw,3.5rem)", color: "#2c1a26" }}>Four things we refuse to compromise.</h2>
          <p className="text-[1.06rem] font-light" style={{ color: "var(--on-ivory-dim)" }}>
            Every plate that leaves our kitchen is held to the same four standards — whether it&apos;s the ₹699 table or the royal ₹1,499 one.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PILLARS.map((p) => (
            <div
              key={p.title}
              className="rounded-lg overflow-hidden flex flex-col"
              style={{ background: "rgba(255,255,255,.45)", border: "1px solid var(--paper-line)" }}
            >
              <div className="relative h-[140px] overflow-hidden">
                <img src={p.img} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 40%, rgba(44,26,38,.55) 100%)" }} />
              </div>
              <div className="p-[22px_22px_26px] flex-1">
                <div className="font-display italic text-[1rem]" style={{ color: "var(--gold)" }}>{p.no}</div>
                <h4 className="font-display text-[1.22rem] my-[0.55em_0_0.45em]" style={{ color: "#2c1a26" }}>{p.title}</h4>
                <p className="text-[0.92rem] font-light" style={{ color: "var(--on-ivory-dim)" }}>{p.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
