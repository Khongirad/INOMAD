#!/usr/bin/env bash
set -euo pipefail

# ==========================================
# INOMAD CLIENT: chain/ (Hardhat) bootstrap
# + copy ABIs to Next.js src/lib/abi
# + write src/lib/contracts/addresses.ts
# + write a small Next.js helper to read ownerOf()
# ==========================================

# 0) Preconditions
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
  echo "ERROR: Run this from the ROOT of your Next.js project (inomad-client), where package.json and src/ exist."
  exit 1
fi

echo "==> 1) Creating chain/ Hardhat workspace"
mkdir -p chain
cd chain

if [ ! -f "package.json" ]; then
  npm init -y >/dev/null
fi

echo "==> 2) Installing Hardhat toolbox (dev deps)"
npm i -D hardhat @nomicfoundation/hardhat-toolbox >/dev/null

echo "==> 3) Creating Hardhat config + folders"
mkdir -p contracts scripts

cat > hardhat.config.js <<'JS'
require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  networks: {
    hardhat: {},
  },
};
JS

# 4) Add minimal demo contracts if user hasn't copied their own yet.
#    NOTE: Replace these with your real SeatSBT.sol + ElectionRegistry.sol when ready.
#    The task here is to get a full compile/deploy/ABI export pipeline working end-to-end.

if [ ! -f "contracts/SeatSBT.sol" ]; then
cat > contracts/SeatSBT.sol <<'SOL'
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * Minimal SeatSBT demo:
 * - non-transferable (no ERC721 transfer funcs exposed)
 * - ownerOf(seatId) works
 * - mintSeat(to, seatId) for demo (authority = deployer)
 */
contract SeatSBT {
    address public immutable authority;
    mapping(uint256 => address) private _owner;

    error NOT_AUTHORITY();
    error SEAT_EXISTS();
    error SEAT_NOT_MINTED();

    constructor() {
        authority = msg.sender;
    }

    function mintSeat(address to, uint256 seatId) external {
        if (msg.sender != authority) revert NOT_AUTHORITY();
        if (_owner[seatId] != address(0)) revert SEAT_EXISTS();
        _owner[seatId] = to;
    }

    function ownerOf(uint256 seatId) external view returns (address) {
        address o = _owner[seatId];
        if (o == address(0)) revert SEAT_NOT_MINTED();
        return o;
    }
}
SOL
fi

if [ ! -f "contracts/ElectionRegistry.sol" ]; then
cat > contracts/ElectionRegistry.sol <<'SOL'
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISeatSBT {
    function mintSeat(address to, uint256 seatId) external;
}

/**
 * Minimal ElectionRegistry demo:
 * - registerCandidate(seatId, candidate)
 * - finalizeElection(seatId) mints SeatSBT to candidate
 * This is just an end-to-end pipeline stub.
 */
contract ElectionRegistry {
    address public immutable admin;
    ISeatSBT public immutable seat;

    mapping(uint256 => address) public seatWinner;

    error NOT_ADMIN();
    error WINNER_ALREADY_SET();
    error INVALID_WINNER();

    constructor(address seat_) {
        admin = msg.sender;
        seat = ISeatSBT(seat_);
    }

    function registerWinner(uint256 seatId, address winner) external {
        if (msg.sender != admin) revert NOT_ADMIN();
        if (seatWinner[seatId] != address(0)) revert WINNER_ALREADY_SET();
        if (winner == address(0)) revert INVALID_WINNER();
        seatWinner[seatId] = winner;
    }

    function finalize(uint256 seatId) external {
        address winner = seatWinner[seatId];
        if (winner == address(0)) revert INVALID_WINNER();
        // mint SeatSBT to winner
        seat.mintSeat(winner, seatId);
    }
}
SOL
fi

echo "==> 4) Adding deploy script"
cat > scripts/deploy.js <<'JS'
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const Seat = await hre.ethers.getContractFactory("SeatSBT");
  const seat = await Seat.deploy();
  await seat.waitForDeployment();
  const seatAddr = await seat.getAddress();

  const Election = await hre.ethers.getContractFactory("ElectionRegistry");
  const election = await Election.deploy(seatAddr);
  await election.waitForDeployment();
  const electionAddr = await election.getAddress();

  console.log("SeatSBT:", seatAddr);
  console.log("ElectionRegistry:", electionAddr);

  // write addresses.json
  const fs = require("fs");
  fs.writeFileSync(
    "addresses.json",
    JSON.stringify({ seatSBT: seatAddr, electionRegistry: electionAddr }, null, 2)
  );
  console.log("Wrote chain/addresses.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
JS

echo "==> 5) Compile & deploy (Hardhat in-process network)"
npx hardhat compile >/dev/null
node scripts/deploy.js

echo "==> 6) Copy ABIs into Next.js src/lib/abi"
cd ..
mkdir -p src/lib/abi src/lib/contracts src/lib/chain

# Copy ABI JSONs (keep full artifact json; we'll reference .abi field)
cp -f chain/artifacts/contracts/SeatSBT.sol/SeatSBT.json src/lib/abi/SeatSBT.json
cp -f chain/artifacts/contracts/ElectionRegistry.sol/ElectionRegistry.json src/lib/abi/ElectionRegistry.json

echo "==> 7) Write src/lib/contracts/addresses.ts from chain/addresses.json"
node - <<'NODE'
const fs = require("fs");
const path = require("path");

const addrPath = path.join(process.cwd(), "chain", "addresses.json");
const outPath  = path.join(process.cwd(), "src", "lib", "contracts", "addresses.ts");

const addrs = JSON.parse(fs.readFileSync(addrPath, "utf8"));

const content = `export const ADDRESSES = {
  seatSBT: "${addrs.seatSBT}",
  electionRegistry: "${addrs.electionRegistry}",
} as const;
`;

fs.writeFileSync(outPath, content);
console.log("Wrote", outPath);
NODE

echo "==> 8) Add a tiny client helper: src/lib/chain/seat.ts"
cat > src/lib/chain/seat.ts <<'TS'
import { ethers } from "ethers";
import SeatSBTArtifact from "@/lib/abi/SeatSBT.json";
import { ADDRESSES } from "@/lib/contracts/addresses";

/**
 * Reads SeatSBT.ownerOf(seatId).
 * Requires a browser wallet (window.ethereum).
 */
export async function seatOwnerOf(seatId: bigint): Promise<string> {
  // @ts-expect-error
  if (!window?.ethereum) throw new Error("NO_WALLET");

  // @ts-expect-error
  const provider = new ethers.BrowserProvider(window.ethereum);
  const seat = new ethers.Contract(
    ADDRESSES.seatSBT,
    // artifact json contains { abi: [...] }
    (SeatSBTArtifact as any).abi,
    provider
  );

  const owner: string = await seat.ownerOf(seatId);
  return owner;
}
TS

echo "==> 9) Print next manual steps"
cat <<'TXT'

DONE.

NEXT STEPS (manual):
1) Start Next.js:
   npm run dev

2) In your src/app/(app)/family/page.tsx (or any client component),
   import and call:

   import { seatOwnerOf } from "@/lib/chain/seat";

   // example:
   const owner = await seatOwnerOf(123n);

3) IMPORTANT:
   This deploy used Hardhat's in-process ephemeral chain (fresh each run).
   If you want persistent localhost chain:
   - Terminal A: cd chain && npx hardhat node
   - Terminal B: cd chain && npx hardhat run scripts/deploy.js --network localhost
   Then update hardhat.config.js networks + add RPC in frontend.

Replace demo contracts with your real SeatSBT.sol and ElectionRegistry.sol when ready:
- Put your real contracts into chain/contracts/
- Re-run:
  cd chain && npx hardhat compile && node scripts/deploy.js
  (then copy ABIs again or re-run this whole script)

TXT




