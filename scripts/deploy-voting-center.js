/**
 * Deploy VotingCenter + StatisticsBureau contracts
 *
 * Usage:
 *   npx hardhat run scripts/deploy-voting-center.js --network baseSepolia
 *
 * After deployment, set these env vars in the backend:
 *   VOTING_CENTER_ADDRESS=<deployed address>
 */
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // --- StatisticsBureau ---
  // Constructor: (address admin, address _temple)
  // Using deployer as temple placeholder — update with real Temple of Heaven address later
  console.log("\n1. Deploying StatisticsBureau...");
  const StatisticsBureau = await ethers.getContractFactory("StatisticsBureau");
  const bureau = await StatisticsBureau.deploy(deployer.address, deployer.address);
  await bureau.waitForDeployment();
  const bureauAddress = await bureau.getAddress();
  console.log("   StatisticsBureau deployed at:", bureauAddress);

  // --- VotingCenter ---
  console.log("\n2. Deploying VotingCenter...");
  const VotingCenter = await ethers.getContractFactory("VotingCenter");
  const votingCenter = await VotingCenter.deploy(deployer.address, bureauAddress);
  await votingCenter.waitForDeployment();
  const votingCenterAddress = await votingCenter.getAddress();
  console.log("   VotingCenter deployed at:", votingCenterAddress);

  // --- Grant KHURAL_ROLE to deployer for testing ---
  console.log("\n3. Granting roles...");
  const KHURAL_ROLE = ethers.keccak256(ethers.toUtf8Bytes("KHURAL_ROLE"));
  await (await votingCenter.grantRole(KHURAL_ROLE, deployer.address)).wait();
  console.log("   KHURAL_ROLE granted on VotingCenter");

  // Grant VOTING_CENTER_ROLE on StatisticsBureau to VotingCenter
  const VOTING_CENTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("VOTING_CENTER_ROLE"));
  await (await bureau.grantRole(VOTING_CENTER_ROLE, votingCenterAddress)).wait();
  console.log("   VOTING_CENTER_ROLE granted on StatisticsBureau -> VotingCenter");

  // --- Output ---
  const out = {
    deployer: deployer.address,
    StatisticsBureau: bureauAddress,
    VotingCenter: votingCenterAddress,
    network: hre.network.name,
    timestamp: new Date().toISOString(),
  };

  const outPath = path.join(process.cwd(), "voting-center-addresses.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));

  console.log("\n✅ Deployment complete!");
  console.log("Addresses written to:", outPath);
  console.log("\nSet this in your backend .env:");
  console.log(`VOTING_CENTER_ADDRESS=${votingCenterAddress}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
