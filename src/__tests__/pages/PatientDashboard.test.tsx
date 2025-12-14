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

vi.mock('@/components/nutrition/NutritionEntryForm', () => ({
    NutritionEntryForm: () => <div data-testid="nutrition-form">Nutrition Form Mock</div>,
}));

vi.mock('@/components/training/TrainingEntryForm', () => ({
    TrainingEntryForm: () => <div data-testid="training-form">Training Form Mock</div>,
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

    it('renders tabs and switches forms', async () => {
        const user = userEvent.setup();
        render(<PatientDashboardPage />);
        // Default is Meal Form
        expect(screen.getByTestId('nutrition-form')).toBeInTheDocument();
        expect(screen.queryByTestId('training-form')).not.toBeInTheDocument();

        // Switch to Training
        // ShadCN Tabs use triggers. We look for text "Entreno".
        const tabTrigger = screen.getByText('Entreno');
        await user.click(tabTrigger);

        await waitFor(() => {
            expect(screen.getByTestId('training-form')).toBeInTheDocument();
        });
        expect(screen.queryByTestId('nutrition-form')).not.toBeInTheDocument();
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
