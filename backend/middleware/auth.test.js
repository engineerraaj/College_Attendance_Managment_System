import { describe, it, expect, vi } from 'vitest';
import { allow, departmentScope } from './auth.js';

describe('Authentication Middleware', () => {
  it('should allow admin access', () => {
    const req = { user: { role: 'admin' } };
    const next = vi.fn();
    const res = {};

    allow('admin')(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should reject unauthorized users', () => {
    const req = { user: { role: 'student' } };
    const next = vi.fn();
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };

    allow('admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('should handle HOD with no departments safely', () => {
    const req = {
      user: { role: 'hod', departments: [] },
      query: {}
    };
    const next = vi.fn();

    departmentScope(req, {}, next);

    expect(req.hodDepartments).toEqual([]);
    expect(next).toHaveBeenCalled();
  });
});