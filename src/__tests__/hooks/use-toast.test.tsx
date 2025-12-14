/**
 * Tests for useToast hook
 */
import { renderHook, act } from '@testing-library/react';
import { useToast, toast } from '@/hooks/use-toast';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('useToast Hook', () => {
    beforeEach(() => {
        // Reset state before each test
        // Since state is global (outside hook), we need to clear it via actions
        const { result } = renderHook(() => useToast());
        act(() => {
            result.current.toasts.forEach((t) => {
                result.current.dismiss(t.id);
            });
        });
        // Assuming clear might be async or queued, we might need a more direct reset if provided, 
        // but the implementation doesn't expose a clearAll. 
        // Actually, dispatch is internal. dismissed toasts are removed after delay.
        // For tests, we might get interference if we don't mock timers.
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should return empty toasts initially', () => {
        const { result } = renderHook(() => useToast());
        expect(result.current.toasts).toEqual([]);
    });

    it('should add a toast', () => {
        const { result } = renderHook(() => useToast());

        act(() => {
            toast({ title: 'Test Toast', description: 'Desc' });
        });

        expect(result.current.toasts).toHaveLength(1);
        expect(result.current.toasts[0].title).toBe('Test Toast');
    });

    it('should limit number of toasts', () => {
        const { result } = renderHook(() => useToast());

        act(() => {
            toast({ title: 'Toast 1' });
            toast({ title: 'Toast 2' });
        });

        // TOAST_LIMIT is 1 in the source code
        expect(result.current.toasts).toHaveLength(1);
        expect(result.current.toasts[0].title).toBe('Toast 2');
    });

    it('should dismiss a toast', () => {
        const { result } = renderHook(() => useToast());

        act(() => {
            toast({ title: 'To Dismiss' });
        });

        const toastId = result.current.toasts[0].id;

        act(() => {
            result.current.dismiss(toastId);
        });

        // Dismiss sets open to false, but doesn't remove immediately (queued removal)
        expect(result.current.toasts[0].open).toBe(false);

        // Fast-forward time to trigger removal
        act(() => {
            vi.runAllTimers();
        });

        expect(result.current.toasts).toHaveLength(0);
    });
});
