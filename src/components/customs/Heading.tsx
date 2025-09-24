"use client";
import { LayoutTextFlip } from "@/components/ui/layout-text-flip";
import { motion } from "motion/react";

export function HeadDemo() {
  return (
    <div>
      <motion.div className="relative mx-4 flex flex-col items-center gap-4 text-center sm:mx-0 sm:mb-0 sm:flex-row">
        <LayoutTextFlip text="Welcome to "
        
        words={["Buniadbyte" , "Bar Cutting Optimization" , "Dynamic Bar Cutting" , "Greedy Bar Cutting"]}
        />
      </motion.div>
      <p className="mt-4 text-center text-base text-shadow-neutral-600 dark:text-neutral-400 ">A prototype for waste optimzation for Bar cutting</p>
    </div>
  );
}
