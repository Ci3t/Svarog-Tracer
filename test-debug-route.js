import fs from 'fs'

async function testDebugRoute() {
  console.log('🧪 Testing Simple Gemini Route...\n')
  try {
    const res = await fetch('http://localhost:3000/api/test-gemini')
    const data = await res.json()
    console.log('Status:', res.status)
    fs.writeFileSync('debug_output.json', JSON.stringify(data, null, 2))
    console.log('Output written to debug_output.json')
  } catch (e) {
    console.error('❌ Failed:', e.message)
  }
}

testDebugRoute()
