import { describe, expect, it } from 'vitest';
import { qrInputPath } from './qr-input';

describe('QR scan routing', () => {
  it.each(['SM-B02', 'sm-b02', ' SM-B02\n'])(
    'routes plain code %s through authenticated manual entry', value => {
      expect(qrInputPath(value)).toBe('/assess/SM-B02');
    },
  );
  it('preserves signature validation for signed URLs', () => {
    expect(qrInputPath('https://smartcauti.vercel.app/s/SM-B02?k=abcdefghijkl'))
      .toBe('/s/SM-B02?k=abcdefghijkl');
  });
  it('accepts a local signed path', () => {
    expect(qrInputPath('/s/SM-B02?k=abcdefghijkl')).toBe('/s/SM-B02?k=abcdefghijkl');
  });
  it('never redirects to another host', () => {
    expect(qrInputPath('https://other.example/s/SM-B02?k=abcdefghijkl'))
      .toBe('/s/SM-B02?k=abcdefghijkl');
  });
  it('does not downgrade unsigned URLs to manual entry', () => {
    expect(qrInputPath('https://example.com/s/SM-B02')).toBe('/s/SM-B02');
    expect(qrInputPath('/s/SM-B02?k=bad')).toBe('/s/SM-B02?k=bad');
  });
  it.each(['SM-B00', 'SM-B1', 'SM-B100', '', 'random text', 'javascript:alert(1)',
    '/s/SM-B02/extra', 'https://example.com/assess/SM-B02', '//example.com/s/SM-B02'])(
    'rejects unsupported input %s', value => expect(qrInputPath(value)).toBeNull(),
  );
});
