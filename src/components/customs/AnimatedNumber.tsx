import { useEffect, useState } from "react";

interface AnimatedNumberProps {
  value: number;
  duration?: number; // in ms
}

const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  duration = 800,
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start: number | null = null;
    const initialValue = displayValue;
    const change = value - initialValue;

    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setDisplayValue(Math.floor(initialValue + change * progress));
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }, [value]);

  return <span>{displayValue}</span>;
};

export default AnimatedNumber;
