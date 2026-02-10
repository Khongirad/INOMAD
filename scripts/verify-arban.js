#!/usr/bin/env node

/**
 * Verification Script for Arban System
 * Verifies existing Arban record after successful operations
 */

const { ethers } = require('ethers');

// Configuration
const API_URL = 'http://localhost:3001/api';
const ANVIL_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const RPC_URL = 'http://localhost:8545';
const ARBAN_ID = 1;
const HUSBAND_SEAT_ID = '1';

// Create wallet
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(ANVIL_PRIVATE_KEY, provider);
const address = wallet.address;

console.log('🔍 Arban System Verification');
console.log('============================\n');

async function verify() {
  try {
    // Authenticate
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
    const { accessToken } = await authRes.json();
    
    // Get Arban details
    const arbanRes = await fetch(`${API_URL}/arbans/family/${ARBAN_ID}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-seat-id': HUSBAND_SEAT_ID,
      },
    });
    
    const arban = await arbanRes.json();
    
    console.log('✅ Arban Retrieved Successfully!\n');
    console.log('═══════════════════════════════════════');
    console.log(`  Arban ID: ${arban.arbanId}`);
    console.log(`  Husband: Seat ${arban.husbandSeatId}`);
    console.log(`  Wife: Seat ${arban.wifeSeatId}`);
    console.log(`  Children: [${arban.childrenSeatIds.join(', ')}]`);
    console.log(`  Heir: Seat ${arban.heirSeatId}`);
    console.log(`  Khural Rep: Seat ${arban.khuralRepSeatId || 'None'}`);
    console.log(`  Status: ${arban.isActive ? 'Active ✅' : 'Inactive'}`);
    console.log('═══════════════════════════════════════\n');
    
    // Verify expected state
    const  expectedChildren = ['3', '4'];
    const expectedHeir = '3';
    const expectedRep = '1';
    
    const allCorrect = 
      arban.husbandSeatId === '1' &&
      arban.wifeSeatId === '2' &&
      JSON.stringify(arban.childrenSeatIds.sort()) === JSON.stringify(expectedChildren.sort()) &&
      arban.heirSeatId === expectedHeir &&
      arban.khuralRepSeatId === expectedRep;
    
    if (allCorrect) {
      console.log('✅ ALL VERIFICATIONS PASSED!\n');
      console.log('Tested Operations:');
      console.log('  ✅ Marriage Registration (Husband: 1, Wife: 2)');
      console.log('  ✅ Add Child #1 (Seat 3)');
      console.log('  ✅ Add Child #2 (Seat 4)');
      console.log('  ✅ Change Heir (to Seat 3)');
      console.log('  ✅ Set Khural Representative (Seat 1)');
      console.log('\n🎉 Family Arban System: FULLY OPERATIONAL!\n');
    } else {
      console.error('❌ Verification failed - unexpected state');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

verify();
