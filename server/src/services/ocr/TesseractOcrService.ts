import path from 'path';
import { OcrResult, OcrService } from '../../instagram/types';

/** OCR open source via tesseract.js (substituível implementando OcrService). */
export class TesseractOcrService implements OcrService {
  async extractTextFromImage(imagePath: string): Promise<OcrResult> {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('por');
    try {
      const abs = path.isAbsolute(imagePath) ? imagePath : path.resolve(imagePath);
      const result = await worker.recognize(abs);
      const text = (result.data.text || '').trim();
      return {
        text,
        confidence: result.data.confidence,
        engine: 'tesseract.js',
      };
    } finally {
      await worker.terminate();
    }
  }
}

export function createOcrService(): OcrService {
  return new TesseractOcrService();
}
