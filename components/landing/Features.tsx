import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { Layers, MapPin, Search, FolderTree, Zap, Share2 } from "lucide-react";

const features = [
  {
    icon: Layers,
    title: "Screenshot Collection",
    description: "Easily capture and archive UI from web and mobile apps",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    icon: MapPin,
    title: "Interactive Pins",
    description: "Pin insights directly on images to document design decisions",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    icon: FolderTree,
    title: "Structured Organization",
    description: "Manage patterns systematically with categories, tags, and projects",
    gradient: "from-teal-500 to-cyan-500",
  },
  {
    icon: Search,
    title: "Powerful Search",
    description: "Find references quickly by tags, colors, and pattern types",
    gradient: "from-cyan-500 to-blue-500",
  },
  {
    icon: Zap,
    title: "Quick Access",
    description: "Save instantly when inspiration strikes with browser extension",
    gradient: "from-blue-500 to-indigo-500",
  },
  {
    icon: Share2,
    title: "Collaboration & Sharing",
    description: "Share pattern libraries with team members and grow together",
    gradient: "from-indigo-500 to-violet-500",
  },
];

export function Features() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-32 px-6 relative">
      {/* Background Effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <h2 className="text-5xl font-black md:text-6xl mb-6">
            Powerful Features to
            <br />
            <span className="bg-gradient-to-r from-primary to-green-400 bg-clip-text text-transparent">
              Systematize Inspiration
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A UX pattern archive tool for designers and planners
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="group relative"
            >
              <div className="relative p-8 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300">
                {/* Icon */}
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${feature.gradient} mb-6`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-2xl mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>

                {/* Hover Effect */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}