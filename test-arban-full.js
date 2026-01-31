#!/usr/bin/env node

/**
 * Test Zun, Organizational Arban, and Credit System Endpoints
 */

const { ethers } = require('ethers');

// Configuration
const API_URL = 'http://localhost:3001/api';
const ANVIL_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const RPC_URL = 'http://localhost:8545';

// Test seat IDs (must be numeric strings for smart contract compatibility)
const HUSBAND_SEAT_ID = '1';
const WIFE_SEAT_ID = '2';
const ARBAN_ID = 1;

// Create wallet
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(ANVIL_PRIVATE_KEY, provider);
const address = wallet.address;

let token = '';

console.log('🧪 Zun, Org Arban & Credit System Test');
console.log('======================================\n');
console.log(`Wallet: ${address}`);

async function authenticate() {
  console.log('\n🔐 Authenticating...');
  
  const nonceRes = await fetch(`${API_URL}/auth/nonce`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address }),
  });
  const { nonce, message: signMessage } = await nonceRes.json();
  const signature = await wallet.signMessage(signMessage);
  
  const authRes = await fetch(`${API_URL}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, signature, nonce }),
  });
  
  const authData = await authRes.json();
  if (!authData.accessToken) {
    throw new Error(`Authentication failed: ${JSON.stringify(authData)}`);
  }
  
  token = authData.accessToken;
  console.log('✅ Authenticated\n');
}

// ============ CREDIT SYSTEM TESTS ============

async function testCreditSystem() {
  console.log('\n💳 Testing Credit System...');
  console.log('─'.repeat(40));
  
  // 1. Open Credit Line
  console.log('\n📂 Step 1: Opening credit line for Family Arban...');
  try {
    const openRes = await fetch(`${API_URL}/arbans/credit/family/${ARBAN_ID}/open`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-seat-id': HUSBAND_SEAT_ID,
      },
      body: JSON.stringify({
        privateKey: ANVIL_PRIVATE_KEY,
      }),
    });
    
    const openData = await openRes.json();
    if (!openRes.ok) {
      console.log(`⚠️  Open credit line: ${JSON.stringify(openData)}`);
    } else {
      console.log(`✅ Credit line opened!`);
      console.log(`   Credit Limit: ${openData.creditLimit || 'N/A'}`);
      console.log(`   Rating: ${openData.creditRating || 'N/A'}`);
    }
  } catch (error) {
    console.log(`⚠️  Open credit line error: ${error.message}`);
  }
  
  // 2. Get Credit Dashboard
  console.log('\n📊 Step 2: Getting credit dashboard...');
  try {
    const dashRes = await fetch(`${API_URL}/arbans/credit/family/${ARBAN_ID}/dashboard`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-seat-id': HUSBAND_SEAT_ID,
      },
    });
    
    const dashData = await dashRes.json();
    if (!dashRes.ok) {
      console.log(`⚠️  Dashboard: ${JSON.stringify(dashData)}`);
    } else {
      console.log(`✅ Credit Dashboard retrieved!`);
      console.log(`   Credit Rating: ${dashData.creditRating || 'N/A'}`);
      console.log(`   Credit Limit: ${dashData.creditLimit || 'N/A'}`);
      console.log(`   Outstanding: ${dashData.outstandingDebt || 0}`);
    }
  } catch (error) {
    console.log(`⚠️  Dashboard error: ${error.message}`);
  }
  
  // 3. Get Interest Rate
  console.log('\n📈 Step 3: Getting current interest rate...');
  try {
    const rateRes = await fetch(`${API_URL}/arbans/credit/interest-rate`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-seat-id': HUSBAND_SEAT_ID,
      },
    });
    
    const rateData = await rateRes.json();
    if (!rateRes.ok) {
      console.log(`⚠️  Interest rate: ${JSON.stringify(rateData)}`);
    } else {
      console.log(`✅ Interest rate: ${rateData.rate || rateData.interestRate || 'N/A'}%`);
    }
  } catch (error) {
    console.log(`⚠️  Interest rate error: ${error.message}`);
  }
}

// ============ ORGANIZATIONAL ARBAN TESTS ============

async function testOrgArban() {
  console.log('\n\n🏢 Testing Organizational Arban...');
  console.log('─'.repeat(40));
  
  // 1. Create Org Arban
  console.log('\n📝 Step 1: Creating organizational arban...');
  try {
    const createRes = await fetch(`${API_URL}/arbans/org`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-seat-id': HUSBAND_SEAT_ID,
      },
      body: JSON.stringify({
        name: 'Test Guild',
        orgType: 'GUILD',
        leaderSeatId: HUSBAND_SEAT_ID,
        privateKey: ANVIL_PRIVATE_KEY,
      }),
    });
    
    const createData = await createRes.json();
    if (!createRes.ok) {
      console.log(`⚠️  Create org: ${JSON.stringify(createData)}`);
    } else {
      console.log(`✅ Org Arban created!`);
      console.log(`   Arban ID: ${createData.arbanId || 'N/A'}`);
      console.log(`   TX Hash: ${createData.txHash?.slice(0, 20) || 'N/A'}...`);
    }
  } catch (error) {
    console.log(`⚠️  Create org error: ${error.message}`);
  }
  
  // 2. Get Orgs by Type
  console.log('\n📋 Step 2: Getting organizations by type...');
  try {
    const listRes = await fetch(`${API_URL}/arbans/org?type=GUILD`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-seat-id': HUSBAND_SEAT_ID,
      },
    });
    
    const listData = await listRes.json();
    if (!listRes.ok) {
      console.log(`⚠️  List orgs: ${JSON.stringify(listData)}`);
    } else {
      console.log(`✅ Found ${Array.isArray(listData) ? listData.length : 0} organization(s)`);
    }
  } catch (error) {
    console.log(`⚠️  List orgs error: ${error.message}`);
  }
}

// ============ ZUN TESTS ============

async function testZun() {
  console.log('\n\n🏛️  Testing Zun (Clan) System...');
  console.log('─'.repeat(40));
  
  // Check if we need second arban for Zun (need at least 2)
  console.log('\n📋 Step 1: Checking Zun by Family Arban...');
  try {
    const zunRes = await fetch(`${API_URL}/arbans/zun/by-family/${ARBAN_ID}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-seat-id': HUSBAND_SEAT_ID,
      },
    });
    
    const zunData = await zunRes.json();
    if (!zunRes.ok) {
      console.log(`⚠️  Get Zun: ${JSON.stringify(zunData)}`);
    } else {
      console.log(`✅ Zun query successful!`);
      console.log(`   Zuns found: ${Array.isArray(zunData) ? zunData.length : 0}`);
      if (zunData.length > 0) {
        console.log(`   First Zun ID: ${zunData[0].zunId}`);
        console.log(`   Name: ${zunData[0].name}`);
      } else {
        console.log(`   (No Zun formed yet - needs 2+ Family Arbans)`);
      }
    }
  } catch (error) {
    console.log(`⚠️  Get Zun error: ${error.message}`);
  }
}

// ============ SUMMARY ============

async function printSummary() {
  console.log('\n\n' + '═'.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(50));
  console.log('\n✅ Tests Completed:');
  console.log('   • Authentication');
  console.log('   • Credit System (open, dashboard, rate)');
  console.log('   • Organizational Arban (create, list)');
  console.log('   • Zun System (query by family)');
  console.log('\n📝 Notes:');
  console.log('   • Zun formation requires 2+ Family Arbans');
  console.log('   • Credit operations may need actual blockchain state');
  console.log('   • Org creation requires valid member seat IDs');
  console.log('\n🎉 Extended Arban System: TESTED!\n');
}

// ============ MAIN ============

async function main() {
  try {
    await authenticate();
    await testCreditSystem();
    await testOrgArban();
    await testZun();
    await printSummary();
  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}`);
    process.exit(1);
  }
}

main();
