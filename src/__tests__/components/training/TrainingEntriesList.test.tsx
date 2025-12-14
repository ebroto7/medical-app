/**
 * TrainingEntriesList Component Tests
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TrainingEntriesList } from '@/components/training/TrainingEntriesList';
import { useAuth } from '@/contexts/AuthContext';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks
vi.mock('@/contexts/AuthContext', () => ({
    useAuth: vi.fn(),
}));

// Mock Lucide icons needed for list
vi.mock('lucide-react', () => ({
    Dumbbell: () => <div data-testid="icon-dumbbell" />,
    Clock: () => <div data-testid="icon-clock" />,
    Trash2: () => <div data-testid="icon-trash" />,
    // Types icons
    Heart: () => <div data-testid="icon-heart" />,
    Activity: () => <div data-testid="icon-activity" />,
    Zap: () => <div data-testid="icon-zap" />,
    Flame: () => <div data-testid="icon-flame" />,
    Users: () => <div data-testid="icon-users" />,
    AlertCircle: () => <div data-testid="icon-alert" />,
    Sparkles: () => <div data-testid="icon-sparkles" />,
    MoreHorizontal: () => <div data-testid="icon-more" />,
}));

describe('TrainingEntriesList', () => {
    const mockToken = 'mock-token';
    const mockSessions = [
        {
            id: 's1',
            date: '2025-01-01',
            time: '10:00:00',
            type: 'cardio',
            duration_minutes: 45,
            description: 'Morning Run',
            created_at: new Date().toISOString()
        },
        {
            id: 's2',
            date: '2025-01-01',
            time: '18:00:00',
            type: 'strength',
            duration_minutes: 60,
            description: null,
            created_at: new Date().toISOString()
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        (useAuth as any).mockReturnValue({ token: mockToken });
        global.fetch = vi.fn();
        global.confirm = vi.fn(() => true);
    });

    it('renders loading state initially', async () => {
        (global.fetch as any).mockImplementation(() => new Promise(() => { }));
        render(<TrainingEntriesList userId="u1" />);
        expect(screen.getByText('Cargando entrenamientos...')).toBeInTheDocument();
    });

    it('renders empty state (null) when no sessions', async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ data: [] }),
        });
        const { container } = render(<TrainingEntriesList userId="u1" />);
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalled();
        });
        expect(container).toBeEmptyDOMElement(); // Component returns null
    });

    it('renders sessions list', async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ data: mockSessions }),
        });

        render(<TrainingEntriesList userId="u1" />);

        await waitFor(() => {
            expect(screen.getByText('Entrenamientos (2)')).toBeInTheDocument();
        });

        expect(screen.getByText('Morning Run')).toBeInTheDocument();
        // Check formatting duration
        expect(screen.getByText(/45 min/)).toBeInTheDocument();
        expect(screen.getByText(/1h/)).toBeInTheDocument(); // 60 min

        // Time formatting check (HH:MM)
        // Note: Icon mock might interfere with text matching if not simple
        // Using findByText to be safe with async
        expect(await screen.findByText(/10:00/)).toBeInTheDocument();
    });

    it('handles delete session', async () => {
        (global.fetch as any)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: mockSessions }),
            })
            .mockResolvedValueOnce({ // Delete response
                ok: true,
                json: async () => ({}),
            });

        render(<TrainingEntriesList userId="u1" />);

        await waitFor(() => {
            expect(screen.getByText('Morning Run')).toBeInTheDocument();
        });

        const deleteButtons = screen.getAllByTestId('icon-trash');
        fireEvent.click(deleteButtons[0].parentElement!); // Click button wrapper

        expect(global.confirm).toHaveBeenCalled();
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/training/sessions?id=s1'),
            expect.objectContaining({ method: 'DELETE' })
        );

        await waitFor(() => {
            expect(screen.queryByText('Morning Run')).not.toBeInTheDocument();
        });
        // Should still show second session
        expect(screen.getByText(/1h/)).toBeInTheDocument();
    });
});
