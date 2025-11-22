import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Terms of Service | UX Archive",
  description: "UX Archive terms of service and acceptable use.",
};

const sections = [
  {
    title: "Acceptance & Scope",
    description:
      "By creating an account or using UX Archive, you agree to these Terms and our Privacy and Refund policies.",
    bullets: [
      "These Terms apply to the web app, and any related services",
      "If you use UX Archive on behalf of a company, you represent you have authority to accept these Terms",
      "We may update these Terms; continued use means acceptance of the updated version",
    ],
  },
  {
    title: "Accounts & Acceptable Use",
    description: "Keep your account secure and use UX Archive responsibly.",
    bullets: [
      "Provide accurate registration details and maintain account security",
      "Do not misuse, reverse engineer, or disrupt the service",
      "Respect intellectual property and only upload content you have rights to share",
    ],
  },
  {
    title: "Billing & Refunds",
    description:
      "Payments are processed by Paddle. Our Refund Policy explains how to request and receive refunds.",
    bullets: [
      "Charges, invoices, and taxes are handled through Paddle as our payment provider",
      "Review the Refund Policy for how to submit requests and expected timelines",
      "We may adjust pricing with notice; changes apply on future billing cycles",
    ],
  },
  {
    title: "Content & Privacy",
    description:
      "You own your content. We handle it under the Privacy Policy and use it only to provide and secure the service.",
    bullets: [
      "You retain ownership of uploads and workspace data",
      "You grant UX Archive a non-exclusive, revocable license to use your content to operate, secure, and improve the service",
      "Illegal content or content that infringes others’ rights is prohibited and may lead to removal or account action",
      "Upon account deletion, we delete or anonymize personal data subject to legal/backup retention limits",
      "See the Privacy Policy for data handling, retention, and rights",
    ],
  },
  {
    title: "Service Changes & Availability",
    description:
      "We may modify features or availability, and we aim to give reasonable notice for impactful changes.",
    bullets: [
      "We strive for reliable uptime but do not guarantee uninterrupted service",
      "Planned maintenance or updates may temporarily affect access",
      "We may suspend accounts for security, legal, or policy reasons",
    ],
  },
  {
    title: "Disclaimers & Liability",
    description:
      "UX Archive is provided as-is to the extent permitted by law. Our liability is limited to the maximum extent allowed.",
    bullets: [
      "No warranties of fitness for a particular purpose are given",
      "We are not liable for indirect or consequential damages",
      "Total liability is limited to fees paid for the service in the prior 12 months",
    ],
  },
  {
    title: "Contact",
    description: "Questions about these Terms? We are here to help.",
    bullets: ["okeydokekim@gmail.com"],
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute -top-32 left-16 h-72 w-72 rounded-full bg-primary/10 blur-[110px]" />
        <div className="pointer-events-none absolute top-10 right-20 h-64 w-64 rounded-full bg-secondary/25 blur-[110px]" />

        <div className="relative mx-auto max-w-4xl px-6 py-16 space-y-10">
          <header className="space-y-4">
            <Badge variant="secondary">Last updated: 2025-11-22</Badge>
            <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
            <p className="text-muted-foreground leading-relaxed">
              These terms govern your use of UX Archive. Please read them along with our
              Privacy and Refund policies so you know how we operate and support you.
            </p>
          </header>

          <div className="space-y-10">
            {sections.map((section) => (
              <section key={section.title} className="space-y-4">
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold tracking-tight">
                    {section.title}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {section.description}
                  </p>
                </div>
                <ul className="space-y-2 text-muted-foreground leading-relaxed list-disc list-outside pl-5">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
                <Separator className="pt-4" />
              </section>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
