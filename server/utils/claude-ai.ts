import fetch from 'node-fetch';

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

interface ClaudeResponse {
  content: string;
  stopReason: string;
  model: string;
}

export async function analyzeDocumentWithClaude(pdfText: string): Promise<any> {
  if (!CLAUDE_API_KEY) {
    throw new Error('CLAUDE_API_KEY environment variable must be set');
  }

  try {
    const prompt = `
      Analyze this energy efficiency report and extract the following information in JSON format:
      - Building type and details
      - Current and projected energy consumption
      - Energy consultant information
      - Proposed renovation measures
      - Cost analysis
      - Environmental impact
      - Implementation timeline
      
      Format the response as a structured JSON object with these main categories.
      The input text is from an ISFP (Individual Sanierungsfahrplan) document:

      ${pdfText}
    `;

    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        messages: [{
          role: 'user',
          content: prompt
        }],
        model: 'claude-3-opus-20240229',
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.statusText}`);
    }

    const data: ClaudeResponse = await response.json();
    
    // Parse the response content as JSON
    try {
      return JSON.parse(data.content);
    } catch (e) {
      console.error('Failed to parse Claude response as JSON:', e);
      return data.content;
    }
  } catch (error) {
    console.error('Error analyzing document with Claude:', error);
    throw error;
  }
}
