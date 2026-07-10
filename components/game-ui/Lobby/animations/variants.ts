import { Variants } from "framer-motion";

const EASE_SHARP = [0.16, 1, 0.3, 1] as const;
const EASE_OUT = [0.25, 1, 0.5, 1] as const;

export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2 },
  },
};

export const wipeVariants: Variants = {
  hidden: {
    clipPath: "inset(0 100% 0 0)",
    opacity: 0,
  },
  visible: {
    clipPath: "inset(0 0% 0 0)",
    opacity: 1,
    transition: {
      clipPath: { duration: 0.35, ease: EASE_SHARP },
      opacity: { duration: 0.1 },
    },
  },
};


export const sidePanelVariants: Variants = {
  hidden: { opacity: 0, x: -12 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.25, ease: EASE_SHARP },
  },
};


export const playerSlotVariants: Variants = {
  hidden: { opacity: 0, y: 6, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.2, ease: EASE_OUT },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: { duration: 0.1 },
  },
};


export const staggerContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.1,
    },
  },
};


export const renameModalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.97, y: 6 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.15, ease: EASE_SHARP },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: 0.1 },
  },
};


export const zeroVariants: Variants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1, transition: { duration: 0 } },
  exit: { opacity: 0, transition: { duration: 0 } },
};
