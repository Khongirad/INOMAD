const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const owner = process.env.OWNER || deployer.address;

  const CoreLock = await hre.ethers.getContractFactory("CoreLock");
  const coreLock = await CoreLock.deploy(owner);
  await coreLock.waitForDeployment();

  const addr = await coreLock.getAddress();
  console.log("OWNER:", owner);
  console.log("CORELOCK_ADDRESS:", addr);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
