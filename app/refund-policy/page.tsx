import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Refund Policy | UX Archive",
  description: "UX Archive refund policy and how to request refunds.",
};

const sections = [
  {
    title: "Required Information",
    description:
      "For faster handling, include the email used for payment and your order number.",
    bullets: [
      "Refund requests must be submitted by the original purchaser",
      "If anything looks unusual, we may request extra details to verify your identity",
    ],
  },
  {
    title: "How to Request",
    description: "Email us with the details below and we'll guide you through next steps.",
    bullets: [
      "Send your account email, order number, and a brief issue summary to okeydokekim@gmail.com",
      "We confirm receipt and share next steps within 2 business days",
    ],
  },
  {
    title: "Eligibility",
    description: "Full refunds are available within 14 days of purchase if there is no usage activity.",
    bullets: [
      "After 14 days, unused time is not eligible for partial refunds",
      "After cancellation, your membership stays active for the already paid period",
    ],
  },
  {
    title: "Processing",
    description:
      "Approved refunds return to the original payment method, and we'll email you status updates.",
    bullets: [
      "Depending on your bank or card issuer, funds may take 5–10 business days to appear",
      "We will notify you by email once the refund is processed",
    ],
  },
  {
    title: "Additional Notes",
    description:
      "Terms may vary by region, and enterprise agreements follow the terms in the signed contract.",
    bullets: [
      "Local regulations may impose extra conditions",
      "Enterprise contracts follow the refund terms specified in the agreement",
    ],
  },
];

export default function RefundPolicyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute -top-32 left-16 h-72 w-72 rounded-full bg-primary/10 blur-[110px]" />
        <div className="pointer-events-none absolute top-10 right-20 h-64 w-64 rounded-full bg-secondary/25 blur-[110px]" />

        <div className="relative mx-auto max-w-4xl px-6 py-16 space-y-10">
          <header className="space-y-4">
            <Badge variant="secondary">Last updated: 2025-11-22</Badge>
            <h1 className="text-4xl font-bold tracking-tight">Refund Policy</h1>
            <p className="text-muted-foreground leading-relaxed">
              Overview of UX Archive refund steps and criteria. Find required info, timelines, and
              processing details below.
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
