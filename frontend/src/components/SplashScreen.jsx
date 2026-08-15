/**
 * Post sign-in splash — Binomo mark + neon pulse.
 */

import { motion } from "framer-motion";
import BrandLogo from "./BrandLogo.jsx";
import VideoBackdrop from "./VideoBackdrop.jsx";

export default function SplashScreen() {
  return (
    <div className="relative grid min-h-screen w-full place-items-center overflow-hidden text-white">
      <VideoBackdrop overlayClassName="bg-black/80" />

      <motion.div
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex flex-col items-center"
      >
        <BrandLogo
          variant="mark"
          imgClassName="h-20 w-20 rounded-2xl object-cover shadow-[0_0_40px_rgba(255,193,7,0.55)]"
        />
        <motion.h1
          className="mt-5 text-4xl font-extrabold tracking-tight text-white sm:text-5xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Binomo
        </motion.h1>
        <motion.div
          className="mt-6 h-0.5 w-24 overflow-hidden rounded-full bg-white/10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
        >
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#ffc107] to-cyan-400"
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
