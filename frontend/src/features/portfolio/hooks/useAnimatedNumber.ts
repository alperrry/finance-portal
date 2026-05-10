import { useEffect, useRef, useState } from "react";
import { toNumber } from "../utils/portfolioFormatters";

export function useAnimatedNumber(value: number | null | undefined, duration = 700): number {
    const target = toNumber(value) ?? 0;
    const [displayValue, setDisplayValue] = useState(target);
    const displayValueRef = useRef(target);

    useEffect(() => {
        displayValueRef.current = displayValue;
    }, [displayValue]);

    useEffect(() => {
        const startValue = displayValueRef.current;
        const startedAt = performance.now();
        let frame = 0;

        const tick = (now: number) => {
            const progress = Math.min((now - startedAt) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const nextValue = startValue + (target - startValue) * eased;
            displayValueRef.current = nextValue;
            setDisplayValue(nextValue);
            if (progress < 1) frame = requestAnimationFrame(tick);
        };

        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [target, duration]);

    return displayValue;
}
