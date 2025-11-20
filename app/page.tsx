'use client'

import { CTA } from "@/components/landing/CTA";
import { Features } from "@/components/landing/Features";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { LandingThemeToggle } from "@/components/landing/ThemeToggle";
import { Pricing } from "@/components/landing/Pricing";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <LandingThemeToggle />
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-20 h-80 w-80 rounded-full bg-primary/15 blur-[120px]" />
        <div className="pointer-events-none absolute right-10 top-10 h-72 w-72 rounded-full bg-secondary/30 blur-[120px]" />
        <Hero />
        <Features />
        <Pricing />
        <CTA />
        <Footer />
      </div>
    </main>
  );
}
