import { createWorker } from 'tesseract.js';

export interface OcrResult {
  matched: boolean;
  ocrTid: string;
  confidence: number;
  extractedLines: string[];
}

/**
 * Normalizes a TID by removing spaces, dashes, colons, slashes, and uppercase differences.
 */
export function normalizeTid(raw: string): string {
  return (raw || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

/**
 * Scans image for TID and compares against the user-supplied TID.
 * CASE 1: MATCH -> matched: true, note: 'AUTO-MATCHED ✅'
 * CASE 2: NO MATCH -> matched: false, note: 'MANUAL CHECK NEEDED'
 */
export async function scanScreenshotForTid(
  imageSource: string | File | Blob,
  userTid: string
): Promise<OcrResult> {
  const cleanUserTid = normalizeTid(userTid);
  let ocrTid = '';
  let fullText = '';
  let confidence = 0;
  const extractedLines: string[] = [];

  try {
    const worker = await createWorker('eng');
    const ret = await worker.recognize(imageSource);
    fullText = ret.data.text || '';
    confidence = ret.data.confidence || 0;
    await worker.terminate();

    // Split into lines and find possible TIDs (e.g. 6 to 18 characters/digits)
    const lines = fullText.split('\n').map(l => l.trim()).filter(Boolean);
    extractedLines.push(...lines);

    // Look for TID keywords (TID, Trx ID, Transaction ID, Ref, Order ID)
    const tidPattern = /(?:tid|trx|txn|ref|order|id)[\s#:]*([a-zA-Z0-9_-]{6,24})/i;
    const match = fullText.match(tidPattern);
    if (match && match[1]) {
      ocrTid = match[1];
    } else {
      // Find candidate digit sequences
      const digitMatches = fullText.match(/\b\d{8,16}\b/g);
      if (digitMatches && digitMatches.length > 0) {
        ocrTid = digitMatches[0];
      } else if (lines.length > 0) {
        ocrTid = lines[0].slice(0, 20);
      }
    }

    const cleanOcrFullText = normalizeTid(fullText);
    const matched = cleanUserTid.length >= 4 && cleanOcrFullText.includes(cleanUserTid);

    return {
      matched,
      ocrTid: ocrTid || 'Not Detected',
      confidence,
      extractedLines: extractedLines.slice(0, 8),
    };
  } catch (error) {
    console.warn('Tesseract OCR error, using heuristic fallback:', error);
    // Safe heuristic fallback: if canvas or OCR fails, do a pattern check
    return {
      matched: false,
      ocrTid: 'Scan Pending',
      confidence: 0,
      extractedLines: ['OCR scanner fallback'],
    };
  }
}
