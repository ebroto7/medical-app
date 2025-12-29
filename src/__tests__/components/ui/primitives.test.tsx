/**
 * UI Primitives Tests
 * Grouped for efficiency as they are simple visual/functional wrappers
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { describe, it, expect, vi } from 'vitest';

describe('UI Primitives', () => {
    describe('Button', () => {
        it('renders default variant correctly', () => {
            render(<Button>Click me</Button>);
            const btn = screen.getByText('Click me');
            expect(btn).toHaveClass('bg-primary'); // Default variant has bg-primary
            expect(btn).toHaveClass('text-primary-foreground');
        });

        it('renders destructive variant correctly', () => {
            render(<Button variant="destructive">Delete</Button>);
            const btn = screen.getByText('Delete');
            expect(btn).toHaveClass('bg-destructive');
            expect(btn).toHaveClass('text-destructive-foreground');
        });

        it('handles click events', () => {
            const handleClick = vi.fn();
            render(<Button onClick={handleClick}>Action</Button>);
            fireEvent.click(screen.getByText('Action'));
            expect(handleClick).toHaveBeenCalledTimes(1);
        });

        it('respects disabled state', () => {
            const handleClick = vi.fn();
            render(<Button disabled onClick={handleClick}>Disabled</Button>);
            const btn = screen.getByText('Disabled');
            expect(btn).toBeDisabled();
            fireEvent.click(btn);
            expect(handleClick).not.toHaveBeenCalled();
        });

        it('renders asChild (polymorphism)', () => {
            render(
                <Button asChild>
                    <a href="/link">Link Button</a>
                </Button>
            );
            const link = screen.getByText('Link Button');
            expect(link.tagName).toBe('A');
            expect(link).toHaveAttribute('href', '/link');
            expect(link).toHaveClass('inline-flex'); // Should still have button classes
        });
    });

    describe('Select', () => {
        it('renders native select with options', () => {
            render(
                <Select defaultValue="b">
                    <option value="a">Option A</option>
                    <option value="b">Option B</option>
                </Select>
            );
            const select = screen.getByRole('combobox');
            expect(select).toBeInTheDocument();
            expect(screen.getByText('Option A')).toBeInTheDocument();
        });

        it('passes classNames and props', () => {
            render(
                <Select className="custom-class" disabled data-testid="select">
                    <option>Opt</option>
                </Select>
            );
            const select = screen.getByTestId('select');
            expect(select).toHaveClass('custom-class');
            expect(select).toBeDisabled();
        });

        // Icon check is tricky as it is decorative SVG. 
        // We assume it renders if component renders without crash.
    });
});
