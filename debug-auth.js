#!/usr/bin/env node

const { ethers } = require('ethers');

const API_URL = 'http://localhost:3001/api';
const ANVIL_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const RPC_URL = 'http://localhost:8545';

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(ANVIL_PRIVATE_KEY, provider);
const address = wallet.address;

console.log('🔍 Debugging Auth Response\n');
console.log(`Wallet: ${address}\n`);

async function debug() {
  try {
    // Get nonce
    const nonceRes = await fetch(`${API_URL}/auth/nonce`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: address }),
    });
    const { nonce, message } = await nonceRes.json();
    console.log('✅ Nonce:', nonce);

    // Sign
    const signature = await wallet.signMessage(message);
    console.log('✅ Signature:', signature.slice(0, 30) + '...');

    // Verify
    const authRes = await fetch(`${API_URL}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, signature, nonce }),
    });

    const authData = await authRes.json();
    console.log('\n📦 Full auth response:');
    console.log(JSON.stringify(authData, null, 2));

    // Decode JWT
    if (authData.accessToken) {
      const parts = authData.accessToken.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      console.log('\n🔐 JWT Payload:');
      console.log(JSON.stringify(payload, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debug();
