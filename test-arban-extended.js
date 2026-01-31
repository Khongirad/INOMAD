#!/usr/bin/env node

/**
 * Extended Arban System API Test Script
 * Tests Family Arban operations: children, heir, Khural representative
 * 
 * Prerequisites:
 * - Marriage already registered (Arban ID: 1, Husband: '1', Wife: '2')
 * - Backend running on port 3001
 * - Anvil running on port 8545
 */

const { ethers } = require('ethers');

// Configuration
const API_URL = 'http://localhost:3001/api';
const ANVIL_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const RPC_URL = 'http://localhost:8545';

// Test data
const ARBAN_ID = 1; // From successful marriage registration
const HUSBAND_SEAT_ID = '1';
const CHILD_1_SEAT_ID = '3';
const CHILD_2_SEAT_ID = '4';
const KHURAL_REP_BIRTH_YEAR = 1985; // 41 years old, under 60 limit

// Create wallet
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(ANVIL_PRIVATE_KEY, provider);
const address = wallet.address;

console.log('🧪 Extended Arban System API Test');
console.log('===================================\n');
console.log(`Wallet: ${address}`);
console.log(`Arban ID: ${ARBAN_ID}\n`);

async function authenticate() {
  console.log('🔐 Step 1: Authenticate...');
  
  // Get nonce
  const nonceRes = await fetch(`${API_URL}/auth/nonce`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address }),
  });
  const { nonce, message: signMessage } = await nonceRes.json();
  
  // Sign
  const signature = await wallet.signMessage(signMessage);
  
  // Verify and get JWT
  const authRes = await fetch(`${API_URL}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, signature, nonce }),
  });
  
  const { accessToken } = await authRes.json();
  console.log('✅ Authenticated\n');
  return accessToken;
}

async function testAddChild(token, childSeatId) {
  console.log(`\n👶 Step 2: Add child (Seat ID: ${childSeatId})...`);
  
  const res = await fetch(`${API_URL}/arbans/family/${ARBAN_ID}/children`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-seat-id': HUSBAND_SEAT_ID,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      childSeatId,
      privateKey: ANVIL_PRIVATE_KEY,
    }),
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(`Add child failed: ${JSON.stringify(error)}`);
  }
  
  const data = await res.json();
  console.log(`✅ Child added successfully!`);
  console.log(`   TX Hash: ${data.txHash}`);
  console.log(`   Heir automatically set to: ${childSeatId} (youngest child)`);
  return data;
}

async function testChangeHeir(token, newHeirSeatId) {
  console.log(`\n👑 Step 3: Change heir to child ${newHeirSeatId}...`);
  
  const res = await fetch(`${API_URL}/arbans/family/${ARBAN_ID}/heir`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-seat-id': HUSBAND_SEAT_ID,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      newHeirSeatId,
      privateKey: ANVIL_PRIVATE_KEY,
    }),
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(`Change heir failed: ${JSON.stringify(error)}`);
  }
  
  const data = await res.json();
  console.log(`✅ Heir changed successfully!`);
  console.log(`   New heir: ${newHeirSeatId}`);
  console.log(`   TX Hash: ${data.txHash}`);
  return data;
}

async function testSetKhuralRep(token) {
  console.log(`\n🏛️  Step 4: Set Khural representative...`);
  console.log(`   Representative: ${HUSBAND_SEAT_ID} (Husband)`);
  console.log(`   Birth year: ${KHURAL_REP_BIRTH_YEAR} (Age: ${2026 - KHURAL_REP_BIRTH_YEAR})`);
  
  const res = await fetch(`${API_URL}/arbans/family/${ARBAN_ID}/khural-rep`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-seat-id': HUSBAND_SEAT_ID,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      repSeatId: HUSBAND_SEAT_ID,
      birthYear: KHURAL_REP_BIRTH_YEAR,
      privateKey: ANVIL_PRIVATE_KEY,
    }),
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(`Set Khural rep failed: ${JSON.stringify(error)}`);
  }
  
  const data = await res.json();
  console.log(`✅ Khural representative set!`);
  console.log(`   Rep Seat ID: ${HUSBAND_SEAT_ID}`);
  console.log(`   TX Hash: ${data.txHash}`);
  return data;
}

async function verifyArbanState(token) {
  console.log(`\n📋 Step 5: Verify final Arban state...`);
  
  const res = await fetch(`${API_URL}/arbans/family/${ARBAN_ID}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-seat-id': HUSBAND_SEAT_ID,  // Added for auth
    },
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(`Get Arban failed: ${JSON.stringify(error)}`);
  }
  
  const arban = await res.json();
  console.log(`\n✅ Arban State:`);
  console.log(`   Arban ID: ${arban.arbanId}`);
  console.log(`   Husband: ${arban.husbandSeatId}`);
  console.log(`   Wife: ${arban.wifeSeatId}`);
  console.log(`   Children: [${arban.childrenSeatIds.join(', ')}]`);
  console.log(`   Heir: ${arban.heirSeatId}`);
  console.log(`   Khural Rep: ${arban.khuralRepSeatId || 'None'}`);
  console.log(`   Is Active: ${arban.isActive}`);
  
  return arban;
}

async function testKhuralReps(token) {
  console.log(`\n🏛️  Step 6: Get all Khural representatives...`);
  
  const res = await fetch(`${API_URL}/arbans/family/khural-reps`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(`Get Khural reps failed: ${JSON.stringify(error)}`);
  }
  
  const reps = await res.json();
  console.log(`✅ Khural Representatives (${reps.length}):`);
  reps.forEach((rep, i) => {
    console.log(`   ${i + 1}. Seat ${rep.seatId} - Arban ${rep.arbanId}, Age: ${rep.age}`);
  });
  
  return reps;
}

async function main() {
  try {
    // Authenticate
    const token = await authenticate();
    
    // Add first child
    await testAddChild(token, CHILD_1_SEAT_ID);
    
    // Add second child (becomes new heir automatically)
    await testAddChild(token, CHILD_2_SEAT_ID);
    
    // Change heir back to first child
    await testChangeHeir(token, CHILD_1_SEAT_ID);
    
    // Set Khural representative (husband)
    await testSetKhuralRep(token);
    
    // Verify final state
    const finalArban = await verifyArbanState(token);
    
    // Get all Khural representatives
    await testKhuralReps(token);
    
    // Summary
    console.log(`\n${'='.repeat(50)}`);
    console.log(`✅ ALL TESTS PASSED!`);
    console.log(`${'='.repeat(50)}`);
    console.log(`\nFamily Arban Summary:`);
    console.log(`  - Marriage: Registered ✅`);
    console.log(`  - Children: ${finalArban.childrenSeatIds.length} added ✅`);
    console.log(`  - Heir: Set to Seat ${finalArban.heirSeatId} ✅`);
    console.log(`  - Khural Rep: ${finalArban.khuralRepSeatId ? 'Set ✅' : 'Not set'}`);
    console.log(`\nNext: Test Zun formation, Organizational Arbans, Credit system\n`);
    
  } catch (error) {
    console.error(`\n❌ Test failed:`);
    console.error(`   ${error.message}`);
    process.exit(1);
  }
}

// Run tests
main();
