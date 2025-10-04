"use client";
import { useEffect, useState } from "react";

interface AnimatedNumberProps {
  value: number;
  duration?: number; // in ms
}

const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  duration = 800,
}) => {
  const [displayValue, setDisplayValue] = useState(value); // Start with the actual value to prevent hydration mismatch
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return; // Only animate on client side

    let start: number | null = null;
    const initialValue = displayValue;
    const change = value - initialValue;

    if (change === 0) return; // No animation needed

    setDisplayValue(0); // Reset to 0 for animation

    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setDisplayValue(Math.floor(change * progress));
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }, [value, isClient, duration]);

  // Show static value during SSR and initial client render
  if (!isClient) {
    return <span>{value}</span>;
  }

  return <span>{displayValue}</span>;
};

export default AnimatedNumber;
