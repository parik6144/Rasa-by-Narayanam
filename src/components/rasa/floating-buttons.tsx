"use client";
import { CONFIG } from "@/lib/rasa-data";
import { Phone } from "lucide-react";

/** Call shortcut only — chat/WhatsApp live on the right via ChatWidget */
export default function FloatingButtons() {
  const telUrl = `tel:${CONFIG.phoneDial}`;

  return (
    <div className="fixed bottom-6 left-6 z-[95] flex flex-col gap-3">
      <a
        href={telUrl}
        className="group relative flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all hover:scale-110"
        style={{ background: "rgba(198,152,58,0.15)", border: "1.5px solid rgba(198,152,58,0.5)", color: "#E2B658" }}
        aria-label="Call us"
        title={`Call ${CONFIG.phoneDisplay}`}
      >
        <Phone className="w-5 h-5" />
      </a>
    </div>
  );
}
