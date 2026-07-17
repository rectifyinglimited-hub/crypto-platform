/**
 * Post sign-in splash — animated Nexus wordmark for ~1.75s before dashboard.
 */

import { motion } from "framer-motion";

export default function SplashScreen() {
  return (
    <div className="relative grid min-h-screen w-full place-items-center overflow-hidden bg-[#070a12] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 h-56 w-56 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(34,211,238,0.08),_transparent_60%)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex flex-col items-center"
      >
        <motion.div
          className="text-[11px] font-semibold uppercase tracking-[0.42em] text-cyan-400/80"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          Welcome to
        </motion.div>

        <motion.h1
          className="mt-3 bg-gradient-to-br from-white via-cyan-100 to-emerald-200 bg-clip-text text-6xl font-bold tracking-tight text-transparent sm:text-7xl"
          initial={{ opacity: 0, letterSpacing: "0.2em" }}
          animate={{ opacity: 1, letterSpacing: "0.04em" }}
          transition={{ delay: 0.25, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          Nexus
        </motion.h1>

        <motion.div
          className="mt-6 h-0.5 w-24 overflow-hidden rounded-full bg-white/10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
        >
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{
              delay: 0.5,
              duration: 1.1,
              ease: "easeInOut",
              repeat: Infinity,
              repeatDelay: 0.15,
            }}
          />
        </motion.div>

        <motion.p
          className="mt-5 text-sm text-slate-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
        >
          Preparing your workspace…
        </motion.p>
      </motion.div>
    </div>
  );
}
