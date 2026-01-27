const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  const StructureRegistry = await ethers.getContractFactory(
    "StructureRegistry"
  );
  const registry = await StructureRegistry.deploy(ethers.ZeroAddress);
  await registry.waitForDeployment();

  const leader = deployer.address;

  // Создадим 10 Myangan:
  // каждый Myangan требует 10 Zun, а каждый Zun создадим из "симуляции" Arban IDs.
  const myanganIds = [];

  for (let m = 0; m < 10; m++) {
    const zunIds = [];

    for (let z = 0; z < 10; z++) {
      const base = m * 100 + z * 10 + 1;
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
      const txZ = await registry.registerZun(arbanIds, leader);
      const rcZ = await txZ.wait();
      const evtZ = rcZ.logs
        .map((l) => {
          try {
            return registry.interface.parseLog(l);
          } catch {
            return null;
          }
        })
        .find((e) => e && e.name === "ZunRegistered");
      zunIds.push(Number(evtZ.args.zunId));
    }

    const txM = await registry.registerMyangan(zunIds, leader);
    const rcM = await txM.wait();
    const evtM = rcM.logs
      .map((l) => {
        try {
          return registry.interface.parseLog(l);
        } catch {
          return null;
        }
      })
      .find((e) => e && e.name === "MyanganRegistered");
    myanganIds.push(Number(evtM.args.myanganId));
  }

  // Теперь 10 Myangan -> 1 Tumen
  const txT = await registry.registerTumen(myanganIds, leader);
  const rcT = await txT.wait();
  const evtT = rcT.logs
    .map((l) => {
      try {
        return registry.interface.parseLog(l);
      } catch {
        return null;
      }
    })
    .find((e) => e && e.name === "TumenRegistered");

  const tumenId = evtT.args.tumenId;
  console.log("TumenRegistered tumenId:", tumenId.toString());

  for (const mid of myanganIds) {
    const t = await registry.tumenOfMyangan(mid);
    if (t.toString() !== tumenId.toString())
      throw new Error(`myangan ${mid} -> tumen ${t} mismatch`);
  }
  console.log("OK: tumenOfMyangan checks passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
