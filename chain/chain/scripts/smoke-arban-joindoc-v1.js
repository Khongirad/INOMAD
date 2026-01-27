// scripts/smoke-arban-joindoc-v1.js
// npx hardhat run scripts/smoke-arban-joindoc-v1.js --network localhost

const { ethers } = require("hardhat");

async function main() {
  const [deployer, notaryCitizen, u1, u2, u3, u4, u5, u6, u7, u8, u9] =
    await ethers.getSigners();

  // ===== Deploy core =====
  const SeatSBT = await ethers.getContractFactory("SeatSBT");
  const seat = await SeatSBT.deploy("SeatSBT", "SEAT");
  await seat.waitForDeployment();

  const Organization = await ethers.getContractFactory("Organization");
  const org = await Organization.deploy(deployer.address);
  await org.waitForDeployment();

  const StructureRegistry = await ethers.getContractFactory(
    "StructureRegistry"
  );
  const structure = await StructureRegistry.deploy(await org.getAddress());
  await structure.waitForDeployment();

  const DocumentRegistry = await ethers.getContractFactory("DocumentRegistry");
  const docReg = await DocumentRegistry.deploy(deployer.address);
  await docReg.waitForDeployment();

  // Chairman registry can be dummy for this smoke
  const dummyChairmanRegistry = ethers.ZeroAddress;

  const NotaryHub = await ethers.getContractFactory("NotaryHub");
  const hub = await NotaryHub.deploy(
    await structure.getAddress(),
    await docReg.getAddress(),
    dummyChairmanRegistry
  );
  await hub.waitForDeployment();

  const ArbanRegistry = await ethers.getContractFactory("ArbanRegistry");
  const ar = await ArbanRegistry.deploy(
    await org.getAddress(),
    await seat.getAddress(),
    await structure.getAddress()
  );
  await ar.waitForDeployment();

  console.log("SeatSBT:", await seat.getAddress());
  console.log("Organization:", await org.getAddress());
  console.log("StructureRegistry:", await structure.getAddress());
  console.log("DocumentRegistry:", await docReg.getAddress());
  console.log("NotaryHub:", await hub.getAddress());
  console.log("ArbanRegistry:", await ar.getAddress());

  // ===== Roles for mint (SeatSBT) =====
  // If SeatSBT restricts mintSeat by REGISTRAR_ROLE, grant it to deployer for smoke
  const REGISTRAR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REGISTRAR_ROLE"));
  try {
    await (await seat.grantRole(REGISTRAR_ROLE, deployer.address)).wait();
  } catch (e) {
    // If SeatSBT doesn't use AccessControl, ignore
  }

  // ===== Mint 10 seats to 10 users =====
  const users = [u1, u2, u3, u4, u5, u6, u7, u8, u9, deployer]; // 10th can be deployer
  for (let i = 0; i < 10; i++) {
    await (await seat.mintSeat(users[i].address)).wait();
  }
  const seatIds = Array.from({ length: 10 }, (_, i) => i + 1);

  // Leader = u1 (seatId 1 owner)
  const leader = u1.address;

  // ===== Make NotaryHub owner of ArbanRegistry (so it can setJoinDoc) =====
  await (await ar.setOwner(await hub.getAddress())).wait();
  console.log("ArbanRegistry.owner -> NotaryHub");

  // ===== Set CITIZEN notary =====
  // enum NotaryGrade { NONE, CITIZEN, ZUN, MYANGAN, TUMEN, CHAIRMAN }
  const CITIZEN = 1;
  await (await hub.setNotary(notaryCitizen.address, CITIZEN, true)).wait();
  console.log("Citizen notary set:", notaryCitizen.address);

  // ===== Issue ArbanJoinDoc via NotaryHub =====
  const arbanId = 1;
  const minSignatures = 2;

  // docHash: just a demo hash (in real flow hash over JSON/protobuf)
  const docHash = ethers.keccak256(ethers.toUtf8Bytes("ARBAJN_DOC_V1"));

  const hubAsNotary = hub.connect(notaryCitizen);

  const tx = await hubAsNotary.issueArbanJoinDoc(
    await ar.getAddress(),
    await seat.getAddress(),
    arbanId,
    leader,
    seatIds,
    minSignatures,
    docHash
  );
  const receipt = await tx.wait();

  // Parse event ArbanJoinDocIssued
  const iface = hub.interface;
  let docAddress = null;
  let docId = null;

  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed && parsed.name === "ArbanJoinDocIssued") {
        docId = parsed.args.docId;
        docAddress = parsed.args.docAddress;
      }
    } catch {}
  }

  if (!docAddress) throw new Error("ArbanJoinDocIssued not found in logs");

  console.log("ArbanJoinDocIssued docId:", docId.toString());
  console.log("JoinDoc address:", docAddress);

  // ===== Join signatures: seatId 1 and seatId 2 =====
  const ArbanJoinDoc = await ethers.getContractFactory("ArbanJoinDoc");
  const doc = ArbanJoinDoc.attach(docAddress);

  await (await doc.connect(u1).join(1)).wait();
  await (await doc.connect(u2).join(2)).wait();

  console.log("SignedCount:", (await doc.signedCount()).toString());

  // ===== Finalize =====
  await (await doc.finalize()).wait();
  console.log("Finalized:", await doc.finalized());

  // ===== Verify Arban was created in registry =====
  const arbanAddr = await ar.arbanAddress(arbanId);
  console.log("Arban address:", arbanAddr);

  const leaderStored = await ar.leaderOfArban(arbanId);
  console.log("Registry leaderOfArban:", leaderStored);

  // Should also be synced to StructureRegistry arbanLeader if your StructureRegistry has it
  // If your StructureRegistry name differs, adapt.
  try {
    const structLeader = await structure.arbanLeader(arbanId);
    console.log("StructureRegistry arbanLeader:", structLeader);
  } catch (e) {
    console.log("StructureRegistry arbanLeader not found (skip).");
  }

  // Check membership seatId -> arbanId
  const a1 = await ar.arbanOfSeat(1);
  const a2 = await ar.arbanOfSeat(2);
  console.log(
    "arbanOfSeat(1):",
    a1.toString(),
    "arbanOfSeat(2):",
    a2.toString()
  );

  if (a1.toString() !== "1" || a2.toString() !== "1") {
    throw new Error("FAIL: seat membership not assigned correctly");
  }

  console.log("OK: ArbanJoinDoc flow works.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
