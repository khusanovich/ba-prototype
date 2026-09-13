// Quick test to see which Gemini models are available
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env.local' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testModels() {
  const modelsToTry = [
    "gemini-pro",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash-002",
    "gemini-2.0-flash-exp",
  ];

  console.log("Testing available Gemini models...\n");

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Hello");
      console.log(`✅ ${modelName} - WORKS`);
    } catch (error) {
      console.log(`❌ ${modelName} - ${error.message.substring(0, 100)}`);
    }
  }
}

testModels();
