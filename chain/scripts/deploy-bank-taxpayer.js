const hre = require("hardhat");

async function main() {
  const TAX_AUTH = process.env.TAX_AUTH;
  if (!TAX_AUTH) throw new Error("Set env TAX_AUTH=0x...");

  const BTP = await hre.ethers.getContractFactory("BankTaxPayer");
  const btp = await BTP.deploy(TAX_AUTH);
  await btp.waitForDeployment();

  console.log("BankTaxPayer:", await btp.getAddress());
}

main().catch((e) => { console.error(e); process.exit(1); });
