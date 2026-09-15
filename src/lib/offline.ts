/**
 * คิวบันทึกแบบออฟไลน์
 *
 * สัญญาณในหอผู้ป่วยมักไม่เสถียร โดยเฉพาะห้องปลายทางเดินและห้องแยก
 * ถ้าการบันทึกหายเพราะสัญญาณขาด พยาบาลจะเลิกใช้ระบบภายในไม่กี่วัน
 * และโครงการจะไม่มีข้อมูลพอสำหรับเปรียบเทียบ
 *
 * ทุกรายการมี clientUuid ที่สร้างตั้งแต่ตอนกดส่ง เซิร์ฟเวอร์ใช้ค่านี้
 * กันการบันทึกซ้ำ จึง sync ซ้ำได้อย่างปลอดภัยแม้ส่งไปแล้วแต่ไม่ได้รับคำตอบ
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { Check5Key } from './check5';

export interface QueuedAssessment {
  clientUuid: string;
  episodeId: string;
  answers: Record<Check5Key, boolean>;
  notes?: string;
  queuedAt: string;
}

const DB_NAME = 'smart-cauti-guard';
const DB_VERSION = 1;
const STORE = 'pending-assessments';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(STORE)) {
          database.createObjectStore(STORE, { keyPath: 'clientUuid' });
        }
      },
    });
  }
  return dbPromise;
}

export async function queueAssessment(item: QueuedAssessment): Promise<void> {
  const database = await getDb();
  await database.put(STORE, item);
}

export async function getQueuedAssessments(): Promise<QueuedAssessment[]> {
  try {
    const database = await getDb();
    return (await database.getAll(STORE)) as QueuedAssessment[];
  } catch {
    return [];
  }
}

export async function countQueued(): Promise<number> {
  try {
    const database = await getDb();
    return await database.count(STORE);
  } catch {
    return 0;
  }
}

async function removeQueued(clientUuid: string): Promise<void> {
  const database = await getDb();
  await database.delete(STORE, clientUuid);
}

export interface SyncResult {
  synced: number;
  failed: number;
}

/**
 * ส่งรายการที่ค้างอยู่ทั้งหมด
 *
 * ลบออกจากคิวเมื่อเซิร์ฟเวอร์รับแล้ว (2xx) หรือเมื่อปฏิเสธเพราะข้อมูลไม่ถูกต้อง
 * (4xx ที่ไม่ใช่ 408/429) เพราะการส่งซ้ำก็จะถูกปฏิเสธเหมือนเดิม
 * เก็บไว้ในคิวต่อเฉพาะกรณีที่ลองใหม่แล้วมีโอกาสสำเร็จ
 */
export async function syncQueuedAssessments(): Promise<SyncResult> {
  const pending = await getQueuedAssessments();
  let synced = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      const response = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });

      const retryable =
        response.status === 408 ||
        response.status === 429 ||
        response.status >= 500;

      if (response.ok || !retryable) {
        await removeQueued(item.clientUuid);
        if (response.ok) synced += 1;
        else failed += 1;
      } else {
        failed += 1;
      }
    } catch {
      // ยังออฟไลน์อยู่ — หยุดทั้งรอบ ไม่ต้องไล่ส่งที่เหลือให้เปลืองแบตเตอรี่
      failed += 1;
      break;
    }
  }

  return { synced, failed };
}
