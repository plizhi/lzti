import { describe, it, expect } from 'vitest';
import {
  validatePhone,
  validatePassword,
  validateQuestionnaireType,
  validateStageId,
  validateAnswers,
} from '@/lib/validators';

describe('validatePhone', () => {
  it('should accept valid Chinese phone numbers', () => {
    expect(validatePhone('13812345678')).toBe('13812345678');
    expect(validatePhone('19912345678')).toBe('19912345678');
    expect(validatePhone('15012345678')).toBe('15012345678');
  });

  it('should reject invalid phone numbers', () => {
    expect(() => validatePhone('12345678901')).toThrow();
    expect(() => validatePhone('1381234567')).toThrow(); // too short
    expect(() => validatePhone('abc')).toThrow(); // not a number
    expect(() => validatePhone('')).toThrow(); // empty
    expect(() => validatePhone('138123456789')).toThrow(); // too long
  });

  it('should reject non-string inputs', () => {
    expect(() => validatePhone(12345678901 as unknown as string)).toThrow();
    expect(() => validatePhone(null)).toThrow();
    expect(() => validatePhone(undefined)).toThrow();
  });
});

describe('validatePassword', () => {
  it('should accept valid passwords (6-20 chars)', () => {
    expect(validatePassword('123456')).toBe('123456');
    expect(validatePassword('password123')).toBe('password123');
    expect(validatePassword('a'.repeat(20))).toBe('a'.repeat(20));
  });

  it('should reject passwords that are too short', () => {
    expect(() => validatePassword('12345')).toThrow();
    expect(() => validatePassword('')).toThrow();
  });

  it('should reject passwords that are too long', () => {
    expect(() => validatePassword('a'.repeat(21))).toThrow();
  });

  it('should reject non-string inputs', () => {
    expect(() => validatePassword(123456 as unknown as string)).toThrow();
    expect(() => validatePassword(null)).toThrow();
  });
});

describe('validateQuestionnaireType', () => {
  it('should accept valid questionnaire types', () => {
    expect(validateQuestionnaireType('parent')).toBe('parent');
    expect(validateQuestionnaireType('student')).toBe('student');
    expect(validateQuestionnaireType('teacher')).toBe('teacher');
  });

  it('should reject invalid questionnaire types', () => {
    expect(() => validateQuestionnaireType('invalid')).toThrow();
    expect(() => validateQuestionnaireType('')).toThrow();
    expect(() => validateQuestionnaireType('PARENT')).toThrow(); // case sensitive
  });

  it('should reject non-string inputs', () => {
    expect(() => validateQuestionnaireType(123 as unknown as string)).toThrow();
    expect(() => validateQuestionnaireType(null)).toThrow();
  });
});

describe('validateStageId', () => {
  it('should accept valid stage IDs', () => {
    expect(validateStageId('primary-low')).toBe('primary-low');
    expect(validateStageId('primary-high')).toBe('primary-high');
    expect(validateStageId('junior-1')).toBe('junior-1');
    expect(validateStageId('junior-3')).toBe('junior-3');
    expect(validateStageId('senior-1')).toBe('senior-1');
    expect(validateStageId('senior-3')).toBe('senior-3');
  });

  it('should reject invalid stage IDs', () => {
    expect(() => validateStageId('invalid')).toThrow();
    expect(() => validateStageId('')).toThrow();
    expect(() => validateStageId('primary_low')).toThrow(); // underscore not hyphen
  });

  it('should reject non-string inputs', () => {
    expect(() => validateStageId(123 as unknown as string)).toThrow();
    expect(() => validateStageId(null)).toThrow();
  });
});

describe('validateAnswers', () => {
  it('should accept valid answers (1-5)', () => {
    const answers = { 'q1': 1, 'q2': 2, 'q3': 3, 'q4': 4, 'q5': 5 };
    expect(validateAnswers(answers)).toEqual(answers);
  });

  it('should accept empty answers', () => {
    expect(validateAnswers({})).toEqual({});
  });

  it('should reject answers outside 1-5 range', () => {
    expect(() => validateAnswers({ 'q1': 0 })).toThrow();
    expect(() => validateAnswers({ 'q1': 6 })).toThrow();
    expect(() => validateAnswers({ 'q1': -1 })).toThrow();
    expect(() => validateAnswers({ 'q1': 10 })).toThrow();
  });

  it('should reject non-integer answers', () => {
    expect(() => validateAnswers({ 'q1': 1.5 })).toThrow();
    expect(() => validateAnswers({ 'q1': 2.9 })).toThrow();
  });

  it('should reject non-number answers', () => {
    expect(() => validateAnswers({ 'q1': '1' })).toThrow();
    expect(() => validateAnswers({ 'q1': null })).toThrow();
    expect(() => validateAnswers({ 'q1': undefined })).toThrow();
  });

  it('should reject non-object inputs', () => {
    expect(() => validateAnswers([])).toThrow();
    expect(() => validateAnswers('string')).toThrow();
    expect(() => validateAnswers(null)).toThrow();
    expect(() => validateAnswers(123)).toThrow();
  });

  it('should reject arrays (even empty)', () => {
    expect(() => validateAnswers([])).toThrow();
  });
});
