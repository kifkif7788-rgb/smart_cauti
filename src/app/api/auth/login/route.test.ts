import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { db } from '@/lib/db';

vi.mock('@/lib/db', () => ({ db: vi.fn(), writeAudit: vi.fn() }));
vi.mock('@/lib/auth', () => ({
  isValidPinFormat: (value: unknown) => typeof value === 'string' && /^\d{6}$/.test(value),
  verifyPin: vi.fn(), createSessionToken: vi.fn(), setSessionCookie: vi.fn(),
}));

const request = () => new NextRequest('https://example.com/api/auth/login', {
  method: 'POST', body: JSON.stringify({ employeeId: 'TEST', pin: '123456' }),
  headers: { 'Content-Type': 'application/json' },
});

beforeEach(() => {
  vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-only-key');
  vi.stubEnv('SESSION_SECRET', 'test-only-secret-with-at-least-32-characters');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.resetAllMocks(); });

describe('login deployment failures', () => {
  it.each(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SESSION_SECRET'])(
    'returns a JSON configuration error if %s is missing', async key => {
      vi.stubEnv(key, '');
      const response = await POST(request());
      expect(response.status).toBe(503);
      expect((await response.json()).error).toContain('ตั้งค่า');
      expect(db).not.toHaveBeenCalled();
    },
  );
  it('rejects a short session signing secret before querying the database', async () => {
    vi.stubEnv('SESSION_SECRET', 'short');
    expect((await POST(request())).status).toBe(503);
    expect(db).not.toHaveBeenCalled();
  });
  it('returns JSON rather than an empty 500 when the database client throws', async () => {
    vi.mocked(db).mockImplementation(() => { throw new Error('private-internal-detail'); });
    const response = await POST(request());
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain('ขัดข้อง');
    expect(JSON.stringify(body)).not.toContain('private-internal-detail');
  });
});
