"use client";
import { useEffect } from "react";
import { useApp } from "@/store/app-store";
import { useCatalog } from "@/store/catalog-store";
import Nav from "@/components/rasa/nav";
import Hero from "@/components/rasa/hero";
import TrustStrip from "@/components/rasa/trust-strip";
import Story from "@/components/rasa/story";
import Promise from "@/components/rasa/promise";
import WhyRasa from "@/components/rasa/why-rasa";
import Packages from "@/components/rasa/packages";
import ComparisonTable from "@/components/rasa/comparison-table";
import Addons from "@/components/rasa/addons";
import HowItWorks from "@/components/rasa/how-it-works";
import Reviews from "@/components/rasa/reviews";
import FAQ from "@/components/rasa/faq";
import Contact from "@/components/rasa/contact";
import Footer from "@/components/rasa/footer";
import AuthModal from "@/components/rasa/auth-modal";
import BookingWizard from "@/components/rasa/booking-wizard";
import UserDashboard from "@/components/rasa/user-dashboard";
import ChatWidget from "@/components/rasa/chat-widget";
import FloatingButtons from "@/components/rasa/floating-buttons";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { view, setUser, toast, setToast, hydrateUser, setSessionChecked } = useApp();
  const { toast: showToast } = useToast();
  const loadCatalog = useCatalog((s) => s.loadCatalog);

  useEffect(() => {
    hydrateUser();
    const startedAt = Date.now();
    fetch("/api/auth/me", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setUser(d.user);
        } else {
          const { user: live, userUpdatedAt } = useApp.getState();
          if (userUpdatedAt > startedAt && live) return;
          setUser(null);
        }
      })
      .catch(() => {})
      .finally(() => setSessionChecked(true));
    loadCatalog();
  }, [setUser, loadCatalog, hydrateUser, setSessionChecked]);

  useEffect(() => {
    if (toast) {
      showToast({ title: toast });
      const t = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(t);
    }
  }, [toast, showToast, setToast]);

  return (
    <div className="min-h-screen flex flex-col">
      {view === "landing" && (
        <>
          <Nav />
          <main className="flex-1">
            <Hero />
            <TrustStrip />
            <Story />
            <Promise />
            <WhyRasa />
            <Packages />
            <ComparisonTable />
            <Addons />
            <HowItWorks />
            <Reviews />
            <FAQ />
            <Contact />
          </main>
          <Footer />
        </>
      )}

      {view === "booking" && <BookingWizard />}

      {view === "user-dashboard" && (
        <>
          <Nav />
          <main className="flex-1">
            <UserDashboard />
          </main>
          <Footer />
        </>
      )}

      {(view === "landing" || view === "user-dashboard") && (
        <>
          <ChatWidget />
          <FloatingButtons />
        </>
      )}

      <AuthModal />
    </div>
  );
}
