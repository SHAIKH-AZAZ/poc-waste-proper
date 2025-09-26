"use client";
import { FlipWords } from "../ui/flip-words";

export function HeadDemo() {
  const words = [
    "Buniadbyte",
    "Bar Cutting Optimization",
    "Dynamic Bar Cutting",
    "Greedy Bar Cutting",
  ];
  return (
    <div>
      <p className="mt-4 text-center text-base text-shadow-neutral-600 dark:text-neutral-400 ">
        A prototype for waste optimzation for Bar cutting
      </p>

      <div className="grid grid-col text-4xl mx-auto font-normal text-neutral-900 dark:text-neutral-800">
        {/* <div className="grid-cols-1">

        </div> */}
        <div className="text-center">Welcome</div>
        <FlipWords words={words} className="text-center" /> <br />
      </div>
    </div>
  );
}
