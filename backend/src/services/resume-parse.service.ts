import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { logger } from '../utils/logger.util';

/**
 * Extract raw text content from a resume file (PDF or DOCX)
 */
export async function extractTextFromFile(fileUrl: string, fileType: string): Promise<string> {
  const absolutePath = path.resolve(fileUrl);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  const ext = fileType.toLowerCase().replace(/^\./, '');

  switch (ext) {
    case 'pdf': {
      const dataBuffer = fs.readFileSync(absolutePath);
      const data = await pdfParse(dataBuffer);
      return cleanText(data.text);
    }

    case 'docx': {
      const result = await mammoth.extractRawText({ path: absolutePath });
      return cleanText(result.value);
    }

    case 'doc': {
      // mammoth only supports .docx, not legacy .doc format
      throw new Error('Legacy .doc format is not supported. Please convert to .docx first.');
    }

    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}

function cleanText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[^\S\n]+/g, ' ')        // multiple spaces → single space
    .replace(/\n{3,}/g, '\n\n')       // 3+ consecutive newlines → 2
    .replace(/ +\n/g, '\n')           // trailing spaces on lines
    .replace(/\n +/g, '\n')           // leading spaces on lines
    .trim();
}

export const resumeParseService = { extractTextFromFile };