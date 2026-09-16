import { useId } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { UiIcon, type IconName } from './UiIcon';

export function ShieldMark() {
  const id = useId();
  return (
    <svg viewBox="0 0 112 128" fill="none" aria-hidden="true" className="shield-mark">
      <defs><linearGradient id={`${id}-shield`} x1="18" y1="20" x2="95" y2="104" gradientUnits="userSpaceOnUse"><stop stopColor="#57d9c9"/><stop offset="1" stopColor="#16a695"/></linearGradient></defs>
      <path d="M56 4C38 15 20 20 6 24l4 39c4 26 23 47 46 60 23-13 42-34 46-60l4-39C87 19 71 13 56 4Z" fill="#0960b3"/>
      <path d="M56 12C40 22 24 26 14 29l4 33c4 22 19 41 38 53 19-12 34-31 38-53l4-33c-16-4-30-10-42-17Z" fill={`url(#${id}-shield)`}/>
      <path d="M56 18C40 27 28 30 21 32l3 29c3 18 16 36 32 47 16-11 29-29 32-47l3-29" stroke="white" strokeOpacity=".5" strokeWidth="1.7"/>
      <path d="M31 61V37c0-9 12-9 12 0v33c0 33 32 35 32 9" stroke="white" strokeWidth="3.6" strokeLinecap="round"/>
      <path d="M31 58v17c0 22 31 35 37 6" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      <rect x="28" y="53" width="6" height="17" rx="2" fill="#137abe"/><path d="M31 57v10" stroke="#a8edff" strokeWidth="1.5"/>
      <g transform="rotate(11 76 52)"><rect x="59" y="24" width="35" height="54" rx="6" fill="#faffff"/><path d="M72 36h9v8h8v9h-8v8h-9v-8h-8v-9h8Z" fill="#338eaf"/><path d="M63 64h27v7a4 4 0 0 1-4 4H67a4 4 0 0 1-4-4Z" fill="#ffc437"/><path d="M75 75v10" stroke="#ffca3e" strokeWidth="4"/><path d="M71 26v-5h10v5" stroke="white" strokeWidth="3"/></g>
    </svg>
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return <div className={`brand ${compact ? 'brand-compact' : ''}`}><ShieldMark/><div className="brand-copy"><div className="brand-smart">Smart</div><div className="brand-guard">CAUTI</div><p>ระบบติดตามการดูแลสายสวนปัสสาวะ<br/>เพื่อป้องกัน CAUTI</p></div></div>;
}

export function CareNote({ compact = false }: { compact?: boolean }) {
  return <aside className={`care-note ${compact ? 'care-note-compact' : ''}`}><Image src="/images/nurse-mascot.png" width={1024} height={1536} loading="eager" sizes={compact ? '85px' : '(max-width: 600px) 145px, 175px'} alt="" className="nurse-mascot"/><div className="care-bubble">{compact ? <p>ประเมินทุกวัน ลดวันคาสาย<br/>ลดความเสี่ยง CAUTI <span>♥</span></p> : <p>เล็กน้อยแต่สำคัญ<br/>เพื่อความปลอดภัย<br/>ของผู้ป่วย <span>♥</span></p>}</div></aside>;
}

function HospitalScene() {
  return <svg className="hospital-scene" viewBox="0 0 500 220" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><path d="M0 174Q80 137 157 176T320 172T500 161V220H0Z" fill="#b2e4d6"/><g fill="#bfdfef"><path d="M5 85h75v106H5zM89 112h51v79H89zM374 107h45v84h-45zM427 66h68v125h-68z"/><path d="M20 64h42v22H20zM447 42h31v25h-31z"/></g><g fill="#ecf8fc">{[18,43,101,119,385,440,465].map((x,i)=><g key={x}>{[102,125,148].map(y=><rect key={y} x={x} y={i>4?y-20:y} width="10" height="13" rx="1"/>)}</g>)}</g><path d="M36 47v17m-8-8h16m413-32v16m-8-8h16" stroke="#f3c1b1" strokeWidth="5"/><path d="M0 198Q85 171 162 196T330 194T500 185V220H0Z" fill="#7ec7af"/><g fill="#75bdaa"><ellipse cx="17" cy="169" rx="14" ry="23"/><ellipse cx="78" cy="180" rx="17" ry="25"/><ellipse cx="409" cy="177" rx="13" ry="21"/><ellipse cx="488" cy="170" rx="18" ry="28"/></g><path d="M0 212Q120 187 250 214T500 209V220H0Z" fill="#f7fcff"/></svg>;
}

export function ScanHero({ showDashboard }: { showDashboard: boolean }) {
  // Dashboard เด้งกลับหน้าแรกเมื่อ role หรือโหมดการศึกษาไม่อนุญาต จึงพาไปหน้าเรียนรู้แทน
  const dataHref = showDashboard ? '/dashboard' : '/learn';
  const features: { icon: IconName; label: string; href: string }[] = [{icon:'need',label:'เช็กทุกวัน',href:'/scan'},{icon:'chart',label:'ใช้ข้อมูลทันที',href:dataHref},{icon:'bell',label:'ติดตามความเสี่ยง',href:dataHref},{icon:'shield',label:'ปลอดภัย ลด CAUTI',href:'/learn'}];
  return <section className="scan-hero"><Brand/><h2>สแกน QR เพื่อเริ่มทำแบบประเมิน</h2><div className="scan-stage"><HospitalScene/><Link href="/scan" className="scan-launch" aria-label="เปิดกล้องสแกน QR ที่เตียงผู้ป่วย"><div className="scan-code"><svg viewBox="0 0 100 100" aria-hidden="true"><path d="M3 25V3h22m50 0h22v22M3 75v22h22m50 0h22V75" fill="none" stroke="#18ae7f" strokeWidth="2.5"/><g fill="#15342f"><path d="M13 13h25v25H13zm49 0h25v25H62zM13 62h25v25H13z"/><path d="M44 13h6v12h6v6H44zm0 25h12v6H44zm18 6h6v12h-6zm12 0h13v6H74zM13 44h12v6H13zm18 0h7v12H25v-6h6zm13 6h12v12H44zm18 12h12v6H62zm18-6h7v12h-7zm-36 12h6v19h-6zm12 6h12v13H56zm18 0h13v6H74zm7 7h6v6h-6zM13 53h6v5h-6z"/></g><g fill="white"><path d="M18 18h15v15H18zm49 0h15v15H67zM18 67h15v15H18z"/></g><path d="M22 22h7v7h-7zm49 0h7v7h-7zM22 71h7v7h-7z" fill="#15342f"/></svg><span className="scan-camera"><UiIcon name="arrow"/></span></div><span className="scan-label">SCAN ME</span></Link></div><p className="scan-help">แตะเพื่อเปิดกล้องสแกน QR ที่เตียงผู้ป่วย</p><div className="feature-row">{features.map(({icon,label,href},i)=><Link key={label} href={href}><span data-tone={i}><UiIcon name={icon}/></span><small>{label}</small></Link>)}</div></section>;
}
