'use client';

import { useState } from 'react';
import { UiIcon } from './UiIcon';

export function LogoutButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function logout() {
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Logout failed');

      // A full navigation also discards the authenticated client router cache.
      window.location.replace('/login');
    } catch {
      setError('ออกจากระบบไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง');
      setBusy(false);
    }
  }

  return (
    <div className="logout-menu-item">
      <button type="button" onClick={logout} disabled={busy} aria-busy={busy}>
        <UiIcon name="logout" />
        {busy ? 'กำลังออกจากระบบ…' : 'ออกจากระบบ'}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
