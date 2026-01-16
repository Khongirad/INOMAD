// npx hardhat run scripts/smoke-tumen-leader-appointment-v1.js --network localhost
const { ethers } = require("hardhat");

async function main() {
  const signers = await ethers.getSigners();
  const [deployer, notaryMy, notaryTumen, ...rest] = signers;

  // Deploy StructureRegistry
  const StructureRegistry = await ethers.getContractFactory(
    "StructureRegistry"
  );
  const registry = await StructureRegistry.deploy(ethers.ZeroAddress);
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log("StructureRegistry:", registryAddr);

  // Build 10 Myangan
  const myanganIds = [];

  // Для каждого Myangan создаём 10 Zun (всего 100 Zun, ок для smoke)
  let zunCounter = 0;
  for (let m = 0; m < 10; m++) {
    const zunIds = [];

    for (let z = 0; z < 10; z++) {
      const base = zunCounter * 10 + 1;
      zunCounter++;

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

      // (не обязательно для этого smoke) можно назначить zunLeader, но нам важен myanganLeader
      await (
        await registry.setZunLeaderCitizen(
          zunId,
          rest[(m * 10 + z) % rest.length].address
        )
      ).wait();
    }

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
    myanganIds.push(myanganId);

    // Назначаем лидера Myangan (это подписи для Tumen)
    await (
      await registry.setMyanganLeaderCitizen(myanganId, rest[m].address)
    ).wait();
  }

  console.log("Myangans:", myanganIds.map(String));

  // Create Tumen from 10 Myangan
  const txT = await registry.registerTumen(myanganIds, deployer.address);
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

  const tumenId = Number(evtT.args.tumenId);
  console.log("TumenId:", tumenId);

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

  // Set TUMEN notary
  await (await hub.setNotary(notaryTumen.address, 4 /*TUMEN*/, true)).wait();

  // Issue appointment
  const newLeader = signers[19].address;
  const docHash = ethers.keccak256(
    ethers.toUtf8Bytes("TUMEN:leader:appointment:v1")
  );

  const txIssue = await hub
    .connect(notaryTumen)
    .issueTumenLeaderAppointment(tumenId, newLeader, docHash);
  const rcIssue = await txIssue.wait();

  const issued = rcIssue.logs
    .map((l) => {
      try {
        return hub.interface.parseLog(l);
      } catch {
        return null;
      }
    })
    .find((e) => e && e.name === "TumenLeaderAppointmentIssued");

  const docAddr = issued.args.docAddress;
  console.log("Appointment doc:", docAddr);

  // Sign by 10 Myangan leaders
  const TumenLeaderAppointment = await ethers.getContractFactory(
    "TumenLeaderAppointment"
  );
  const doc = TumenLeaderAppointment.attach(docAddr);

  for (let i = 0; i < 10; i++) {
    await (await doc.connect(rest[i]).sign()).wait();
  }

  console.log("SignedCount:", (await doc.signedCount()).toString());

  // Finalize -> applies tumen leader in registry
  await (await doc.finalize()).wait();

  const applied = await registry.tumenLeader(tumenId);
  console.log("Registry tumenLeader:", applied);
  console.log("Expected newLeader:", newLeader);

  if (applied.toLowerCase() !== newLeader.toLowerCase()) {
    throw new Error("Leader not applied");
  }

  console.log("OK: tumen leader appointment applied by document.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
