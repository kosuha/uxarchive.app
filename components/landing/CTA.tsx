import { motion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CTA() {
  return (
    <section className="flex flex-col justify-center py-32 px-6 relative lg:h-[100vh] overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute inset-0 opacity-30"
          animate={{
            background: [
              "radial-gradient(circle at 20% 50%, oklch(0.648 0.2 131.684) 0%, transparent 50%)",
              "radial-gradient(circle at 80% 50%, oklch(0.768 0.233 130.85) 0%, transparent 50%)",
              "radial-gradient(circle at 20% 50%, oklch(0.648 0.2 131.684) 0%, transparent 50%)",
            ],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 mb-8"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary">Start now and collect inspiration</span>
          </motion.div>

          <h2 className="text-5xl font-black md:text-7xl mb-6">
            <span className="block mb-2">The Simplest Way</span>
            <span className="bg-gradient-to-r from-primary via-green-400 to-primary bg-clip-text text-transparent">
              To Organize UX Patterns
            </span>
          </h2>

          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            With UX Archive, gather all your inspiration in one place
            <br />
            and access it whenever you need
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-lg px-8 py-6 rounded-full group">
              <Link href="/workspace">
                Start for Free
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
