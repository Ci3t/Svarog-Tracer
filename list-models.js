import 'dotenv/config'
const API_KEY = process.env.GEMINI_API_KEY_ANALYZER || process.env.GEMINI_API_KEY

async function listModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
  console.log('Fetching models from:', url.replace(API_KEY, 'HIDDEN'))
  
  try {
    const res = await fetch(url)
    const data = await res.json()
    
    if (data.models) {
      console.log('Available Models:')
      data.models.forEach(m => {
        if (m.name.includes('flash')) {
            console.log(`- ${m.name} (Supported: ${m.supportedGenerationMethods?.join(', ')})`)
        }
      })
    } else {
      console.log('Error:', JSON.stringify(data, null, 2))
    }
  } catch (e) {
    console.error('Fetch error:', e.message)
  }
}

listModels()
