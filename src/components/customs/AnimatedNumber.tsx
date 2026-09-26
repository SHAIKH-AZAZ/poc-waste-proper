"use client";
import { useEffect, useRef, useState } from "react";

interface AnimatedNumberProps {
  value: number;
  duration?: number; // in ms
}

const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  duration = 800,
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  // Tracks what is currently on screen so an interrupted animation resumes from there
  const fromRef = useRef(value);

  useEffect(() => {
    const initialValue = fromRef.current;
    if (initialValue === value) return;

    const change = value - initialValue;
    let start: number | null = null;
    let frame = 0;

    const step = (timestamp: number) => {
      if (start === null) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const currentValue =
        progress < 1 ? Math.floor(initialValue + change * progress) : value;

      fromRef.current = currentValue;
      setDisplayValue(currentValue);

      if (progress < 1) {
        frame = requestAnimationFrame(step);
      }
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <span>{displayValue}</span>;
};

export default AnimatedNumber;
