const hre = require("hardhat");

async function main() {
  const LEDGER = process.env.LEDGER;
  const LICENSE_REG = process.env.LICENSE_REG;
  if (!LEDGER || !LICENSE_REG) throw new Error("Set env LEDGER and LICENSE_REG");

  const CONFED_BUDGET_ID = hre.ethers.keccak256(
    hre.ethers.toUtf8Bytes("ACCOUNT:CONFEDERATION_BUDGET")
  );

  const TA = await hre.ethers.getContractFactory("TaxAuthority");
  const ta = await TA.deploy(LEDGER, LICENSE_REG, CONFED_BUDGET_ID);
  await ta.waitForDeployment();

  console.log("TaxAuthority:", await ta.getAddress());
  console.log("CONFED_BUDGET_ID:", CONFED_BUDGET_ID);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
