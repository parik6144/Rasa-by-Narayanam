"use client";
import { CONFIG, TASTE_DOTS } from "@/lib/rasa-data";
import { Phone, MessageCircle, Mail, Instagram, Globe } from "lucide-react";

export default function Footer() {
  const waUrl = `https://api.whatsapp.com/send/?phone=${CONFIG.whatsapp}&text&type=phone_number&app_absent=0`;
  const iconStyle = "w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110";

  return (
    <footer className="pt-[56px] pb-[40px]" style={{ background: "linear-gradient(180deg,#180d17 0%,#100809 100%)", borderTop: "1px solid var(--paper-line)" }}>
      <div className="max-w-[1220px] mx-auto px-5 sm:px-7">
        <div className="flex flex-wrap justify-between items-end gap-8">
          <div>
            <img src={CONFIG.logo} alt="Rasa by Narayanam" className="logo-glow mb-3" style={{ height: "72px", width: "auto" }} />
            <div className="flex flex-wrap gap-2 mt-3">
              <a href={waUrl} target="_blank" rel="noopener noreferrer" className={iconStyle} style={{ background: "linear-gradient(180deg,#2a9970,#1f7a5c)", color: "#fff", boxShadow: "0 4px 12px -3px rgba(31,122,92,0.5)" }} title="WhatsApp us" aria-label="WhatsApp">
                <MessageCircle className="w-4 h-4" />
              </a>
              <a href={`tel:${CONFIG.phoneDial}`} className={iconStyle} style={{ background: "rgba(198,152,58,0.15)", border: "1px solid rgba(198,152,58,0.4)", color: "var(--gold-bright)" }} title={`Call ${CONFIG.phoneDisplay}`} aria-label="Call">
                <Phone className="w-4 h-4" />
              </a>
              <a href={`mailto:${CONFIG.email}`} className={iconStyle} style={{ background: "rgba(246,239,224,0.05)", border: "1px solid rgba(246,239,224,0.15)", color: "rgba(246,239,224,0.62)" }} title={CONFIG.email} aria-label="Email">
                <Mail className="w-4 h-4" />
              </a>
              <a href={CONFIG.instaUrl} target="_blank" rel="noopener noreferrer" className={iconStyle} style={{ background: "rgba(246,239,224,0.05)", border: "1px solid rgba(246,239,224,0.15)", color: "rgba(246,239,224,0.62)" }} title={`@${CONFIG.instaHandle}`} aria-label="Instagram">
                <Instagram className="w-4 h-4" />
              </a>
              <a href={CONFIG.websiteUrl} target="_blank" rel="noopener noreferrer" className={iconStyle} style={{ background: "rgba(246,239,224,0.05)", border: "1px solid rgba(246,239,224,0.15)", color: "rgba(246,239,224,0.62)" }} title={CONFIG.website} aria-label="Website">
                <Globe className="w-4 h-4" />
              </a>
            </div>
          </div>
          <div className="text-right text-[0.82rem] font-light" style={{ color: "rgba(246,239,224,.62)" }}>
            Narayanam Foods &amp; Catering<br />
            Kitchen live {CONFIG.launchDate}<br />
            Serving {CONFIG.city} &amp; 200km radius<br />
            <a href={`tel:${CONFIG.phoneDial}`} style={{ color: "var(--gold-bright)" }}>{CONFIG.phoneDisplay}</a>{" · "}
            <a href={`mailto:${CONFIG.email}`} style={{ color: "var(--gold-bright)" }}>{CONFIG.email}</a><br />
            <a href={CONFIG.websiteUrl} target="_blank" rel="noopener" style={{ color: "var(--gold-bright)" }}>{CONFIG.website}</a>
          </div>
        </div>
        <div className="flex justify-center gap-[7px] mt-[34px] mx-auto">
          {TASTE_DOTS.map((t) => (
            <span key={t.en} className={`taste-dot ${t.cls}`} />
          ))}
        </div>
        <div className="text-center text-[0.74rem] mt-8 font-light" style={{ color: "rgba(246,239,224,.42)" }}>
          © 2026 Narayanam Foods &amp; Catering. All rights reserved. · FSSAI Lic. pending
        </div>
      </div>
    </footer>
  );
}
