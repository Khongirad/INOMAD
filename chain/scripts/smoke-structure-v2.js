// npx hardhat run scripts/smoke-structure-v2.js --network localhost
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  const StructureRegistry = await ethers.getContractFactory(
    "StructureRegistry"
  );
  const registry = await StructureRegistry.deploy(ethers.ZeroAddress);
  await registry.waitForDeployment();

  console.log("StructureRegistry:", await registry.getAddress());

  // MVP: пока симулируем arbanIds 1..10 (потом замените на реальные ID)
  const arbanIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const leader = deployer.address;

  const tx = await registry.registerZun(arbanIds, leader);
  const rc = await tx.wait();

  const evt = rc.logs
    .map((l) => {
      try {
        return registry.interface.parseLog(l);
      } catch {
        return null;
      }
    })
    .find((e) => e && e.name === "ZunRegistered");

  const zunId = evt.args.zunId;
  const zunAddr = evt.args.zun;

  console.log("ZunRegistered zunId:", zunId.toString());
  console.log("Zun address:", zunAddr);

  for (const a of arbanIds) {
    const z = await registry.zunOfArban(a);
    if (z.toString() !== zunId.toString()) {
      throw new Error(
        `membership fail: arban ${a} -> zun ${z} expected ${zunId}`
      );
    }
  }
  console.log("OK: zunOfArban checks passed");

  const children = await registry.getZunChildren(zunId);
  console.log(
    "Zun children:",
    children.map((x) => x.toString())
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
