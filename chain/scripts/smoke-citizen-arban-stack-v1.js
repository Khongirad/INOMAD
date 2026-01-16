const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const StructureRegistry = await ethers.getContractFactory("StructureRegistry");
  const registry = await StructureRegistry.deploy(ethers.ZeroAddress);
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();

  const SeatSBT = await ethers.getContractFactory("SeatSBT");
  const seat = await SeatSBT.deploy();
  await seat.waitForDeployment();

  const SeatAccountFactory = await ethers.getContractFactory("SeatAccountFactory");
  const factory = await SeatAccountFactory.deploy(await seat.getAddress());
  await factory.waitForDeployment();

  const CitizenRegistry = await ethers.getContractFactory("CitizenRegistry");
  const citizen = await CitizenRegistry.deploy(await seat.getAddress());
  await citizen.waitForDeployment();

  const ArbanRegistry = await ethers.getContractFactory("ArbanRegistry");
  const arban = await ArbanRegistry.deploy(
    ethers.ZeroAddress,              // organization_ (MVP allowed)
    await seat.getAddress(),
    registryAddr
  );
  await arban.waitForDeployment();

  const out = {
    StructureRegistry: registryAddr,
    SeatSBT: await seat.getAddress(),
    SeatAccountFactory: await factory.getAddress(),
    CitizenRegistry: await citizen.getAddress(),
    ArbanRegistry: await arban.getAddress(),
  };

  const outPath = path.join(process.cwd(), "addresses-stack.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log("STACK_ADDRESSES_JSON:", outPath);
  for (const [k, v] of Object.entries(out)) console.log(`${k}: ${v}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
