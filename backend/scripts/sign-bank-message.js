#!/usr/bin/env node

/**
 * Sign Bank Authentication Message
 * 
 * Usage:
 *   node sign-bank-message.js <nonce>
 * 
 * Signs message: "Bank of Siberia: {nonce}" with Anvil test wallet
 */

const ethers = require('ethers');

const ANVIL_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const ANVIL_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

async function signBankMessage(nonce) {
  const wallet = new ethers.Wallet(ANVIL_PRIVATE_KEY);
  const message = `Bank of Siberia: ${nonce}`;
  
  console.log('Signing bank authentication message...');
  console.log(`Wallet Address: ${ANVIL_ADDRESS}`);
  console.log(`Message: "${message}"`);
  console.log('');
  
  const signature = await wallet.signMessage(message);
  
  console.log('✅ Signature created:');
  console.log(signature);
  console.log('');
  console.log('📋 Bank Ticket Request Body:');
  console.log(JSON.stringify({
    address: ANVIL_ADDRESS,
    signature: signature,
    nonce: nonce
  }, null, 2));
  
  return { address: ANVIL_ADDRESS, signature, nonce, message };
}

const nonce = process.argv[2];
if (!nonce) {
  console.error('❌ Error: Nonce required');
  console.error('Usage: node sign-bank-message.js <nonce>');
  process.exit(1);
}

signBankMessage(nonce)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
