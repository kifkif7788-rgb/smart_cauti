import { describe, expect, it } from 'vitest';
import { shouldRevealFeedback, nurseCanSeeDashboard } from './study-mode';
import type { UserRole } from './auth-roles';

describe('shouldRevealFeedback', () => {
  const roles: UserRole[] = ['NURSE', 'AUDITOR', 'WARD_HEAD', 'IC_NURSE', 'ADMIN'];

  it('โหมด BASELINE เปิดเผย feedback กับทุก role', () => {
    for (const role of roles) {
      expect(shouldRevealFeedback('BASELINE', role)).toBe(true);
    }
  });

  it('โหมด INTERVENTION เปิดเผย feedback กับทุก role', () => {
    for (const role of roles) {
      expect(shouldRevealFeedback('INTERVENTION', role)).toBe(true);
    }
  });

  it('AUDITOR เห็น feedback ในโหมด INTERVENTION', () => {
    expect(shouldRevealFeedback('INTERVENTION', 'AUDITOR')).toBe(true);
  });
});

describe('nurseCanSeeDashboard', () => {
  it('ซ่อน dashboard จากพยาบาลในช่วง baseline', () => {
    expect(nurseCanSeeDashboard('BASELINE')).toBe(false);
  });

  it('เปิด dashboard ให้พยาบาลในช่วง intervention', () => {
    expect(nurseCanSeeDashboard('INTERVENTION')).toBe(true);
  });
});
