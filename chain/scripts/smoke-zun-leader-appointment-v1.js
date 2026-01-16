// npx hardhat run scripts/smoke-zun-leader-appointment-v1.js --network localhost
const { ethers } = require("hardhat");

async function main() {
  const signers = await ethers.getSigners();
  const [deployer, notaryZun, ...rest] = signers;

  // 1) Deploy StructureRegistry
  const StructureRegistry = await ethers.getContractFactory(
    "StructureRegistry"
  );
  const registry = await StructureRegistry.deploy(ethers.ZeroAddress);
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log("StructureRegistry:", registryAddr);

  // 2) Create Zun from 10 Arbans
  const arbanIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const tx = await registry.registerZun(arbanIds, deployer.address);
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
  const zunId = Number(evt.args.zunId);
  console.log("ZunId:", zunId);

  // 3) Set 10 Arban leaders (voters)
  for (let i = 0; i < 10; i++) {
    await (await registry.setArbanLeader(arbanIds[i], rest[i].address)).wait();
  }
  console.log("Assigned 10 Arban leaders.");

  // 4) Deploy DocumentRegistry
  const DocumentRegistry = await ethers.getContractFactory("DocumentRegistry");
  const docReg = await DocumentRegistry.deploy();
  await docReg.waitForDeployment();

  // 5) Deploy NotaryHub (chairmanRegistry can be zero for this smoke)
  const NotaryHub = await ethers.getContractFactory("NotaryHub");
  const hub = await NotaryHub.deploy(
    registryAddr,
    await docReg.getAddress(),
    ethers.ZeroAddress
  );
  await hub.waitForDeployment();

  // docReg owner -> hub
  await (await docReg.setOwner(await hub.getAddress())).wait();

  // 6) Set ZUN notary
  await (await hub.setNotary(notaryZun.address, 2 /*ZUN*/, true)).wait();

  // 7) IMPORTANT: authorize updater in StructureRegistry (the appointment doc must be allowed)
  // We don't know doc address yet; simplest MVP: authorize NotaryHub itself OR authorize doc address post-issue.
  // Our appointment calls registry.applyZunLeader from inside the doc, so we must authorize the DOC address.
  // => issue doc first, then setUpdater(docAddr, true), then finalize.
  const newLeader = rest[20].address;
  const docHash = ethers.keccak256(
    ethers.toUtf8Bytes("ZUN:leader:appointment:v1")
  );

  const txIssue = await hub
    .connect(notaryZun)
    .issueZunLeaderAppointment(zunId, newLeader, docHash);
  const rcIssue = await txIssue.wait();

  const issued = rcIssue.logs
    .map((l) => {
      try {
        return hub.interface.parseLog(l);
      } catch {
        return null;
      }
    })
    .find((e) => e && e.name === "ZunLeaderAppointmentIssued");

  const docId = issued.args.docId;
  const docAddr = issued.args.docAddress;

  console.log("Appointment docId:", docId.toString());
  console.log("Appointment doc:", docAddr);

  // 8) Authorize the appointment doc as updater
  await (await registry.setUpdater(docAddr, true)).wait();
  console.log("Updater authorized:", docAddr);

  // 9) Leaders sign
  const ZunLeaderAppointment = await ethers.getContractFactory(
    "ZunLeaderAppointment"
  );
  const doc = ZunLeaderAppointment.attach(docAddr);

  for (let i = 0; i < 10; i++) {
    await (await doc.connect(rest[i]).sign()).wait();
  }
  console.log("SignedCount:", (await doc.signedCount()).toString());

  // 10) Finalize -> applies registry.applyZunLeader()
  await (await doc.finalize()).wait();

  const applied = await registry.zunLeader(zunId);
  console.log("Registry zunLeader:", applied);
  console.log("Expected newLeader:", newLeader);

  if (applied.toLowerCase() !== newLeader.toLowerCase()) {
    throw new Error("Leader not applied");
  }
  console.log("OK: leader appointment applied by document.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
