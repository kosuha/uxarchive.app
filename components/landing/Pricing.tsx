import type React from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { motion } from "motion/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const pricingTiers = [
  {
    name: "Free",
    price: "$0",
    period: "/mo",
    description: "Open to everyone",
    badge: "Now available",
    highlight: false,
    features: ["Personal workspace", "Up to 5 patterns"],
    ctaLabel: "Start free",
    ctaHref: "/workspace",
    disabled: false,
    supportingText: "Start organizing your screenshots with the free plan.",
  },
  {
    name: "Plus",
    price: "$3",
    period: "/mo",
    description: "More space",
    badge: "Most popular",
    highlight: true,
    features: ["Personal workspace included", "Up to 30 patterns", "Image download"],
    ctaLabel: "Upgrade to Plus",
    ctaHref: "/price/plus",
    disabled: false,
    supportingText: "Extra capacity and downloads for growing workspaces.",
  },
  {
    name: "Pro",
    price: "$12",
    period: "/mo",
    description: "",
    badge: "Coming soon",
    highlight: false,
    features: ["Team workspace", "Unlimited patterns", "Image download", "Pattern prototyping"],
    ctaLabel: "Coming soon",
    ctaHref: "/price/pro",
    disabled: true,
    supportingText: "Team workspace and prototyping arrive soon.",
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="relative overflow-hidden px-6 py-28 lg:h-[100vh]">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-emerald-200/10 to-background" />
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:56px_56px] opacity-40"
      />

      <div className="relative mx-auto max-w-6xl space-y-12">
        <div className="flex flex-col gap-4 text-center">
          <Badge variant="outline" className="mx-auto h-8 rounded-full px-4 text-xs">
            Pricing
          </Badge>
          <h2 className="text-4xl font-black md:text-5xl">Flexible plans for your archiving flow</h2>
          <p className="text-lg text-muted-foreground">
            Free is now open to everyone. Start free and upgrade to Plus when you need more room.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {pricingTiers.map((tier, index) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="h-full"
            >
              <PricingCard tier={tier} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
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
    ? "border-primary/50 shadow-[0_20px_70px_-24px_rgba(16,185,129,0.6)]"
    : "border-border/60";

  return (
    <div
      className={`relative flex h-full flex-col overflow-hidden rounded-3xl border bg-card/90 backdrop-blur-xl ${highlightClasses}`}
    >
      {tier.highlight ? (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary via-emerald-400 to-primary" />
      ) : null}

      <div className="flex items-start justify-between p-6">
        <div className="space-y-1">
          <p className={`text-sm ${tier.highlight ? "text-primary" : "text-muted-foreground"}`}>
            {tier.name} {tier.description && "·"} {tier.description}
          </p>
          <div className="flex items-baseline gap-3">
            <p className="text-4xl font-black">
              {tier.price}
              <span className="ml-2 text-base font-normal text-muted-foreground">{tier.period}</span>
            </p>
          </div>
          <p className="text-sm text-muted-foreground">{tier.supportingText}</p>
        </div>
        <Badge variant={tier.highlight ? "outline" : "secondary"} className="h-8 rounded-full">
          {tier.badge}
        </Badge>
      </div>

      <Separator className="mx-6" />

      <div className="flex flex-1 flex-col justify-between p-6">
        <ul className="space-y-3 text-sm text-muted-foreground">
          {tier.features.map((feature) => (
            <PricingItem key={feature}>{feature}</PricingItem>
          ))}
        </ul>
        <Button
          asChild={!tier.disabled}
          className="mt-8 w-full rounded-full"
          size="lg"
          variant={tier.highlight ? "default" : "outline"}
          disabled={tier.disabled}
        >
          {tier.disabled ? <span>{tier.ctaLabel}</span> : <Link href={tier.ctaHref}>{tier.ctaLabel}</Link>}
        </Button>
      </div>
    </div>
  );
}
