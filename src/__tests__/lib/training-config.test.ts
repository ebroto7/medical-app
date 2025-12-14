/**
 * Tests for Training Configuration
 */

import { describe, it, expect } from 'vitest';
import { getTrainingTypeConfig, trainingTypes, trainingTypeRecord } from '@/lib/training-config';

describe('Training Configuration', () => {
    it('should retrieve correct config for known types', () => {
        const cardio = getTrainingTypeConfig('cardio');
        expect(cardio.label).toBe('Cardio');
        expect(cardio.value).toBe('cardio');
        expect(cardio.colorClasses).toContain('bg-accent-red');
    });

    it('should return fallback for unknown types', () => {
        // @ts-ignore - Testing runtime fallback
        const unknown = getTrainingTypeConfig('swimming');
        const fallback = trainingTypes[trainingTypes.length - 1]; // 'other'

        expect(unknown).toEqual(fallback);
        expect(unknown.value).toBe('other');
    });

    it('should match record and array configurations', () => {
        // Verify consistency between the array and the record object
        const strengthFromArray = trainingTypes.find(t => t.value === 'strength');
        const strengthFromRecord = trainingTypeRecord['strength'];

        expect(strengthFromArray).toBeDefined();
        if (strengthFromArray) {
            // Record omits 'value', so match other props
            expect(strengthFromArray.label).toBe(strengthFromRecord.label);
            expect(strengthFromArray.icon).toBe(strengthFromRecord.icon);
        }
    });
});
