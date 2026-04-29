import { GoogleGenAI } from "@google/genai";

const API_KEYS = [
  'AIzaSyDE-oKMMIzV6VxU4q-UmjbS-FANPYJoYKA',
  'AIzaSyDFGYsQBIlSUFrIGQ__zQUJLO2q4qQMZpM',
  'AIzaSyAhgj4CFCXOzFTLiOVcKEkwhp69VGmUNPI',
  'AIzaSyBv8h2N3MhShjxBsaq2akOfs6ff7C_EkRE',
  'AIzaSyAbBQBINdot3xGxG6IvuS1zF7IajxWq1nU',
  'AIzaSyCRbFCsSeQaSzH48i8ntmYxTVQPskrGeRE',
  'AIzaSyDNfT0NcZ3oJNcUKl_dXx1h6eZgdM09b_Y',
  'AIzaSyA9Fr-zvHh_eX8_iH269Bgvle99LTa7Rv4'
];

async function testKey(key, index) {
  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ parts: [{ text: "Responde solo: OK" }] }],
    });
    
    if (response.text && response.text.includes('OK')) {
      console.log(`✅ Key ${index + 1}: OK`);
      return true;
    }
    throw new Error("No text response");
  } catch (e) {
    const errMsg = e.message || '';
    if (errMsg.includes('429') || errMsg.includes('Quota')) {
      console.log(`⚠️ Key ${index + 1}: QUOTA EXCEEDED`);
    } else if (errMsg.includes('403') || errMsg.includes('PERMISSION_DENIED')) {
      console.log(`❌ Key ${index + 1}: PERMISSION DENIED`);
    } else if (errMsg.includes('expired') || errMsg.includes('INVALID_ARGUMENT')) {
      console.log(`❌ Key ${index + 1}: EXPIRED/INVALID`);
    } else {
      console.log(`⚠️ Key ${index + 1}: ERROR - ${errMsg.substring(0, 100)}`);
    }
    return false;
  }
}

async function runTests() {
  console.log('🔑 Testing API Keys (simple text test)...\n');
  
  const working = [];
  for (let i = 0; i < API_KEYS.length; i++) {
    const ok = await testKey(API_KEYS[i], i);
    if (ok) working.push(API_KEYS[i]);
    await new Promise(r => setTimeout(r, 300));
  }
  
  console.log(`\n📊 Working keys: ${working.length}/8`);
  if (working.length > 0) {
    console.log('Working keys:');
    working.forEach((k, i) => console.log(`  ${i+1}. ${k}`));
  }
}

runTests().catch(console.error);
