import { createWorker } from 'tesseract.js';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

export async function extractTextFromDocument(file: Express.Multer.File): Promise<string> {
  try {
    let text = '';
    console.log('Processing file type:', file.mimetype);

    if (file.mimetype === 'application/pdf') {
      // Handle PDF
      console.log('Processing PDF file');
      const dataBuffer = Buffer.from(file.buffer);
      const pdfData = await pdfParse(dataBuffer);
      text = pdfData.text;
      console.log('PDF text extraction successful');
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

export async function processWithMistral(text: string) {
  try {
    console.log('Starting Mistral AI processing');
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "mistral-small-latest",
        messages: [
          {
            role: "system",
            content: `You are an expert in analyzing energy efficiency documents and extracting key information.
                     Extract the following information in JSON format:
                     - building_size (in m²)
                     - current_consumption (in kWh/year)
                     - projected_consumption (in kWh/year)
                     - heating_system_type
                     If a value is not found, use null.
                     Return only the JSON object without any additional text.`
          },
          {
            role: "user",
            content: text
          }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.statusText}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    console.log('Data extraction successful:', result);

    return {
      ...result,
      language: 'de' // Since the documents appear to be in German
    };
  } catch (error) {
    console.error('Error processing with Mistral:', error);
    throw error;
  }
}