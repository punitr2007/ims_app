import { createWorker } from 'tesseract.js';

let workerPromise: Promise<Tesseract.Worker> | null = null;

async function getWorker(): Promise<Tesseract.Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker('eng');
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789',
        tessedit_pageseg_mode: '11' as any, // PSM 11 (same as imsnsit_app)
      });
      return worker;
    })();
  }
  return workerPromise;
}

/**
 * Solves CAPTCHA image buffer using Tesseract OCR with psm:11 and digits-only whitelist
 */
export async function solveCaptchaServer(imageBuffer: Buffer): Promise<string> {
  try {
    const worker = await getWorker();
    const {
      data: { text },
    } = await worker.recognize(imageBuffer);

    const cleaned = text.trim().replace(/[^0-9]/g, '');
    return cleaned;
  } catch (err) {
    console.error('[OCR Error]', err);
    return '';
  }
}
