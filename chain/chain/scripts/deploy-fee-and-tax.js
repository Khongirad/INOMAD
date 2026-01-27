const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("deployer:", deployer.address);

  const LEDGER = process.env.LEDGER;
  if (!LEDGER) throw new Error("Set env LEDGER=0x... (AltanBankLedger address)");

  const INOMAD_ACCOUNT_ID = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("ACCOUNT:INOMAD_INC"));
  const STATE_TREASURY_ID = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("ACCOUNT:STATE_TREASURY"));
  const CONFED_BUDGET_ID = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("ACCOUNT:CONFEDERATION_BUDGET"));

  console.log("LEDGER:", LEDGER);
  console.log("INOMAD_ACCOUNT_ID:", INOMAD_ACCOUNT_ID);
  console.log("STATE_TREASURY_ID:", STATE_TREASURY_ID);
  console.log("CONFED_BUDGET_ID:", CONFED_BUDGET_ID);

  // 1) StateTreasury (semantic anchor)
  const Treasury = await hre.ethers.getContractFactory("StateTreasury");
  const treasury = await Treasury.deploy(STATE_TREASURY_ID);
  await treasury.waitForDeployment();
  const treasuryAddr = await treasury.getAddress();
  console.log("StateTreasury:", treasuryAddr);

  // 2) FeeEngine (0.03% -> INOMAD)
  const Fee = await hre.ethers.getContractFactory("FeeEngine");
  const fee = await Fee.deploy(LEDGER, INOMAD_ACCOUNT_ID);
  await fee.waitForDeployment();
  const feeAddr = await fee.getAddress();
  console.log("FeeEngine:", feeAddr);

  // 3) TaxEngine (10% split 7/3 to republic/confed)
  const Tax = await hre.ethers.getContractFactory("TaxEngine");
  const tax = await Tax.deploy(LEDGER, CONFED_BUDGET_ID);
  await tax.waitForDeployment();
  const taxAddr = await tax.getAddress();
  console.log("TaxEngine:", taxAddr);

  console.log("DONE");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
