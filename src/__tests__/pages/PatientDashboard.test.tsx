/**
 * Patient Dashboard Integration Tests
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PatientDashboardPage from '@/app/dashboard/patient/page';
import { describe, it, expect, vi } from 'vitest';

// Mock Child Components to test Page composition cleanly
vi.mock('@/components/DashboardLayout', () => ({
    DashboardLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock('@/components/diary/CreateEntryDialog', () => ({
    CreateEntryDialog: ({ open }: { open: boolean }) =>
        open ? <div data-testid="create-entry-dialog">Create Entry Dialog</div> : null,
}));

vi.mock('@/components/calendar/CalendarViewSelector', () => ({
    CalendarViewSelector: ({ currentView, onViewChange }: any) => (
        <div data-testid="view-selector">
            <button onClick={() => onViewChange('day')}>Day</button>
            <button onClick={() => onViewChange('week')}>Week</button>
            <button onClick={() => onViewChange('month')}>Month</button>
            <span>Current: {currentView}</span>
        </div>
    ),
}));

vi.mock('@/components/calendar/DayView', () => ({
    DayView: ({ selectedDate }: any) => <div data-testid="day-view">Day View: {selectedDate.toString()}</div>,
}));

vi.mock('@/components/calendar/WeekView', () => ({
    WeekView: () => <div data-testid="week-view">Week View</div>,
}));

vi.mock('@/components/calendar/MonthView', () => ({
    MonthView: () => <div data-testid="month-view">Month View</div>,
}));

describe('PatientDashboardPage', () => {
    it('renders dashboard structure', () => {
        render(<PatientDashboardPage />);
        expect(screen.getByText('Mi Diario')).toBeInTheDocument();
        expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
        // Default View is month
        expect(screen.getByTestId('month-view')).toBeInTheDocument();
    });

    it('renders FAB button for creating entries', () => {
        render(<PatientDashboardPage />);

        // FAB button should be present (mobile)
        const fabButton = screen.getByLabelText('Nueva entrada');
        expect(fabButton).toBeInTheDocument();
    });

    it('opens dialog when FAB is clicked', async () => {
        const user = userEvent.setup();
        render(<PatientDashboardPage />);

        // Dialog should not be visible initially
        expect(screen.queryByTestId('create-entry-dialog')).not.toBeInTheDocument();

        // Click FAB button
        const fabButton = screen.getByLabelText('Nueva entrada');
        await user.click(fabButton);

        // Dialog should appear
        await waitFor(() => {
            expect(screen.getByTestId('create-entry-dialog')).toBeInTheDocument();
        });
    });

    it('switches calendar views', () => {
        render(<PatientDashboardPage />);
        // Default Month
        expect(screen.getByText('Current: month')).toBeInTheDocument();

        // Switch to Day
        fireEvent.click(screen.getByText('Day'));
        expect(screen.getByTestId('day-view')).toBeInTheDocument();
        expect(screen.queryByTestId('month-view')).not.toBeInTheDocument();
    });
});
