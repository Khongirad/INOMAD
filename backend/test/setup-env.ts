import * as path from 'path';
import * as fs from 'fs';

// Load .env file for E2E tests
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

// Ensure AUTH_JWT_SECRET is set (maps from JWT_SECRET if needed)
if (!process.env.AUTH_JWT_SECRET && process.env.JWT_SECRET) {
  process.env.AUTH_JWT_SECRET = process.env.JWT_SECRET;
}

// Fallback for tests
if (!process.env.AUTH_JWT_SECRET) {
  process.env.AUTH_JWT_SECRET = 'e2e-test-secret-key';
}

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/inomad_khural';
}

// Blockchain fallbacks for services like VotingCenterService
const DUMMY_ADDRESS = '0x0000000000000000000000000000000000000001';
if (!process.env.VOTING_CENTER_ADDRESS) {
  process.env.VOTING_CENTER_ADDRESS = DUMMY_ADDRESS;
}
if (!process.env.RPC_URL) {
  process.env.RPC_URL = 'http://localhost:8545';
}
if (!process.env.ALTAN_RPC_URL) {
  process.env.ALTAN_RPC_URL = 'http://localhost:8545';
}
if (!process.env.BLOCKCHAIN_ENABLED) {
  process.env.BLOCKCHAIN_ENABLED = 'false';
}
