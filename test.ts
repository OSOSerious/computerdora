import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: "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",
  baseURL: "https://api.groq.com/openai/v1"
});

async function testGroqAPI() {
  try {
    const completion = await client.chat.completions.create({
      model: "mixtral-8x7b-32768",
      messages: [
        {
          role: "user",
          content: "Hello! Can you hear me?"
        }
      ],
      temperature: 0.7,
      max_tokens: 1024
    });

    console.log("API Response:", completion.choices[0].message.content);
    console.log("API is working correctly!");
  } catch (error) {
    console.error("API Error:", error);
  }
}

testGroqAPI();
