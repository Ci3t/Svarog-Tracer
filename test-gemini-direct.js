/**
 * Simple test to verify Gemini API key works
 * Run with: node test-gemini-direct.js
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })


async function testGemini() {
  console.log('🧪 Testing Gemini API Key...\n')
  
  const apiKey = process.env.GEMINI_API_KEY
  
  if (!apiKey) {
    console.log('❌ No GEMINI_API_KEY found in .env.local')
    return
  }
  
  console.log('✅ API Key found:', apiKey.substring(0, 20) + '...\n')
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    
    console.log('📤 Sending test prompt to Gemini (gemini-2.5-flash)...')

    
    const prompt = `Respond with ONLY this JSON (no markdown, no extra text):
{
  "test": "success",
  "message": "API key is working!"
}`
    
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    console.log('📥 Raw Response:', text, '\n')
    
    try {
      const json = JSON.parse(text)
      console.log('✅ SUCCESS! Gemini API is working!')
      console.log('Parsed JSON:', json)
    } catch (e) {
      console.log('⚠️  Response received but not valid JSON')
      console.log('This is OK - it means your API key works!')
    }
    
  } catch (error) {
    console.log('❌ ERROR:', error.message)
    
    if (error.message.includes('API_KEY_INVALID')) {
      console.log('\n💡 Your API key is invalid. Get a new one from:')
      console.log('   https://aistudio.google.com/apikey')
    }
  }
}

testGemini()
