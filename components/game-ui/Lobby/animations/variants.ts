import { Variants } from "framer-motion";

const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6 } },
};

const sidePanelVariants: Variants = {
  hidden: (direction: "left" | "right") => ({
    opacity: 0,
    x: direction === "left" ? -40 : 40,
  }),
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: [0.25, 1, 0.5, 1], delay: 0.1 },
  },
};

const playerSlotVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
  exit: { opacity: 0, scale: 0.9, y: -10, transition: { duration: 0.25 } },
};

const renameModalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 16 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.22, ease: [0.25, 1, 0.5, 1] },
  },
  exit: { opacity: 0, scale: 0.96, y: 8, transition: { duration: 0.15 } },
};

export {
    backdropVariants, playerSlotVariants, renameModalVariants, sidePanelVariants
};

