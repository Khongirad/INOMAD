const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  const StructureRegistry = await ethers.getContractFactory(
    "StructureRegistry"
  );
  const registry = await StructureRegistry.deploy(ethers.ZeroAddress);
  await registry.waitForDeployment();

  // создаём 10 Zun: каждый из 10 арбанов (пока симуляция)
  // В реальности: у тебя будет 100 Arban = 10 Zun
  const leader = deployer.address;

  const zunIds = [];
  for (let k = 0; k < 10; k++) {
    const base = k * 10 + 1;
    const arbanIds = [
      base,
      base + 1,
      base + 2,
      base + 3,
      base + 4,
      base + 5,
      base + 6,
      base + 7,
      base + 8,
      base + 9,
    ];
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
    zunIds.push(Number(evt.args.zunId));
  }

  // регистрируем Myangan из 10 Zun
  const tx2 = await registry.registerMyangan(zunIds, leader);
  const rc2 = await tx2.wait();
  const evt2 = rc2.logs
    .map((l) => {
      try {
        return registry.interface.parseLog(l);
      } catch {
        return null;
      }
    })
    .find((e) => e && e.name === "MyanganRegistered");

  const myanganId = evt2.args.myanganId;
  console.log("MyanganRegistered myanganId:", myanganId.toString());

  // проверки
  for (const z of zunIds) {
    const m = await registry.myanganOfZun(z);
    if (m.toString() !== myanganId.toString())
      throw new Error(`zun ${z} -> myangan ${m} mismatch`);
  }
  console.log("OK: myanganOfZun checks passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
