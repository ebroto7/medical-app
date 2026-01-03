/**
 * Performance Tests: React.memo Verification
 *
 * These tests verify that components are properly wrapped with React.memo
 * to prevent unnecessary re-renders.
 *
 * Note: Only tests components that don't require AuthContext or other providers
 */

import { describe, it, expect } from 'vitest';

// GPX Components (these don't use AuthContext directly)
import { ElevationChart } from '@/components/gpx/ElevationChart';
import { MiniElevationChart } from '@/components/gpx/MiniElevationChart';
import { TemporalTimeline } from '@/components/gpx/TemporalTimeline';
import { WaypointsTable } from '@/components/gpx/WaypointsTable';

// Calendar Components (patient views don't use AuthContext directly)
import { PatientDayView } from '@/components/calendar/PatientDayView';
import { PatientWeekView } from '@/components/calendar/PatientWeekView';
import { PatientMonthView } from '@/components/calendar/PatientMonthView';

describe('React.memo Verification', () => {
  describe('GPX Visualization Components', () => {
    it('ElevationChart should be wrapped with React.memo', () => {
      expect(ElevationChart.$$typeof).toBe(Symbol.for('react.memo'));
    });

    it('MiniElevationChart should be wrapped with React.memo', () => {
      expect(MiniElevationChart.$$typeof).toBe(Symbol.for('react.memo'));
    });

    it('TemporalTimeline should be wrapped with React.memo', () => {
      expect(TemporalTimeline.$$typeof).toBe(Symbol.for('react.memo'));
    });

    it('WaypointsTable should be wrapped with React.memo', () => {
      expect(WaypointsTable.$$typeof).toBe(Symbol.for('react.memo'));
    });
  });

  describe('Patient Calendar Components', () => {
    it('PatientDayView should be wrapped with React.memo', () => {
      expect(PatientDayView.$$typeof).toBe(Symbol.for('react.memo'));
    });

    it('PatientWeekView should be wrapped with React.memo', () => {
      expect(PatientWeekView.$$typeof).toBe(Symbol.for('react.memo'));
    });

    it('PatientMonthView should be wrapped with React.memo', () => {
      expect(PatientMonthView.$$typeof).toBe(Symbol.for('react.memo'));
    });
  });
});
