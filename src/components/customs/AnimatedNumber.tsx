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
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Only animate if the value actually changes and we're on the client
    if (displayValue !== value && typeof window !== 'undefined') {
      setIsAnimating(true);
      
      let start: number | null = null;
      const initialValue = displayValue;
      const change = value - initialValue;

      const step = (timestamp: number) => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        const currentValue = Math.floor(initialValue + change * progress);
        setDisplayValue(currentValue);
        
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          setIsAnimating(false);
        }
      };

      requestAnimationFrame(step);
    }
  }, [value, duration, displayValue]);

  return <span className={isAnimating ? "transition-all duration-200" : ""}>{displayValue}</span>;
};

export default AnimatedNumber;
