/**
 * Test AI Warp Analyzer Endpoint
 * Run with: node test-ai-endpoint.js
 */

async function testAIEndpoint() {
  console.log('🧪 Testing AI Warp Analyzer Endpoint...\n')
  
  const testData = {
    userId: 'test-user-123',
    bannerId: '2034',
    bannerName: 'Aglaea',
    luckyPeaks: [6, 8, 9],
    winLossData: {
      wins: 1234,
      losses: 567
    }
  }
  
  try {
    console.log('📤 Sending request to http://localhost:3000/api/ai-analyze-warp')
    console.log('Request data:', JSON.stringify(testData, null, 2), '\n')
    
    const response = await fetch('http://localhost:3000/api/ai-analyze-warp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    })
    
    console.log(`📥 Response Status: ${response.status} ${response.statusText}\n`)
    
    const result = await response.json()
    
    if (result.success) {
      console.log('✅ SUCCESS!\n')
      console.log('AI Explanation:', result.data.explanation)
      console.log('\nRecommendations:')
      result.data.recommendations?.forEach((rec, i) => {
        console.log(`  ${i + 1}. ${rec}`)
      })
      console.log('\nMeta:', JSON.stringify(result.meta, null, 2))
    } else {
      console.log('❌ ERROR:\n')
      console.log(JSON.stringify(result.error, null, 2))
    }
    
  } catch (error) {
    console.log('❌ TEST FAILED:\n')
    console.error(error.message)
  }
}

// Run test
testAIEndpoint()
