import type { SVGProps } from 'react';
import type { Check5Key } from '@/lib/check5';

export type IconName = 'need' | 'fix' | 'flow' | 'below' | 'closed' | 'hand' | 'flush' | 'drain' | 'home' | 'menu' | 'chart' | 'bell' | 'shield' | 'send' | 'check' | 'alert' | 'message' | 'arrow' | 'user' | 'book' | 'logout' | 'qr';

/** One consistent stroke icon set for the bedside interface. */
export function UiIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    qr: <><rect x="4" y="4" width="9" height="9" rx="1"/><rect x="19" y="4" width="9" height="9" rx="1"/><rect x="4" y="19" width="9" height="9" rx="1"/><path d="M19 19h4v4h5m-9 0v5h4m5 0v-1M8 8h1m14 0h1M8 23h1"/></>,
    logout: <><path d="M14 5H5v22h9m-1-11h16m-6-6 6 6-6 6"/></>,
    need: <><rect x="6" y="5" width="20" height="24" rx="3"/><rect x="11" y="3" width="10" height="5" rx="2" fill="currentColor" stroke="none"/><path d="m10 13 1 1 2-2m3 1h6m-12 6h3m3 0h6m-12 5h3m3 0h6"/></>,
    fix: <><path d="m10 22 12-12m-8-4 12 12M7 13l6-6a5 5 0 0 1 7 7L9 25a4 4 0 0 1-6-6l6-6m10 6 6-6a4 4 0 0 0-6-6"/><path d="m14 14 4 4"/></>,
    flow: <><path d="M16 3C13 10 6 16 6 21a10 10 0 0 0 20 0c0-5-7-11-10-18Z"/><path d="M10 21c0 3 2 5 5 6"/></>,
    below: <><path d="M16 2v7m-5-5h10"/><rect x="7" y="9" width="18" height="20" rx="3"/><path d="M11 14h10m-5 3v8m-3-3 3 3 3-3"/></>,
    closed: <><rect x="6" y="14" width="20" height="15" rx="3"/><path d="M10 14V9a6 6 0 0 1 12 0v5m-6 6v4"/><circle cx="16" cy="20" r="1"/></>,
    hand: <><path d="M11 17V7a2.5 2.5 0 0 1 5 0v8m0-7a2.5 2.5 0 0 1 5 0v7m0-5a2.5 2.5 0 0 1 5 0v9a9 9 0 0 1-9 9h-3a9 9 0 0 1-9-9v-4a2.5 2.5 0 0 1 5 0v2"/><path d="M6 4 5 2m3 1 1-2M4 8 2 7"/></>,
    flush: <><path d="M16 3c-3 7-10 13-10 18a10 10 0 0 0 20 0c0-5-7-11-10-18Z"/><path d="M11 20h10m-5-5v10"/></>,
    drain: <><path d="M9 4h14v9a7 7 0 0 1-7 7 7 7 0 0 1-7-7Z"/><path d="M16 20v5m-3 0h6"/><path d="M12 28h8"/></>,
    home: <><path d="m3 15 13-11 13 11M7 13v15h18V13"/><path d="M13 28V18h6v10"/></>,
    menu: <path d="M6 8h20M6 16h20M6 24h20"/>,
    chart: <><path d="M5 4v24h24M10 23v-5m7 5v-9m7 9V9"/><path d="m9 12 7-5 5 2 6-6"/></>,
    bell: <><path d="M8 13a8 8 0 0 1 16 0v7l3 4H5l3-4Zm5 15h6M16 2v3"/></>,
    shield: <><path d="m16 3 11 4v9c0 7-6 11-11 14C11 27 5 23 5 16V7Z"/><path d="M16 11v10m-5-5h10"/></>,
    send: <><path d="m3 13 26-10-10 26-5-11-11-5Zm11 5L29 3"/></>,
    check: <path d="m6 16 7 7L27 9"/>,
    alert: <><path d="M16 7v12"/><circle cx="16" cy="25" r="1.5" fill="currentColor" stroke="none"/></>,
    message: <><path d="M28 14c0 7-6 11-13 11l-9 4 2-7a10 10 0 0 1-4-8C4 7 10 3 16 3s12 4 12 11Z"/><path d="M10 14h.1m6 0h.1m6 0h.1" strokeWidth="3"/></>,
    arrow: <path d="M6 16h20m-7-7 7 7-7 7"/>,
    user: <><circle cx="16" cy="10" r="6" fill="currentColor" stroke="none"/><path d="M5 29v-5a11 11 0 0 1 22 0v5" fill="currentColor" stroke="none"/></>,
    book: <><path d="M16 7C12 4 7 4 3 5v22c5-2 9-1 13 1 4-2 8-3 13-1V5c-4-1-9-1-13 2Zm0 0v21M7 10h5m-5 5h5m8-5h5m-5 5h5"/></>,
  };
  return <svg viewBox="0 0 32 32" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}

export function BundleIcon({ name }: { name: Check5Key }) {
  return <span className="bundle-icon" data-item={name}><UiIcon name={name}/></span>;
}
