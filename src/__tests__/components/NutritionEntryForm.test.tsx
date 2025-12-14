import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NutritionEntryForm } from '@/components/nutrition/NutritionEntryForm';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';

// Mocks
const mockUseAuth = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
    useAuth: () => mockUseAuth(),
}));

// Mock UI components to simplify DOM
vi.mock('@/components/ui/input', () => ({
    Input: (props: any) => <input {...props} />,
}));
vi.mock('@/components/ui/textarea', () => ({
    Textarea: (props: any) => <textarea {...props} />,
}));
vi.mock('@/components/ui/select', () => ({
    Select: ({ children, ...props }: any) => <select {...props}>{children}</select>,
}));
// Image optimization mock
vi.mock('@/lib/image-optimization', () => ({
    compressImage: vi.fn(),
    formatFileSize: () => '100KB'
}));

global.fetch = vi.fn();

describe('NutritionEntryForm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseAuth.mockReturnValue({
            user: { id: 'user-1' },
            token: 'fake-token',
        });
    });

    it('should show login message if not authenticated', () => {
        mockUseAuth.mockReturnValue({ user: null });
        render(<NutritionEntryForm />);
        expect(screen.getByText(/inicia sesión/i)).toBeInTheDocument();
    });

    it('should render form when authenticated', () => {
        render(<NutritionEntryForm />);
        expect(screen.getByText(/Nueva Entrada/i)).toBeInTheDocument();
    });

    it('should submit form with valid data', async () => {
        render(<NutritionEntryForm />);
        const user = userEvent.setup();

        // Fill Date (default is today)
        // Label is not associated, so we access by name or simple query
        const dateInput = document.querySelector('input[name="date"]') as HTMLInputElement;
        if (dateInput) {
            await user.clear(dateInput);
            await user.type(dateInput, '2023-10-10');
        }

        // Fill Meal Type
        // Select is mocked as <select>, search by name
        const select = document.querySelector('select[name="mealType"]') as HTMLSelectElement;
        if (select) {
            await user.selectOptions(select, 'lunch');
        }

        // Fill Description
        await user.type(screen.getByPlaceholderText(/Describe qué comiste/i), 'Tasty salad');

        // Mock fetch response
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ data: [{ id: 'entry-123' }] }),
        });

        // Submit
        const submitBtn = screen.getByRole('button', { name: /Guardar Entrada/i });
        await user.click(submitBtn);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/nutrition/entries',
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('"mealType":"lunch"'),
                })
            );
        });
    });
});
