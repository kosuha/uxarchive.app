"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useDraggableScroll() {
    const ref = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    // Track if a legitimate drag occurred to prevent clicks
    const hasDragged = useRef(false);

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        if (!ref.current) return;
        setIsDragging(true);
        hasDragged.current = false;
        setStartX(e.pageX - ref.current.offsetLeft);
        setScrollLeft(ref.current.scrollLeft);
    }, []);

    const onMouseLeave = useCallback(() => {
        setIsDragging(false);
    }, []);

    const onMouseUp = useCallback(() => {
        setIsDragging(false);
        // We don't reset hasDragged here because we need it for the click event that fires immediately after
    }, []);

    const onMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging || !ref.current) return;
        e.preventDefault();
        const x = e.pageX - ref.current.offsetLeft;
        const walk = (x - startX) * 1.5; // Scroll-fast multiplier

        // If moved more than a small threshold, consider it a drag
        if (Math.abs(walk) > 5) {
            hasDragged.current = true;
        }

        ref.current.scrollLeft = scrollLeft - walk;
    }, [isDragging, startX, scrollLeft]);

    const onClickCapture = useCallback((e: React.MouseEvent) => {
        if (hasDragged.current) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, []);

    return {
        ref,
        events: {
            onMouseDown,
            onMouseLeave,
            onMouseUp,
            onMouseMove,
            onClickCapture,
        },
        isDragging,
    };
}
