import { describe, it, expect } from 'vitest';

describe('API Response Utilities', () => {
  it('apiSuccess should create correct response format', () => {
    const mockData = { id: '123', name: 'test' };
    const result = { success: true, data: mockData };

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockData);
  });

  it('ApiError should have correct properties', () => {
    class ApiError extends Error {
      constructor(
        message: string,
        public status: number = 400
      ) {
        super(message);
        this.name = 'ApiError';
      }
    }

    const error = new ApiError('Not found', 404);

    expect(error.message).toBe('Not found');
    expect(error.status).toBe(404);
    expect(error.name).toBe('ApiError');
  });
});
