#!/usr/bin/env node

/**
 * Arban System API Test Script
 * Tests authentication and Family Arban registration
 */

const { ethers } = require('ethers');

// Configuration
const API_URL = 'http://localhost:3001/api';
const ANVIL_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Anvil account #0
const RPC_URL = 'http://localhost:8545';

// Create wallet
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(ANVIL_PRIVATE_KEY, provider);
const address = wallet.address;

console.log('🧪 Arban System API Test');
console.log('========================\n');
console.log(`Wallet: ${address}`);

async function test() {
  try {
    // Step 1: Get nonce
    console.log('\n📝 Step 1: Request nonce...');
    const nonceRes = await fetch(`${API_URL}/auth/nonce`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: address }),
    });
    
    const nonceData = await nonceRes.json();
    const { nonce, message: signMessage } = nonceData;
    console.log(`✅ Nonce: ${nonce}`);
    console.log(`   Message: ${signMessage}`);

    // Step 2: Sign nonce
    console.log('\n✍️  Step 2: Sign nonce with wallet...');
    const signature = await wallet.signMessage(signMessage);
    console.log(`✅ Signature: ${signature.slice(0, 20)}...`);

    // Step 3: Verify signature and get JWT
    console.log('\n🔐 Step 3: Verify signature and get JWT...');
    const authRes = await fetch(`${API_URL}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: address,
        signature: signature,
        nonce: nonce,
      }),
    });
    
    const authData = await authRes.json();
    const { accessToken, refreshToken, user } = authData;
    console.log(`✅ Got JWT token`);
    console.log(`   User ID: ${user?.userId || 'N/A'}`);
    console.log(`   Seat ID: ${user?.seatId || 'N/A'}`);

    // Step 4: Test authenticated endpoint (GET /auth/me)
    console.log('\n👤 Step 4: Test /auth/me endpoint...');
    const meRes = await fetch(`${API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    const meData = await meRes.json();
    console.log(`✅ User data retrieved:`, meData.me);

    // Step 5: Test Family Arban endpoint
    console.log('\n👨‍👩‍👦 Step 5: Test Family Arban endpoint...');
    console.log('   Attempting to register marriage...');
    
    // Use numeric seat IDs (compatible with smart contract uint256)
    const seatId = '1'; // Changed from SEAT-001
    const wifeSeatId = '2'; // Changed from SEAT-002
    
    const marriageRes = await fetch(`${API_URL}/arbans/family/marriage`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-seat-id': seatId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        husbandSeatId: seatId,
        wifeSeatId: wifeSeatId,
        privateKey: ANVIL_PRIVATE_KEY,
      }),
    });

    if (!marriageRes.ok) {
      const errorData = await marriageRes.json();
      throw new Error(`Marriage registration failed: ${JSON.stringify(errorData)}`);
    }

    const marriageData = await marriageRes.json();

    console.log(`\n🎉 Marriage registered successfully!`);
    console.log(`   Arban ID: ${marriageData.arbanId}`);
    console.log(`   TX Hash: ${marriageData.txHash}`);

    // Step 6: Verify in database
    console.log('\n✅ Test completed successfully!\n');
    console.log('Next steps:');
    console.log('  - Check Prisma Studio for FamilyArban record');
    console.log('  - Check Anvil terminal for MarriageRegistered event');
    console.log(`  - Get Arban: curl ${API_URL}/arbans/family/${marriageData.arbanId} -H "Authorization: Bearer ${accessToken.slice(0, 20)}..."`);

  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error(`   ${error.message}`);
    if (error.response) {
      console.error(`   Response:`, error.response);
    }
    process.exit(1);
  }
}

// Run test
test();
