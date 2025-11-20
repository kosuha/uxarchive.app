import type React from "react"
import Link from "next/link"
import {
  ArrowRight,
  Check,
  FolderTree,
  Image,
  LayoutTemplate,
  Pin,
  Search,
  Sparkles,
  Wand2,
  Workflow,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

const featureCards = [
  {
    icon: FolderTree,
    title: "Organize by folders and tags",
    description:
      "Keep patterns structured by service, then surface them instantly with tags and favorites.",
    points: [
      "Service and pattern metadata",
      "Favorites & tag filters",
      "Collapsible folder tree",
    ],
  },
  {
    icon: Image,
    title: "Capture strip + canvas",
    description:
      "Drag-and-drop captures, compare in the strip, and swap views without losing context.",
    points: [
      "Multi-capture ordering and sorting",
      "Fixed panels with flexible canvas",
      "Preserve capture history per service",
    ],
  },
  {
    icon: Pin,
    title: "Pins + insights workflow",
    description:
      "Drop pins on images, jot notes instantly, and keep canvas and list highlighted together.",
    points: [
      "Coordinate-based pin insights",
      "Inline edit and delete",
      "List-to-canvas hover highlight",
    ],
  },
  {
    icon: Search,
    title: "Search & filters",
    description:
      "Find screens by pattern, service, summary, or tags to speed up reviews and handoffs.",
    points: [
      "Multi-keyword search",
      "Folder and favorites filters",
      "Quick preview of matches",
    ],
  },
];

const workflowSteps = [
  {
    title: "Collect captures",
    detail: "Drag & drop screenshots, keep them ordered in the strip",
  },
  {
    title: "Pins & insights",
    detail: "Place pins, add notes, see synchronized highlights",
  },
  {
    title: "Organize",
    detail: "Structure with folders, tags, favorites; keep metadata clean",
  },
  {
    title: "Share",
    detail: "Use it today; sharing links and sync are on the way",
  },
];

const pricingTiers = [
  {
    name: "Free",
    price: "$0",
    period: "/mo",
    description: "",
    badge: "Coming soon",
    highlight: false,
    features: [
      "Personal workspace",
      "Up to 5 patterns",
    ],
    ctaLabel: "Coming soon",
    ctaHref: "#",
    disabled: true,
  },
  {
    name: "Plus",
    price: "$0",
    period: "during beta",
    originalPrice: "$3/mo",
    description: "",
    badge: "Beta free",
    highlight: true,
    features: [
      "Personal workspace included",
      "Up to 30 patterns",
      "Image download",
    ],
    ctaLabel: "Start free (beta)",
    ctaHref: "/workspace",
    disabled: false,
  },
  {
    name: "Pro",
    price: "$12",
    period: "/mo",
    description: "",
    badge: "Coming soon",
    highlight: false,
    features: [
      "Team workspace",
      "Unlimited patterns",
      "Image download",
      "Pattern prototyping",
    ],
    ctaLabel: "Coming soon",
    ctaHref: "#",
    disabled: true,
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-20 h-80 w-80 rounded-full bg-primary/15 blur-[120px]" />
        <div className="pointer-events-none absolute right-10 top-10 h-72 w-72 rounded-full bg-secondary/30 blur-[120px]" />

        <section className="px-6 pb-16 pt-20 sm:pt-28">
          <div className="mx-auto max-w-6xl space-y-8">
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <Badge variant="outline" className="h-7 gap-1 rounded-full">
                <Sparkles className="h-3.5 w-3.5" />
                Beta update
              </Badge>
              <span>One workspace for UX captures, pins, and insights</span>
            </div>

            <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:items-center">
              <div className="space-y-6">
                <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                  Ship UX work faster with a single canvas for captures, pins, and notes
                </h1>
                <p className="text-lg text-muted-foreground sm:text-xl">
                  Capture once, pin insights, and keep everything organized in one layout. Built for
                  designers and PMs who need clarity without extra tools.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button asChild size="lg">
                    <Link href="/workspace">
                      Get started free
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="secondary">
                    <Link href="#pricing">View pricing</Link>
                  </Button>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <HighlightPill icon={Wand2}>Pins and insights stay in sync</HighlightPill>
                  <HighlightPill icon={LayoutTemplate}>Fixed panels + flexible canvas</HighlightPill>
                  <HighlightPill icon={Workflow}>Folder and tag-first structure</HighlightPill>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/15 via-background to-secondary/25 blur-2xl" />
                <div className="relative rounded-2xl border bg-card/80 p-6 shadow-xl backdrop-blur">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>UX Archive workflow</span>
                    <Badge variant="secondary" className="h-6 rounded-full">
                      Canvas · captures · insights
                    </Badge>
                  </div>
                  <Separator className="my-4" />
                  <div className="space-y-4">
                    <PreviewRow title="Left panel" description="Search, folder tree, pattern list" />
                    <PreviewRow title="Center canvas" description="Capture image + pins" />
                    <PreviewRow title="Right panel" description="Metadata and insights list" />
                    <PreviewRow title="Bottom strip" description="Quickly switch captures" />
                  </div>
                  <div className="mt-6 rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                    Pins on the image and notes in the list highlight together on hover.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 py-16">
          <div className="mx-auto max-w-6xl space-y-10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
              <div>
                <Badge variant="outline" className="h-7 rounded-full px-3 text-xs">
                  Product overview
                </Badge>
                <h2 className="mt-3 text-3xl font-semibold">Everything you need on one screen</h2>
                <p className="mt-2 max-w-2xl text-muted-foreground">
                  Folders, tags, capture strip, and pin-based insights stay together so you can move
                  from capture to decision without tab-hopping.
                </p>
              </div>
              <Button asChild variant="link" className="text-primary">
                <Link href="/workspace" className="gap-2">
                  Open the workspace
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {featureCards.map((feature) => (
                <FeatureCard key={feature.title} {...feature} />
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-16">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-center">
            <div className="space-y-4">
              <Badge variant="outline" className="h-7 rounded-full px-3 text-xs">
                Workflow
              </Badge>
              <h2 className="text-3xl font-semibold">From capture to insight sharing</h2>
              <p className="max-w-2xl text-muted-foreground">
                Capture → pin notes → structure with folders/tags → share. Supabase sync and team
                share links are on the roadmap.
              </p>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <HighlightPill icon={Check}>Local-first, cloud sync coming</HighlightPill>
                <HighlightPill icon={Check}>Responsive fixed-width shell</HighlightPill>
                <HighlightPill icon={Check}>Tag and favorites-first search</HighlightPill>
              </div>
            </div>

            <div className="rounded-2xl border bg-card/80 p-6 shadow-lg backdrop-blur">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Workflow className="h-4 w-4 text-primary" />
                Workflow steps
              </div>
              <Separator className="my-4" />
              <div className="space-y-4">
                {workflowSteps.map((step, index) => (
                  <div
                    key={step.title}
                    className="flex items-start gap-3 rounded-xl border bg-muted/30 px-4 py-3"
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{step.title}</p>
                      <p className="text-sm text-muted-foreground">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="px-6 py-16">
          <div className="mx-auto max-w-6xl space-y-8">
            <div className="flex flex-col gap-3 text-center">
              <Badge variant="outline" className="mx-auto h-7 rounded-full px-3 text-xs">
                Pricing
              </Badge>
              <h2 className="text-3xl font-semibold">Free plan is coming. Plus is free during beta.</h2>
              <p className="text-muted-foreground">
                Free will offer a starter workspace. Use Plus for free while we’re in beta; it will
                be $3/mo at launch. Pro ($7) will add team workspaces and advanced controls.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {pricingTiers.map((tier) => (
                <PricingCard key={tier.name} tier={tier} />
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 pb-20">
          <div className="mx-auto flex max-w-5xl flex-col gap-6 rounded-3xl border bg-gradient-to-br from-primary/10 via-card to-secondary/20 p-8 text-center shadow-lg sm:p-12">
            <div className="mx-auto w-fit rounded-full bg-white/60 px-3 py-1 text-xs font-medium text-primary shadow-sm">
              UX Archive
            </div>
            <h3 className="text-3xl font-semibold">
              Upload captures now and start building insights.
            </h3>
            <p className="text-muted-foreground">
              The workspace is free during beta. Create folders, drop captures, and add pins to
              capture your team’s thinking.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/workspace">
                  Launch workspace
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="#pricing">See pricing</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

type HighlightPillProps = {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
};

function HighlightPill({ icon: Icon, children }: HighlightPillProps) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
      <Icon className="h-3.5 w-3.5 text-primary" />
      {children}
    </span>
  );
}

type PreviewRowProps = {
  title: string;
  description: string;
};

function PreviewRow({ title, description }: PreviewRowProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border px-4 py-3">
      <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-primary" />
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

type FeatureCardProps = (typeof featureCards)[number];

function FeatureCard({ icon: Icon, title, description, points }: FeatureCardProps) {
  return (
    <div className="group flex h-full flex-col gap-4 rounded-2xl border bg-card/60 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Separator />
      <ul className="space-y-2 text-sm text-muted-foreground">
        {points.map((point) => (
          <li key={point} className="flex items-center gap-2">
            <Check className="h-4 w-4 text-primary" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type PricingItemProps = {
  children: React.ReactNode;
};

function PricingItem({ children }: PricingItemProps) {
  return (
    <li className="flex items-center gap-2">
      <Check className="h-4 w-4 text-primary" />
      <span>{children}</span>
    </li>
  );
}

type PricingCardProps = {
  tier: (typeof pricingTiers)[number];
};

function PricingCard({ tier }: PricingCardProps) {
  const highlightClasses = tier.highlight
    ? "border-primary/50 bg-primary/5 shadow-lg"
    : "bg-card/80 shadow-sm backdrop-blur";

  return (
    <div className={`flex h-full flex-col rounded-2xl border ${highlightClasses} p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm ${tier.highlight ? "text-primary" : "text-muted-foreground"}`}>
            {tier.name} {tier.description && "·"} {tier.description}
          </p>
          <div className="mt-1 flex items-baseline gap-3">
            {tier.originalPrice ? (
              <span className="text-xl text-muted-foreground line-through">{tier.originalPrice}</span>
            ) : null}
            <p className="text-3xl font-semibold">
              {tier.price} <span className="text-base text-muted-foreground">{tier.period}</span>
            </p>
          </div>
        </div>
        <Badge variant={tier.highlight ? "outline" : "secondary"} className="h-7 rounded-full">
          {tier.badge}
        </Badge>
      </div>
      <Separator className="my-4" />
      <div className="flex flex-1 flex-col justify-between">
        <ul className="space-y-3 text-sm text-muted-foreground">
          {tier.features.map((feature) => (
            <PricingItem key={feature}>{feature}</PricingItem>
          ))}
        </ul>
        <Button
          asChild={!tier.disabled}
          className="mt-6 w-full"
          size="lg"
          variant={tier.highlight ? "default" : "outline"}
          disabled={tier.disabled}
        >
          {tier.disabled ? (
            <span>{tier.ctaLabel}</span>
          ) : (
            <Link href={tier.ctaHref}>{tier.ctaLabel}</Link>
          )}
        </Button>
      </div>
    </div>
  );
}
