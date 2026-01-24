import { useEffect, useRef, useCallback } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

interface MousePosition {
    x: number;
    y: number;
}

interface UseMouseGlowOptions {
    smoothing?: number; // 0-1, lower = smoother
    elementRef: React.RefObject<HTMLElement>;
}

/**
 * Hook to create a smooth mouse-following glow effect
 * Uses requestAnimationFrame for smooth interpolation
 */
export function useMouseGlow({ smoothing = 0.1, elementRef }: UseMouseGlowOptions) {
    const prefersReducedMotion = usePrefersReducedMotion();
    const mousePosition = useRef<MousePosition>({ x: 0, y: 0 });
    const currentPosition = useRef<MousePosition>({ x: 0, y: 0 });
    const animationFrame = useRef<number>(0);

    const updateGlow = useCallback(() => {
        if (!elementRef.current || prefersReducedMotion) return;

        // Smooth interpolation
        currentPosition.current.x += (mousePosition.current.x - currentPosition.current.x) * smoothing;
        currentPosition.current.y += (mousePosition.current.y - currentPosition.current.y) * smoothing;

        // Update CSS variables
        elementRef.current.style.setProperty('--glow-x', `${currentPosition.current.x}px`);
        elementRef.current.style.setProperty('--glow-y', `${currentPosition.current.y}px`);

        animationFrame.current = requestAnimationFrame(updateGlow);
    }, [elementRef, smoothing, prefersReducedMotion]);

    useEffect(() => {
        const element = elementRef.current;
        if (!element || prefersReducedMotion) return;

        const handleMouseMove = (e: MouseEvent) => {
            const rect = element.getBoundingClientRect();
            mousePosition.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            };
        };

        const handleMouseEnter = () => {
            element.style.setProperty('--glow-opacity', '1');
            animationFrame.current = requestAnimationFrame(updateGlow);
        };

        const handleMouseLeave = () => {
            element.style.setProperty('--glow-opacity', '0');
            cancelAnimationFrame(animationFrame.current);
        };

        element.addEventListener('mousemove', handleMouseMove);
        element.addEventListener('mouseenter', handleMouseEnter);
        element.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            element.removeEventListener('mousemove', handleMouseMove);
            element.removeEventListener('mouseenter', handleMouseEnter);
            element.removeEventListener('mouseleave', handleMouseLeave);
            cancelAnimationFrame(animationFrame.current);
        };
    }, [elementRef, updateGlow, prefersReducedMotion]);

    return { prefersReducedMotion };
}
