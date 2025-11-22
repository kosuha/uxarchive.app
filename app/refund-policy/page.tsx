import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Refund Policy | UX Archive",
  description: "UX Archive refund policy and how to request refunds.",
};

const sections = [
  {
    title: "Eligibility",
    description:
      "We issue refunds when the product does not meet expectations and a request is made within the reasonable review window.",
    bullets: [
      "Requests must be made within 14 days of the original charge",
      "Applies to first billing cycle for a plan or upgrade",
      "Account must have no active chargeback or policy violations",
    ],
  },
  {
    title: "How to Request",
    description:
      "Send us the details below so we can investigate and respond quickly.",
    bullets: [
      "Email okeydokekim@gmail.com with your account email and invoice ID",
      "Include a brief description of the issue or mismatch",
      "We confirm receipt within 2 business days and share next steps",
    ],
  },
  {
    title: "Refund Method",
    description:
      "Approved refunds are returned to the original payment method unless required otherwise by the payment provider.",
    bullets: [
      "Processing time is typically 5–10 business days after approval",
      "Partial periods may be refunded on a prorated basis",
      "Refund status is provided by email once initiated",
    ],
  },
  {
    title: "Non-refundable Cases",
    description:
      "Certain scenarios are not eligible for refunds.",
    bullets: [
      "Charges older than 30 days from the request date",
      "Accounts with repeated abuse, policy violations, or chargebacks",
      "One-time services or custom work delivered on request",
    ],
  },
  {
    title: "Need Help?",
    description: "We are here to clarify anything about this policy.",
    bullets: ["okeydokekim@gmail.com"],
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
              We want you to feel confident using UX Archive. If the product is not
              working for your team, this page explains when refunds are available
              and how to request them.
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
    </main>
  );
}
