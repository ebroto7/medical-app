/**
 * Tests for Nutrition Validation Schemas
 * Tests Zod schemas for nutrition entries
 */

import { describe, it, expect } from 'vitest';
import {
    createNutritionEntrySchema,
    updateNutritionEntrySchema,
    mealTypeSchema,
    mealTypes,
} from '@/lib/validations/nutrition';

describe('Nutrition Validation Schemas', () => {
    describe('mealTypeSchema', () => {
        it('should accept all valid meal types', () => {
            mealTypes.forEach((mealType) => {
                const result = mealTypeSchema.safeParse(mealType);
                expect(result.success).toBe(true);
            });
        });

        it('should reject invalid meal types', () => {
            const result = mealTypeSchema.safeParse('brunch');
            expect(result.success).toBe(false);
        });

        it('should reject empty string', () => {
            const result = mealTypeSchema.safeParse('');
            expect(result.success).toBe(false);
        });
    });

    describe('createNutritionEntrySchema', () => {
        const validEntry = {
            date: '2024-12-14',
            mealType: 'breakfast',
        };

        it('should accept valid entry with required fields only', () => {
            const result = createNutritionEntrySchema.safeParse(validEntry);
            expect(result.success).toBe(true);
        });

        it('should accept valid entry with all fields', () => {
            const fullEntry = {
                ...validEntry,
                description: 'Tortilla con pan integral',
                time: '08:30',
            };
            const result = createNutritionEntrySchema.safeParse(fullEntry);
            expect(result.success).toBe(true);
        });

        describe('date validation', () => {
            it('should accept YYYY-MM-DD format', () => {
                const result = createNutritionEntrySchema.safeParse({
                    ...validEntry,
                    date: '2024-01-01',
                });
                expect(result.success).toBe(true);
            });

            it('should reject DD-MM-YYYY format', () => {
                const result = createNutritionEntrySchema.safeParse({
                    ...validEntry,
                    date: '14-12-2024',
                });
                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.error.issues[0].message).toContain('YYYY-MM-DD');
                }
            });

            it('should reject date with slashes', () => {
                const result = createNutritionEntrySchema.safeParse({
                    ...validEntry,
                    date: '2024/12/14',
                });
                expect(result.success).toBe(false);
            });

            it('should reject invalid date string', () => {
                const result = createNutritionEntrySchema.safeParse({
                    ...validEntry,
                    date: 'not-a-date',
                });
                expect(result.success).toBe(false);
            });
        });

        describe('time validation', () => {
            it('should accept HH:MM format', () => {
                const result = createNutritionEntrySchema.safeParse({
                    ...validEntry,
                    time: '14:30',
                });
                expect(result.success).toBe(true);
            });

            it('should accept HH:MM:SS format', () => {
                const result = createNutritionEntrySchema.safeParse({
                    ...validEntry,
                    time: '14:30:00',
                });
                expect(result.success).toBe(true);
            });

            it('should reject invalid time format', () => {
                const result = createNutritionEntrySchema.safeParse({
                    ...validEntry,
                    time: '2:30 PM',
                });
                expect(result.success).toBe(false);
            });

            it('should allow missing time (optional)', () => {
                const result = createNutritionEntrySchema.safeParse(validEntry);
                expect(result.success).toBe(true);
            });
        });

        describe('description validation', () => {
            it('should accept description under 2000 chars', () => {
                const result = createNutritionEntrySchema.safeParse({
                    ...validEntry,
                    description: 'A'.repeat(1999),
                });
                expect(result.success).toBe(true);
            });

            it('should reject description over 2000 chars', () => {
                const result = createNutritionEntrySchema.safeParse({
                    ...validEntry,
                    description: 'A'.repeat(2001),
                });
                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.error.issues[0].message).toContain('2000');
                }
            });
        });

        describe('mealType validation', () => {
            it('should accept all valid meal types', () => {
                const types = ['breakfast', 'mid-morning', 'lunch', 'afternoon-snack', 'dinner', 'extra'];
                types.forEach((type) => {
                    const result = createNutritionEntrySchema.safeParse({
                        ...validEntry,
                        mealType: type,
                    });
                    expect(result.success).toBe(true);
                });
            });

            it('should reject invalid meal type', () => {
                const result = createNutritionEntrySchema.safeParse({
                    ...validEntry,
                    mealType: 'snack', // not in enum
                });
                expect(result.success).toBe(false);
            });
        });

        describe('required fields', () => {
            it('should reject missing date', () => {
                const result = createNutritionEntrySchema.safeParse({
                    mealType: 'breakfast',
                });
                expect(result.success).toBe(false);
            });

            it('should reject missing mealType', () => {
                const result = createNutritionEntrySchema.safeParse({
                    date: '2024-12-14',
                });
                expect(result.success).toBe(false);
            });
        });
    });

    describe('updateNutritionEntrySchema', () => {
        it('should accept partial updates', () => {
            const result = updateNutritionEntrySchema.safeParse({
                description: 'Updated description',
            });
            expect(result.success).toBe(true);
        });

        it('should accept empty object (no updates)', () => {
            const result = updateNutritionEntrySchema.safeParse({});
            expect(result.success).toBe(true);
        });

        it('should allow nullable time', () => {
            const result = updateNutritionEntrySchema.safeParse({
                time: null,
            });
            expect(result.success).toBe(true);
        });

        it('should validate date format when provided', () => {
            const result = updateNutritionEntrySchema.safeParse({
                date: 'invalid-date',
            });
            expect(result.success).toBe(false);
        });
    });
});
