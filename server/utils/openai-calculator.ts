import { Configuration, OpenAIApi } from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable must be set');
}

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

export async function calculateWithOpenAI(extractedText: string) {
  try {
    const response = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a specialized energy efficiency calculator. Extract building information and energy consumption data from the provided text. Return the data in a specific JSON format."
        },
        {
          role: "user",
          content: `Extract the following information from this energy efficiency document and return as JSON:
            - building_size (in square meters)
            - current_consumption (annual kWh)
            - projected_consumption (annual kWh)
            - heating_system_type
            
            Document text:
            ${extractedText}`
        }
      ],
      temperature: 0,
      max_tokens: 500
    });

    const result = response.data.choices[0].message?.content;
    if (!result) {
      throw new Error('No response from OpenAI');
    }

    return JSON.parse(result);
  } catch (error) {
    console.error('OpenAI calculation error:', error);
    throw error;
  }
}
