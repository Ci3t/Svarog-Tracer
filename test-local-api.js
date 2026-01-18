/**
 * Test script to hit local API directly and see RAW output
 * Run with: node test-local-api.js
 */

async function testLocalApi() {
  console.log('🧪 Testing Local API Direct Access (Port 3000)...\n')
  
  const testData = {
    userId: 'test-user-debug',
    bannerId: '2034',
    bannerName: 'Aglaea',
    luckyPeaks: [6, 8, 9],
    winLossData: { wins: 10, losses: 5 }
  }
  
  try {
    const response = await fetch('http://localhost:3000/api/ai-analyze-warp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    })
    
    console.log(`Status: ${response.status} ${response.statusText}`)
    const text = await response.text()
    console.log('\nRAW RESPONSE BODY:')
    console.log('---------------------------------------------------')
    console.log(text)
    console.log('---------------------------------------------------')
    
    try {
      JSON.parse(text)
      console.log('\n✅ Valid JSON response')
    } catch (e) {
      console.log('\n❌ INVALID JSON response')
    }
    
  } catch (error) {
    console.error('❌ Network Error:', error.message)
    console.log('Make sure "vercel dev --listen 3000" is running!')
  }
}

testLocalApi()
