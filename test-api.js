/**
 * Quick test script for backend API
 * Run with: node test-api.js
 */

const API_BASE = 'http://localhost:3000/api';

async function testEndpoint(name, url) {
  console.log(`\n🧪 Testing: ${name}`);
  console.log(`📡 URL: ${url}`);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    const contentType = response.headers.get("content-type");
    
    if (contentType && contentType.includes("application/json")) {
       const data = await response.json();
       if (response.ok) {
        console.log(`✅ SUCCESS`);
        console.log(`📊 Data keys:`, Object.keys(data));
        if (data.stats) {
          console.log(`   Total 5★ pulls:`, data.stats.total_pulls_5);
        }
        if (Array.isArray(data)) {
           console.log(`   Banners found:`, data.length);
           data.forEach(b => console.log(`   - [${b.id}] ${b.name} (${b.type})`));
        }
       } else {
         console.log(`❌ FAILED (API ${response.status}):`, data.error || "Unknown Error");
         if (data.message) console.log(`   Internal Message:`, data.message);
       }
    } else {
       const text = await response.text();
       console.log(`❌ FAILED (Non-JSON Response): ${response.status} ${response.statusText}`);
       console.log(`   Response Preview: ${text.substring(0, 100)}...`);
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
  }
}

async function runTests() {
  console.log('🚀 Starting API Tests...');
  console.log('Make sure Vercel dev server is running: vercel dev\n');
  
  // WuWa Tests
  await testEndpoint('WuWa Stats (Mornye)', `${API_BASE}/wuwa/stats?id=100031`);
  await testEndpoint('WuWa Banners', `${API_BASE}/wuwa/banners`);
  
  // HSR Tests
  await testEndpoint('HSR Stats', `${API_BASE}/hsr/stats?id=2099`);
  await testEndpoint('HSR Banners', `${API_BASE}/hsr/banners`);
  
  // Genshin Tests
  await testEndpoint('Genshin Stats', `${API_BASE}/genshin/stats?id=300094`);
  await testEndpoint('Genshin Banners', `${API_BASE}/genshin/banners`);
  
  // ZZZ Tests
  await testEndpoint('ZZZ Stats', `${API_BASE}/zzz/stats?id=2001015`);
  
  console.log('\n✨ Tests complete!');
}

runTests();
