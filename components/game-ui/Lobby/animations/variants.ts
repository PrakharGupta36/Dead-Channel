import { Variants } from "framer-motion";

// Lightweight backdrop
const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.15,
    },
  },
};

const sidePanelVariants: Variants = {
  hidden: (direction: "left" | "right") => ({
    opacity: 0,
    x: direction === "left" ? -8 : 8,
  }),
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.18,
      ease: "easeOut",
    },
  },
};

const playerSlotVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 4,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.15,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.1,
    },
  },
};

const renameModalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.995,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.12,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.08,
    },
  },
};

// Completely disable animations
const zeroVariants: Variants = {
  hidden: {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
  },
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    transition: {
      duration: 0,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0,
    },
  },
};

export {
  backdropVariants,
  playerSlotVariants,
  renameModalVariants,
  sidePanelVariants,
  zeroVariants
};

