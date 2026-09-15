import { createWorker } from 'tesseract.js';

let workerPromise: Promise<Tesseract.Worker> | null = null;

async function getWorker(): Promise<Tesseract.Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker('eng');
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
        tessedit_pageseg_mode: '7' as any, // Single uniform text line
      });
      return worker;
    })();
  }
  return workerPromise;
}

/**
 * Solves CAPTCHA image buffer using server-side Tesseract OCR
 */
export async function solveCaptchaServer(imageBuffer: Buffer): Promise<string> {
  try {
    const worker = await getWorker();
    const {
      data: { text },
    } = await worker.recognize(imageBuffer);

    const cleaned = text.trim().replace(/[^a-zA-Z0-9]/g, '');
    return cleaned;
  } catch (err) {
    console.error('[OCR Error]', err);
    return '';
  }
}
