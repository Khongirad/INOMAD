// npx hardhat run scripts/smoke-zun-resolution-v1.js --network localhost
const { ethers } = require("hardhat");

async function main() {
  const signers = await ethers.getSigners();
  const [deployer, ...rest] = signers;

  // 1) Deploy StructureRegistry
  const StructureRegistry = await ethers.getContractFactory(
    "StructureRegistry"
  );
  const registry = await StructureRegistry.deploy(ethers.ZeroAddress);
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log("StructureRegistry:", registryAddr);

  // 2) Create Zun from 10 Arban IDs (MVP ids)
  const arbanIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const leaderPlaceholder = deployer.address;

  const tx = await registry.registerZun(arbanIds, leaderPlaceholder);
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
  console.log("ZunId:", zunId.toString());

  // 3) Assign 10 Arban leaders (use 10 different accounts)
  // rest[0..9] must exist (hardhat has many accounts)
  for (let i = 0; i < 10; i++) {
    const leader = rest[i].address;
    await (await registry.setArbanLeader(arbanIds[i], leader)).wait();
  }
  console.log("Assigned 10 Arban leaders.");

  // 4) Deploy ZunResolution (doc)
  const ZunResolution = await ethers.getContractFactory("ZunResolution");
  const docHash = ethers.keccak256(
    ethers.toUtf8Bytes("ZUN:resolution:test:v1")
  );
  const doc = await ZunResolution.deploy(
    registryAddr,
    zunId,
    docHash,
    deployer.address
  );
  await doc.waitForDeployment();
  console.log("ZunResolution:", await doc.getAddress());

  // 5) Try wrong signer (deployer is not a leader) -> should revert
  let reverted = false;
  try {
    await (await doc.connect(deployer).sign()).wait();
  } catch (e) {
    reverted = true;
  }
  console.log("Non-leader sign reverted:", reverted);

  // 6) Collect 10 leader signatures
  for (let i = 0; i < 10; i++) {
    await (await doc.connect(rest[i]).sign()).wait();
  }
  console.log("SignedCount:", (await doc.signedCount()).toString());

  // 7) Finalize
  await (await doc.finalize()).wait();
  console.log("Finalized:", await doc.finalized());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
