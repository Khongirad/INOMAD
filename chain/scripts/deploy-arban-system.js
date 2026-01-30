const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const { ethers } = hre;

function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
}

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying Arban System contracts with account:", deployer.address);

  // Deploy ArbanCompletion
  console.log("\nDeploying ArbanCompletion...");
  const ArbanCompletion = await ethers.getContractFactory("ArbanCompletion");
  const arbanCompletion = await ArbanCompletion.deploy();
  await arbanCompletion.waitForDeployment();
  const completionAddress = await arbanCompletion.getAddress();
  console.log("✅ ArbanCompletion deployed to:", completionAddress);

  // Deploy ArbanCreditLine with ArbanCompletion address
  console.log("\nDeploying ArbanCreditLine...");
  const ArbanCreditLine = await ethers.getContractFactory("ArbanCreditLine");
  const arbanCreditLine = await ArbanCreditLine.deploy(completionAddress);
  await arbanCreditLine.waitForDeployment();
  const creditLineAddress = await arbanCreditLine.getAddress();
  console.log("✅ ArbanCreditLine deployed to:", creditLineAddress);

  // Set initial interest rate (5% = 500 bps)
  console.log("\nSetting initial interest rate to 5%...");
  const setRateTx = await arbanCreditLine.setInterestRate(500);
  await setRateTx.wait();
  console.log("✅ Interest rate set to 5% (500 bps)");

  const out = {
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    network: hre.network.name,
    ArbanCompletion: completionAddress,
    ArbanCreditLine: creditLineAddress,
    interestRateBps: 500,
  };

  // Write to addresses file
  const outPath = path.join(process.cwd(), "addresses-arban.json");
  writeJson(outPath, out);

  console.log("\n📝 Deployment Summary:");
  console.log(JSON.stringify(out, null, 2));
  console.log("\n✅ Addresses saved to:", outPath);

  // Write .env format for easy copy-paste
  const envPath = path.join(process.cwd(), "../backend/.env.arban");
  const envContent = `# Arban System Contract Addresses
# Deployed: ${out.timestamp}
# Network: ${hre.network.name}

ARBAN_COMPLETION_ADDRESS="${completionAddress}"
ARBAN_CREDIT_LINE_ADDRESS="${creditLineAddress}"
`;
  fs.writeFileSync(envPath, envContent);
  console.log("✅ .env format saved to:", envPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
