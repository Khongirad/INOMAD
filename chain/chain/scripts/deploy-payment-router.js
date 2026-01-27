const hre = require("hardhat");

async function main() {
  const LEDGER = process.env.LEDGER;
  const FEE = process.env.FEE;
  const TAX = process.env.TAX;
  if (!LEDGER || !FEE || !TAX) throw new Error("Set env LEDGER, FEE, TAX");

  const Router = await hre.ethers.getContractFactory("PaymentRouter");
  const router = await Router.deploy(LEDGER, FEE, TAX);
  await router.waitForDeployment();

  console.log("PaymentRouter:", await router.getAddress());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
