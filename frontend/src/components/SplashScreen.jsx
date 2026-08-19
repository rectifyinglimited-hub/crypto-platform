/**
 * Post sign-in splash — equiti mark + neon pulse.
 */

import { motion } from "framer-motion";
import BrandLogo from "./BrandLogo.jsx";
import VideoBackdrop from "./VideoBackdrop.jsx";
import { CRYPTO_VIDEO, CRYPTO_POSTER } from "../lib/brand.js";

export default function SplashScreen() {
  return (
    <div className="relative grid min-h-screen w-full place-items-center overflow-hidden text-white">
      <VideoBackdrop
        src={CRYPTO_VIDEO}
        poster={CRYPTO_POSTER}
        overlayClassName="bg-black/80"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex flex-col items-center"
      >
        <BrandLogo variant="stack" />
        <motion.div
          className="mt-6 h-0.5 w-24 overflow-hidden rounded-full bg-white/10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
        >
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#39FF14] to-cyan-400"
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
