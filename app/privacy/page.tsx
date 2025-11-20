import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Privacy Policy | UX Archive",
  description: "UX Archive privacy policy",
};

const sections = [
  {
    title: "Information We Collect",
    description:
      "We only collect the minimum data required to operate and improve the service.",
    bullets: [
      "Account: email, name, hashed password",
      "Workspace content: project metadata, uploaded captures and files",
      "Usage: device/browser information and activity logs for quality and troubleshooting",
    ],
  },
  {
    title: "How We Use Information",
    description: "Your data is used only for the following purposes.",
    bullets: [
      "Account authentication and security",
      "Core product features such as uploads, collaboration, and favorites",
      "Service improvement and error analysis through aggregated metrics",
      "Compliance with legal obligations and dispute resolution",
    ],
  },
  {
    title: "Retention and Protection",
    description:
      "Data is retained only for as long as needed to deliver the service or comply with law, then securely deleted.",
    bullets: [
      "Transport encryption (HTTPS) and least-privilege access controls",
      "Equal security expectations for third-party infrastructure such as Supabase",
      "Periodic cleanup of inactive accounts and unnecessary data",
    ],
  },
  {
    title: "Sharing with Third Parties",
    description:
      "We never sell your data. It is shared only when legally required or when necessary providers are involved.",
    bullets: [
      "Vetted infrastructure or analytics vendors operate under contractual and technical safeguards",
      "We will inform you upon request about current third-party processors",
    ],
  },
  {
    title: "Your Rights",
    description:
      "You can review, update, or delete your information at any time.",
    bullets: [
      "Edit or remove profile details and uploaded content",
      "Request full account deletion via email",
      "Manage marketing or notification preferences (where applicable)",
    ],
  },
  {
    title: "Contact",
    description:
      "For privacy questions or requests, reach out anytime and we will respond promptly.",
    bullets: ["okeydokekim@gmail.com"],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute -top-32 left-16 h-72 w-72 rounded-full bg-primary/10 blur-[110px]" />
        <div className="pointer-events-none absolute top-10 right-20 h-64 w-64 rounded-full bg-secondary/25 blur-[110px]" />

        <div className="relative mx-auto max-w-4xl px-6 py-16 space-y-10">
          <header className="space-y-4">
            <Badge variant="secondary">Last updated: 2025-01-07</Badge>
            <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
            <p className="text-muted-foreground leading-relaxed">
              UX Archive is designed to help you store and collaborate on UX references securely.
              This policy explains what we collect, how we use it, and the choices you have.
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
