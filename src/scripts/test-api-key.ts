import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testAPIKey() {
  console.log('Testing OpenAI API key...');
  console.log('API key exists:', !!process.env.OPENAI_API_KEY);
  console.log('API key starts with:', process.env.OPENAI_API_KEY?.substring(0, 10) + '...');
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Hello, just testing the API key." }],
      max_tokens: 10
    });
    
    console.log('✅ API key is working! Response:', response.choices[0].message.content);
  } catch (error) {
    console.error('❌ API key test failed:', error.message);
  }
}

testAPIKey().catch(console.error);