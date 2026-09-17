/**
 * กฎของ PIN — pure function ล้วน ทดสอบได้โดยไม่ต้องมี request หรือ DB
 *
 * PIN มีแค่ 6 หลัก ความปลอดภัยจึงอยู่ที่การไม่ใช้ชุดที่เดาได้ในไม่กี่ครั้ง
 * และการไม่ใช้ PIN ร่วมกันหลายบัญชี มิฉะนั้น audit log จะชี้ตัวผู้บันทึกไม่ได้
 */

export const PIN_LENGTH = 6;

/** PIN ต้องเป็นตัวเลข 6 หลักพอดี */
export function isValidPinFormat(pin: unknown): pin is string {
  return typeof pin === 'string' && new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

/**
 * ชุดที่พบบ่อยจนเดาได้ในไม่กี่ครั้ง
 * ไม่ใช่รายการที่ครบถ้วน แต่ตัดชุดที่คนเลือกซ้ำกันมากที่สุดออกไปได้
 */
const COMMON_PINS = new Set([
  '123123', '121212', '112233', '102030', '159753', '147258', '135790',
  '696969', '123321', '654321', '789456', '111222', '123654', '010203',
]);

/** เลขเรียงติดกันทั้งหมด ทั้งขึ้นและลง เช่น 123456 หรือ 987654 */
function isRun(pin: string): boolean {
  const step = Number(pin[1]) - Number(pin[0]);
  if (step !== 1 && step !== -1) return false;
  return [...pin].every((digit, i) => i === 0 || Number(digit) - Number(pin[i - 1]) === step);
}

/**
 * PIN ที่เดาง่ายเกินกว่าจะรับได้
 *
 * ครอบคลุมเลขซ้ำทั้งหมด เลขเรียง และชุดยอดนิยม
 * รูปแบบที่ผิดถือว่าเดาง่ายด้วย เพื่อให้ผู้เรียกใช้ตรวจทางเดียวได้
 */
export function isWeakPin(pin: string): boolean {
  if (!isValidPinFormat(pin)) return true;
  if (/^(\d)\1+$/.test(pin)) return true;
  if (isRun(pin)) return true;
  return COMMON_PINS.has(pin);
}
