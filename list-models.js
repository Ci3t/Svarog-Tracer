/**
 * List available Gemini models
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  
  try {
    console.log('📋 Fetching available models...\n')
    
    const models = await genAI.listModels()
    
    console.log('Available models:')
    for (const model of models) {
      console.log(`- ${model.name}`)
      if (model.supportedGenerationMethods?.includes('generateContent')) {
        console.log('  ✅ Supports generateContent')
      }
    }
  } catch (error) {
    console.error('Error:', error.message)
  }
}

listModels()
