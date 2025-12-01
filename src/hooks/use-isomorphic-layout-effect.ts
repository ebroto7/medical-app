import { useEffect, useLayoutEffect } from 'react';

// Use useLayoutEffect on client side and useEffect on server side
// This prevents hydration mismatches with GSAP animations
export const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;