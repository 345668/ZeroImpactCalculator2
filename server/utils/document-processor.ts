import { createWorker } from 'tesseract.js';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

export async function extractTextFromDocument(file: Express.Multer.File): Promise<string> {
  try {
    let text = '';
    console.log('Processing file type:', file.mimetype);

    if (file.mimetype === 'application/pdf') {
      // Handle PDF
      console.log('Processing PDF file');
      try {
        const dataBuffer = Buffer.from(file.buffer);
        const pdfData = await pdfParse(dataBuffer);
        text = pdfData.text;
        console.log('PDF text extraction successful');
      } catch (pdfError) {
        console.error('PDF parsing error:', pdfError);
        throw new Error(`PDF parsing failed: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`);
      }
    } else if (file.mimetype.startsWith('image/')) {
      // Handle images using Tesseract
      console.log('Processing image file with Tesseract');
      const worker = await createWorker();
      const { data: { text: extractedText } } = await worker.recognize(file.buffer);
      await worker.terminate();
      text = extractedText;
      console.log('Image text extraction successful');
    } else {
      throw new Error('Unsupported file type. Please upload a PDF or image file.');
    }

    if (!text || text.trim().length === 0) {
      throw new Error('No text could be extracted from the document');
    }

    return text;
  } catch (error) {
    console.error('Error extracting text:', error);
    throw new Error(`Failed to extract text from document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}