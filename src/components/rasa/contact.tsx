"use client";
import { useState } from "react";
import { CONFIG } from "@/lib/rasa-data";
import { useCatalog } from "@/store/catalog-store";
import { Phone, Mail, Instagram, MapPin, Send, AlertCircle, MessageCircle } from "lucide-react";
import { SITE_IMAGES } from "@/lib/site-images";

export default function Contact() {
  const { packages } = useCatalog();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    eventDate: "",
    guests: "",
    city: "Jamshedpur",
    venue: "",
    occasion: "Wedding",
    packageInterest: "not-sure",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const resetForm = () =>
    setForm({
      name: "",
      phone: "",
      email: "",
      eventDate: "",
      guests: "",
      city: "Jamshedpur",
      venue: "",
      occasion: "Wedding",
      packageInterest: "not-sure",
      message: "",
    });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const pkg =
        form.packageInterest === "not-sure"
          ? null
          : packages.find((p) => p.name === form.packageInterest || p.id === form.packageInterest);
      const packageLabel = pkg
        ? `${pkg.name} — ₹${pkg.price}`
        : form.packageInterest === "not-sure"
          ? "Not sure yet — advise me"
          : form.packageInterest;

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          guests: form.guests ? parseInt(form.guests) : null,
          packageInterest: packageLabel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setSubmitted(true);
      resetForm();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      className="py-[104px]"
      id="contact"
      style={{
        background:
          "radial-gradient(100% 80% at 80% 0%,rgba(156,42,56,.28),transparent 60%), linear-gradient(180deg,#1c101b,#251526)",
      }}
    >
      <div className="max-w-[1220px] mx-auto px-5 sm:px-7 grid md:grid-cols-2 gap-[70px] items-center">
        <div>
          <div className="text-[0.72rem] font-semibold tracking-[0.32em] uppercase mb-2" style={{ color: "var(--gold)" }}>
            Let&apos;s Talk
          </div>
          <h2 className="font-display mb-3" style={{ fontSize: "clamp(2.2rem,4.6vw,3.6rem)", color: "var(--ivory)" }}>
            Craft your <span className="italic gold-text">perfect</span> celebration.
          </h2>
          <p className="text-[1.1rem] font-light mb-9 max-w-[440px]" style={{ color: "rgba(246,239,224,.62)" }}>
            From an intimate gathering to a grand wedding — tell us the date and the headcount, and we&apos;ll build the
            table around you. <b style={{ color: "var(--gold-bright)" }}>Our team is notified instantly.</b>
          </p>
          <div className="flex flex-col">
            <a
              href={`tel:${CONFIG.phoneDial}`}
              className="flex items-center gap-4 py-4 border-b group"
              style={{ borderColor: "var(--paper-line)", color: "var(--ivory)" }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: "rgba(198,152,58,0.15)",
                  border: "1.5px solid rgba(198,152,58,0.5)",
                  color: "#E2B658",
                }}
              >
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <span
                  className="block text-[0.68rem] tracking-[0.16em] uppercase mb-[-2px]"
                  style={{ color: "rgba(246,239,224,.62)" }}
                >
                  Call us
                </span>
                <span className="font-medium">{CONFIG.phoneDisplay}</span>
              </div>
            </a>
            <a
              href={`https://wa.me/${CONFIG.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 py-4 border-b group"
              style={{ borderColor: "var(--paper-line)", color: "var(--ivory)" }}
            >
              <div className="w-10 h-10 rounded-full glossy-btn-wa flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div>
                <span
                  className="block text-[0.68rem] tracking-[0.16em] uppercase mb-[-2px]"
                  style={{ color: "rgba(246,239,224,.62)" }}
                >
                  WhatsApp
                </span>
                <span className="font-medium">Chat with us instantly</span>
              </div>
            </a>
            <a
              href={`mailto:${CONFIG.email}`}
              className="flex items-center gap-4 py-4 border-b"
              style={{ borderColor: "var(--paper-line)", color: "var(--ivory)" }}
            >
              <Mail className="w-5" style={{ color: "var(--gold)" }} />
              <div>
                <span
                  className="block text-[0.68rem] tracking-[0.16em] uppercase mb-[-2px]"
                  style={{ color: "rgba(246,239,224,.62)" }}
                >
                  Email
                </span>
                <span>{CONFIG.email}</span>
              </div>
            </a>
            <a
              href={CONFIG.instaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 py-4 border-b"
              style={{ borderColor: "var(--paper-line)", color: "var(--ivory)" }}
            >
              <Instagram className="w-5" style={{ color: "var(--gold)" }} />
              <div>
                <span
                  className="block text-[0.68rem] tracking-[0.16em] uppercase mb-[-2px]"
                  style={{ color: "rgba(246,239,224,.62)" }}
                >
                  Instagram
                </span>
                <span>@{CONFIG.instaHandle}</span>
              </div>
            </a>
            <div
              className="flex items-center gap-4 py-4 border-b"
              style={{ borderColor: "var(--paper-line)", color: "var(--ivory)" }}
            >
              <MapPin className="w-5" style={{ color: "var(--gold)" }} />
              <div>
                <span
                  className="block text-[0.68rem] tracking-[0.16em] uppercase mb-[-2px]"
                  style={{ color: "rgba(246,239,224,.62)" }}
                >
                  Kitchen
                </span>
                <span>
                  {CONFIG.city}, Jharkhand · serving 200km radius
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mirror-panel rounded-lg overflow-hidden relative">
          <div className="relative h-[140px]" style={{ borderBottom: "1px solid var(--paper-line)" }}>
            <img
              src={SITE_IMAGES.contactSetup}
              alt="Rasa catering setup ready for celebration"
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(180deg, transparent 30%, rgba(28,16,27,.85) 100%)" }}
            />
            <div className="absolute bottom-3 left-5 right-5 font-display text-[1.05rem]" style={{ color: "var(--ivory)" }}>
              Your celebration, our kitchen.
            </div>
          </div>
          <div className="p-9 relative">
            {submitted ? (
              <div className="text-center py-8">
                <div
                  className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                  style={{ background: "rgba(31,122,92,0.15)", border: "2px solid rgba(31,122,92,0.4)" }}
                >
                  <Send className="w-7 h-7" style={{ color: "#1f7a5c" }} />
                </div>
                <h3 className="font-display text-[1.6rem] mb-2" style={{ color: "var(--ivory)" }}>
                  Enquiry sent!
                </h3>
                <p className="text-sm mb-5" style={{ color: "rgba(246,239,224,.62)" }}>
                  Our team has been notified. We&apos;ll call you within 24 hours between 10:30 AM and 5:00 PM.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="glossy-btn-ghost px-5 py-2 rounded-full text-sm font-medium"
                >
                  Send another enquiry
                </button>
              </div>
            ) : (
              <>
                <h3 className="font-display text-[1.5rem] mb-1.5" style={{ color: "var(--ivory)" }}>
                  Request a quote
                </h3>
                <p className="text-[0.9rem] mb-5 font-light" style={{ color: "rgba(246,239,224,.62)" }}>
                  We&apos;ll get back within a day. No obligation.{" "}
                  <b style={{ color: "var(--gold-bright)" }}>Minimum order: 100 guests.</b>
                </p>
                <form onSubmit={submit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Name *"
                      className="glass-input w-full rounded-md px-[15px] py-3 text-[0.95rem]"
                    />
                    <input
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="Phone *"
                      className="glass-input w-full rounded-md px-[15px] py-3 text-[0.95rem]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="date"
                      value={form.eventDate}
                      onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                      className="glass-input w-full rounded-md px-[15px] py-3 text-[0.95rem]"
                    />
                    <input
                      type="number"
                      value={form.guests}
                      onChange={(e) => setForm({ ...form, guests: e.target.value })}
                      placeholder="Guests"
                      min={100}
                      className="glass-input w-full rounded-md px-[15px] py-3 text-[0.95rem]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="City"
                      className="glass-input w-full rounded-md px-[15px] py-3 text-[0.95rem]"
                    />
                    <input
                      value={form.venue}
                      onChange={(e) => setForm({ ...form, venue: e.target.value })}
                      placeholder="Venue (optional)"
                      className="glass-input w-full rounded-md px-[15px] py-3 text-[0.95rem]"
                    />
                  </div>

                  <div>
                    <label
                      className="block text-[0.68rem] tracking-[0.16em] uppercase mb-1.5"
                      style={{ color: "rgba(246,239,224,.62)" }}
                    >
                      Interested in
                    </label>
                    <select
                      value={form.packageInterest}
                      onChange={(e) => setForm({ ...form, packageInterest: e.target.value })}
                      className="glass-input w-full rounded-md px-[15px] py-3 text-[0.95rem]"
                    >
                      <option value="not-sure">Not sure yet — advise me</option>
                      {packages.map((pkg) => (
                        <option key={pkg.id} value={pkg.name}>
                          {pkg.name} — ₹{pkg.price}
                        </option>
                      ))}
                    </select>
                  </div>

                  <select
                    value={form.occasion}
                    onChange={(e) => setForm({ ...form, occasion: e.target.value })}
                    className="glass-input w-full rounded-md px-[15px] py-3 text-[0.95rem]"
                    aria-label="Occasion"
                  >
                    <option>Wedding</option>
                    <option>Reception</option>
                    <option>Engagement / Roka</option>
                    <option>Birthday</option>
                    <option>Anniversary</option>
                    <option>Corporate event</option>
                    <option>Housewarming / Griha Pravesh</option>
                    <option>Festival / Puja</option>
                    <option>Other</option>
                  </select>

                  <textarea
                    rows={2}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Anything else — dietary needs, cuisine preferences, decor coordination…"
                    className="glass-input w-full rounded-md px-[15px] py-3 text-[0.95rem] block"
                  />
                  {err && (
                    <div
                      className="text-sm font-semibold text-center flex items-center justify-center gap-2"
                      style={{ color: "var(--anaar-bright)" }}
                    >
                      <AlertCircle className="w-4 h-4" /> {err}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-md font-semibold tracking-[0.03em] text-[0.95rem] disabled:opacity-60 flex items-center justify-center gap-2 transition-all"
                    style={{
                      background: "linear-gradient(180deg,#C6983A,#A87B28)",
                      color: "#231318",
                      boxShadow: "0 4px 12px -3px rgba(198,152,58,0.4)",
                    }}
                  >
                    {loading ? (
                      "Sending…"
                    ) : (
                      <>
                        Send enquiry
                        <Send className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
