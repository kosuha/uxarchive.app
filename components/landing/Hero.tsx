import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, LayoutDashboard, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function Hero() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [userCount, setUserCount] = useState<number | null>(null);
  const [repositoryCount, setRepositoryCount] = useState<number | null>(null);
  const [isLoadingCount, setIsLoadingCount] = useState(true);
  const [hasStatsError, setHasStatsError] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchUserCount = async () => {
      try {
        const response = await fetch("/api/public/stats", { signal: controller.signal });
        if (!response.ok) {
          throw new Error("Failed to load stats");
        }
        const data = (await response.json()) as { userCount?: number; repositoryCount?: number };
        if (!isMounted) return;
        setUserCount(typeof data.userCount === "number" ? data.userCount : 0);
        setRepositoryCount(typeof data.repositoryCount === "number" ? data.repositoryCount : 0);
      } catch (error) {
        if ((error as Error)?.name === "AbortError") return;
        if (isMounted) setHasStatsError(true);
      } finally {
        if (isMounted) setIsLoadingCount(false);
      }
    };

    fetchUserCount();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const formattedUserCount = useMemo(() => {
    if (userCount === null) return null;
    const formatter = new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    });
    return `${formatter.format(userCount)}+`;
  }, [userCount]);

  const formattedRepositoryCount = useMemo(() => {
    if (repositoryCount === null) return null;
    const formatter = new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    });
    return `${formatter.format(repositoryCount)}+`;
  }, [repositoryCount]);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated Background Gradient */}
      <motion.div
        className="absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, oklch(0.648 0.2 131.684) 0%, transparent 50%)`,
        }}
      />

      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-40">
        <div className="h-full w-full" style={{
          backgroundImage: `linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 text-center pt-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 mb-8"
            whileHover={{ scale: 1.05 }}
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary">For Designers & Product Managers</span>
          </motion.div>

          <h1 className="text-6xl font-black md:text-8xl mb-6 tracking-tight">
            <span className="block">Organize your</span>{" "}
            <span className="block leading-[1.15] bg-gradient-to-r from-primary via-green-400 to-primary bg-clip-text text-transparent">
              UX Patterns
            </span>
          </h1>

          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
            From screenshots to structured insights
            <br />
            — all in one clean workspace.
          </p>

          <div className="flex items-center justify-center gap-4 md:flex-row flex-col">
            <Button
              asChild
              size="lg"
              className="bg-primary hover:bg-primary/90 text-lg px-8 py-6 rounded-full group w-[250px] h-[54px]"
            >
              <Link href="/share/r">
                Get Started Free
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 rounded-full border-border hover:bg-muted w-[250px] h-[54px]"
            >
              <Link href="#pricing">View Pricing</Link>
            </Button>
          </div>

          <div className="mt-10 flex flex-col items-center gap-3">
            <div className="flex h-[54px] w-[250px] items-center gap-2.5 rounded-lg border border-border/70 bg-background/30 pl-2.5 shadow-lg backdrop-blur">
              <div className="rounded-full bg-primary/10 p-2 text-primary">
                <Users className="h-4 w-4" />
              </div>
              <div className="flex flex-col items-start text-left leading-tight">
                {hasStatsError ? (
                  <span className="text-xs text-muted-foreground">Live count unavailable</span>
                ) : isLoadingCount ? (
                  <Skeleton className="h-6 w-16 rounded-md" />
                ) : (
                  <span className="text-xl font-black leading-none tracking-tight">
                    {formattedUserCount}
                  </span>
                )}
                <span className="text-xs font-bold">
                  {hasStatsError
                    ? "Updating the live number soon"
                    : "UX pros joined"}
                </span>
              </div>
            </div>
            <Button
              asChild
              variant="outline"
              className="h-[54px] w-[250px] justify-start rounded-lg border-border/70 bg-background/30 pl-2.5 shadow-lg backdrop-blur hover:bg-background/50"
            >
              <Link href="/share/r" className="items-center gap-2.5">
                <div className="rounded-full bg-primary/10 p-2 text-primary">
                  <LayoutDashboard className="h-4 w-4" />
                </div>
                <div className="flex flex-col items-start text-left leading-tight">
                  {hasStatsError ? (
                    <span className="text-xs text-muted-foreground">Count unavailable</span>
                  ) : isLoadingCount ? (
                    <Skeleton className="h-6 w-12 rounded-md" />
                  ) : (
                    <span className="text-xl font-black leading-none tracking-tight">
                      {formattedRepositoryCount}
                    </span>
                  )}
                  <span className="text-xs font-bold">Shared repositories</span>
                </div>
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      {/* <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-6 h-10 border-2 border-border rounded-full flex items-start justify-center p-2">
          <motion.div
            className="w-1 h-2 bg-primary rounded-full"
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </motion.div> */}
    </section>
  );
}
