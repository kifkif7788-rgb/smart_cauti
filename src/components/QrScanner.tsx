'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { qrInputPath } from '@/lib/qr-input';

type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
};

declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: { formats?: string[] }): BarcodeDetectorLike;
      getSupportedFormats?: () => Promise<string[]>;
    };
  }
}

/**
 * สแกน QR ด้วยกล้อง
 *
 * ใช้ BarcodeDetector ของเบราว์เซอร์เป็นหลัก (เร็วและประหยัดแบตกว่า)
 * และถอยไปใช้ jsQR เมื่อเบราว์เซอร์ไม่รองรับ เช่น Safari รุ่นเก่า
 *
 * เมื่อกล้องใช้ไม่ได้ ต้องแสดงช่องกรอกรหัสป้ายทันทีโดยไม่ต้องกดเพิ่ม
 * เพราะพยาบาลยืนอยู่ข้างเตียงและรอไม่ได้
 */
export function QrScanner() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const handledRef = useRef(false);

  const [cameraFailed, setCameraFailed] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);

  const handleResult = useCallback(
    (value: string) => {
      if (handledRef.current) return;

      const path = qrInputPath(value);
      if (!path) {
        setScanError('QR นี้ไม่ใช่รหัสเตียงที่รองรับ ใช้รหัสเช่น SM-B02 หรือ QR จากระบบ');
        return;
      }
      setScanError(null);

      handledRef.current = true;
      if (navigator.vibrate) navigator.vibrate(40);
      router.push(path);
    },
    [router],
  );

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraFailed('เบราว์เซอร์นี้ไม่รองรับการใช้กล้อง');
        return;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
      } catch (error) {
        const denied =
          error instanceof DOMException && error.name === 'NotAllowedError';
        setCameraFailed(
          denied
            ? 'ไม่ได้รับอนุญาตให้ใช้กล้อง'
            : 'เปิดกล้องไม่ได้ในขณะนี้',
        );
        return;
      }

      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play().catch(() => undefined);

      let detector: BarcodeDetectorLike | null = null;
      if (window.BarcodeDetector) {
        try {
          detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        } catch {
          detector = null;
        }
      }

      const jsQR = detector ? null : (await import('jsqr')).default;

      const tick = async () => {
        if (cancelled || handledRef.current) return;
        const canvas = canvasRef.current;

        if (video.readyState === video.HAVE_ENOUGH_DATA && canvas) {
          try {
            if (detector) {
              const codes = await detector.detect(video);
              if (codes[0]?.rawValue) handleResult(codes[0].rawValue);
            } else if (jsQR) {
              const context = canvas.getContext('2d', { willReadFrequently: true });
              if (context) {
                // ลดความละเอียดลงเพื่อให้ decode ทันเฟรมบนเครื่องรุ่นเก่า
                const width = 480;
                const height = Math.round(
                  (video.videoHeight / video.videoWidth) * width,
                );
                canvas.width = width;
                canvas.height = height;
                context.drawImage(video, 0, 0, width, height);
                const image = context.getImageData(0, 0, width, height);
                const code = jsQR(image.data, width, height);
                if (code?.data) handleResult(code.data);
              }
            }
          } catch {
            // เฟรมนี้อ่านไม่ได้ — ลองเฟรมถัดไป
          }
        }
        rafRef.current = requestAnimationFrame(() => void tick());
      };

      rafRef.current = requestAnimationFrame(() => void tick());
    }

    void start();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [handleResult]);

  function submitManual(event: React.FormEvent) {
    event.preventDefault();
    const code = manualCode.trim().toUpperCase();
    if (!/^[A-Z]{2}-B(?:0[1-9]|[1-9][0-9])$/.test(code)) {
      setManualError('รูปแบบรหัสไม่ถูกต้อง ต้องเป็นเช่น SM-B01');
      return;
    }
    setManualError(null);
    router.push(`/assess/${code}`);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-4">
      {scanError && <p role="alert" className="mb-3 rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--correct-bg)', color: 'var(--correct)' }}>{scanError}</p>}
      {!cameraFailed ? (
        <>
          <div
            className="relative overflow-hidden rounded-2xl"
            style={{ background: '#0D1B2A', aspectRatio: '3 / 4' }}
          >
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
            {/* กรอบเล็ง */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className="h-56 w-56 rounded-2xl border-4"
                style={{ borderColor: 'rgba(255,255,255,.85)' }}
              />
            </div>
          </div>
          <p className="mt-3 text-center text-[14px]" style={{ color: 'var(--muted)' }}>
            เล็งกล้องไปที่ QR ประจำเตียงผู้ป่วย
          </p>
        </>
      ) : (
        <div
          className="rounded-xl border-l-4 px-4 py-3 text-[13px] leading-relaxed"
          style={{ background: 'var(--correct-bg)', borderColor: 'var(--correct)' }}
        >
          <strong style={{ color: 'var(--correct)' }}>{cameraFailed}</strong>
          {' — '}
          กรุณากรอกรหัสป้ายด้านล่างแทน
        </div>
      )}

      {/* ช่องกรอกรหัสป้ายสำรอง — แสดงเสมอ ไม่ต้องกดเปิด */}
      <form onSubmit={submitManual} className="surface mt-5 p-4">
        <label htmlFor="tag-code" className="text-sm font-bold">
          หรือกรอกรหัสป้าย
        </label>
        <p className="mt-0.5 text-[13px]" style={{ color: 'var(--muted)' }}>
          รหัสพิมพ์อยู่ใต้ QR บนป้าย — SM-B01 คือเตียง 1
        </p>
        <div className="mt-2.5 flex gap-2">
          <input
            id="tag-code"
            value={manualCode}
            onChange={(e) => {
              setManualCode(e.target.value.toUpperCase().slice(0, 6));
              setManualError(null);
            }}
            placeholder="SM-B01"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={manualError ? true : undefined}
            className="flex-1 rounded-lg border px-3.5 text-[17px] font-semibold tracking-wider"
            style={{
              background: 'var(--surface-2)',
              borderColor: manualError ? 'var(--review)' : 'var(--border)',
              color: 'var(--text)',
              minHeight: '50px',
            }}
          />
          <button type="submit" className="btn-primary shrink-0 px-5 text-[15px]">
            ไป
          </button>
        </div>
        {manualError && (
          <p className="mt-2 text-[13px] font-semibold" style={{ color: 'var(--review)' }}>
            {manualError}
          </p>
        )}
      </form>
    </main>
  );
}
