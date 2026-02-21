// npx hardhat run scripts/smoke-myangan-leader-appointment-v1.js --network localhost
const { ethers } = require("hardhat");

async function main() {
  const signers = await ethers.getSigners();
  const [deployer, notaryZun, notaryMy, ...rest] = signers;

  // Deploy StructureRegistry
  const StructureRegistry = await ethers.getContractFactory(
    "StructureRegistry"
  );
  const registry = await StructureRegistry.deploy(ethers.ZeroAddress);
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log("StructureRegistry:", registryAddr);

  // Build 10 Zun
  const zunIds = [];
  for (let z = 0; z < 10; z++) {
    const base = z * 10 + 1;
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

    const txZ = await registry.registerZun(arbanIds, deployer.address);
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

    const zunId = Number(evtZ.args.zunId);
    zunIds.push(zunId);

    // назначаем лидера Zun (подписант на уровне Myangan)
    await (await registry.setZunLeaderCitizen(zunId, rest[z].address)).wait();
  }
  console.log("Zuns:", zunIds.map(String));

  // Create Myangan from 10 Zun
  const txM = await registry.registerMyangan(zunIds, deployer.address);
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

  const myanganId = Number(evtM.args.myanganId);
  console.log("MyanganId:", myanganId);

  // Deploy DocumentRegistry
  const DocumentRegistry = await ethers.getContractFactory("DocumentRegistry");
  const docReg = await DocumentRegistry.deploy();
  await docReg.waitForDeployment();

  // Deploy NotaryHub (chairmanRegistry not used here)
  const NotaryHub = await ethers.getContractFactory("NotaryHub");
  const hub = await NotaryHub.deploy(
    registryAddr,
    await docReg.getAddress(),
    ethers.ZeroAddress
  );
  await hub.waitForDeployment();
  const hubAddr = await hub.getAddress();

  // Give hub control
  await (await docReg.setOwner(hubAddr)).wait();
  await (await registry.setOwner(hubAddr)).wait(); // важно: чтобы hub мог setUpdater()

  // Set MYANGAN notary
  await (await hub.setNotary(notaryMy.address, 3 /*MYANGAN*/, true)).wait();

  // Issue appointment
  const newLeader = signers[19].address; // <-- FIX: гарантированно существует
  const docHash = ethers.keccak256(
    ethers.toUtf8Bytes("MYANGAN:leader:appointment:v1")
  );

  const txIssue = await hub
    .connect(notaryMy)
    .issueMyanganLeaderAppointment(myanganId, newLeader, docHash);
  const rcIssue = await txIssue.wait();

  const issued = rcIssue.logs
    .map((l) => {
      try {
        return hub.interface.parseLog(l);
      } catch {
        return null;
      }
    })
    .find((e) => e && e.name === "MyanganLeaderAppointmentIssued");

  const docAddr = issued.args.docAddress;
  console.log("Appointment doc:", docAddr);

  // Sign by 10 Zun leaders
  const MyanganLeaderAppointment = await ethers.getContractFactory(
    "MyanganLeaderAppointment"
  );
  const doc = MyanganLeaderAppointment.attach(docAddr);

  for (let i = 0; i < 10; i++) {
    await (await doc.connect(rest[i]).sign()).wait();
  }
  console.log("SignedCount:", (await doc.signedCount()).toString());

  // Finalize -> applies myangan leader in registry
  await (await doc.finalize()).wait();

  const applied = await registry.myanganLeader(myanganId);
  console.log("Registry myanganLeader:", applied);
  console.log("Expected newLeader:", newLeader);

  if (applied.toLowerCase() !== newLeader.toLowerCase()) {
    throw new Error("Leader not applied");
  }

  console.log("OK: myangan leader appointment applied by document.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
