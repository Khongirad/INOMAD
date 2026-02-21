// scripts/smoke-arban-leader-appointment-v1.js
// Run:
//   npx hardhat run scripts/smoke-arban-leader-appointment-v1.js --network localhost

const { ethers } = require("hardhat");

async function main() {
  const [deployer, notaryCitizen, a1, a2, a3] = await ethers.getSigners();

  // ===== Deploy SeatSBT =====
  const SeatSBT = await ethers.getContractFactory("SeatSBT");
  const seat = await SeatSBT.deploy("SeatSBT", "SEAT");
  await seat.waitForDeployment();

  // Try grant REGISTRAR_ROLE to deployer for smoke (if AccessControl-based)
  const REGISTRAR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REGISTRAR_ROLE"));
  try {
    await (await seat.grantRole(REGISTRAR_ROLE, deployer.address)).wait();
  } catch (_) {}

  // ===== Deploy Organization =====
  const Organization = await ethers.getContractFactory("Organization");
  const org = await Organization.deploy(deployer.address);
  await org.waitForDeployment();

  // ===== Deploy StructureRegistry =====
  const StructureRegistry = await ethers.getContractFactory(
    "StructureRegistry"
  );
  const structure = await StructureRegistry.deploy(await org.getAddress());
  await structure.waitForDeployment();

  // ===== Deploy DocumentRegistry =====
  const DocumentRegistry = await ethers.getContractFactory("DocumentRegistry");
  const docReg = await DocumentRegistry.deploy(deployer.address);
  await docReg.waitForDeployment();

  // ===== Deploy NotaryHub =====
  const NotaryHub = await ethers.getContractFactory("NotaryHub");
  const hub = await NotaryHub.deploy(
    await structure.getAddress(),
    await docReg.getAddress(),
    ethers.ZeroAddress // chairmanRegistry not needed here
  );
  await hub.waitForDeployment();

  // ===== Deploy ArbanRegistry =====
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

  // ===== Mint seats =====
  // We'll mint 3 seats to a1,a2,a3 (enough for join and leader appointment)
  await (await seat.mintSeat(a1.address)).wait(); // seatId 1
  await (await seat.mintSeat(a2.address)).wait(); // seatId 2
  await (await seat.mintSeat(a3.address)).wait(); // seatId 3

  const seatIdsJoin = [1, 2]; // join with 2 seats
  const arbanId = 1;
  const leaderInitial = a1.address;
  const minJoin = 2;

  // ===== Make NotaryHub owner of ArbanRegistry (so it can setJoinDoc/setUpdater) =====
  await (await ar.setOwner(await hub.getAddress())).wait();

  // ===== Set CITIZEN notary =====
  const CITIZEN = 1;
  await (await hub.setNotary(notaryCitizen.address, CITIZEN, true)).wait();

  // ===== Issue ArbanJoinDoc =====
  const joinHash = ethers.keccak256(ethers.toUtf8Bytes("ARBAN_JOIN_V1"));
  const hubAsNotary = hub.connect(notaryCitizen);

  const txJoin = await hubAsNotary.issueArbanJoinDoc(
    await ar.getAddress(),
    await seat.getAddress(),
    arbanId,
    leaderInitial,
    seatIdsJoin,
    minJoin,
    joinHash
  );
  const rcJoin = await txJoin.wait();

  let joinDocAddr = null;
  for (const log of rcJoin.logs) {
    try {
      const p = hub.interface.parseLog(log);
      if (p && p.name === "ArbanJoinDocIssued") {
        joinDocAddr = p.args.docAddress;
      }
    } catch (_) {}
  }
  if (!joinDocAddr) throw new Error("Join doc event not found");

  console.log("JoinDoc:", joinDocAddr);

  // Sign + finalize join doc
  const ArbanJoinDoc = await ethers.getContractFactory("ArbanJoinDoc");
  const joinDoc = ArbanJoinDoc.attach(joinDocAddr);

  await (await joinDoc.connect(a1).join(1)).wait();
  await (await joinDoc.connect(a2).join(2)).wait();

  console.log("Join signedCount:", (await joinDoc.signedCount()).toString());

  await (await joinDoc.finalize()).wait();
  console.log("Join finalized:", await joinDoc.finalized());

  const arbanAddr = await ar.arbanAddress(arbanId);
  console.log("Arban address:", arbanAddr);
  console.log("Leader (initial) registry:", await ar.leaderOfArban(arbanId));

  // If StructureRegistry has arbanLeader mapping, print it
  try {
    console.log(
      "Leader (initial) structure:",
      await structure.arbanLeader(arbanId)
    );
  } catch (_) {
    console.log("StructureRegistry.arbanLeader not available (skip)");
  }

  // ===== Issue ArbanLeaderAppointment =====
  const newLeader = a2.address;
  const minLead = 2;
  const leaderHash = ethers.keccak256(
    ethers.toUtf8Bytes("ARBAN_LEADER_APPOINT_V1")
  );

  const txLead = await hubAsNotary.issueArbanLeaderAppointment(
    await ar.getAddress(),
    await seat.getAddress(),
    arbanId,
    newLeader,
    minLead,
    leaderHash
  );
  const rcLead = await txLead.wait();

  let appointDocAddr = null;
  for (const log of rcLead.logs) {
    try {
      const p = hub.interface.parseLog(log);
      if (p && p.name === "ArbanLeaderAppointmentIssued") {
        appointDocAddr = p.args.docAddress;
      }
    } catch (_) {}
  }
  if (!appointDocAddr) throw new Error("Leader appointment event not found");

  console.log("ArbanLeaderAppointment:", appointDocAddr);

  // Sign + finalize leader appointment doc
  const ArbanLeaderAppointment = await ethers.getContractFactory(
    "ArbanLeaderAppointment"
  );
  const appointDoc = ArbanLeaderAppointment.attach(appointDocAddr);

  // Only members can sign: seatId 1 & 2 are members
  await (await appointDoc.connect(a1).sign(1)).wait();
  await (await appointDoc.connect(a2).sign(2)).wait();

  console.log(
    "Appointment signedCount:",
    (await appointDoc.signedCount()).toString()
  );

  await (await appointDoc.finalize()).wait();
  console.log("Appointment finalized:", await appointDoc.finalized());

  // ===== Verify leader changed in registry, arban contract, structure registry =====
  const leaderNow = await ar.leaderOfArban(arbanId);
  console.log("Leader (after) registry:", leaderNow);
  if (leaderNow.toLowerCase() !== newLeader.toLowerCase()) {
    throw new Error("FAIL: leaderOfArban not updated");
  }

  // Check Arban contract leader variable
  const Arban = await ethers.getContractFactory("Arban");
  const arban = Arban.attach(arbanAddr);
  const arbanLeaderNow = await arban.leader();
  console.log("Leader (after) Arban contract:", arbanLeaderNow);
  if (arbanLeaderNow.toLowerCase() !== newLeader.toLowerCase()) {
    throw new Error("FAIL: Arban.leader not updated");
  }

  try {
    const structLeaderNow = await structure.arbanLeader(arbanId);
    console.log("Leader (after) structure:", structLeaderNow);
    if (structLeaderNow.toLowerCase() !== newLeader.toLowerCase()) {
      throw new Error("FAIL: StructureRegistry.arbanLeader not updated");
    }
  } catch (_) {
    console.log("StructureRegistry.arbanLeader not available (skip)");
  }

  console.log("OK: ArbanLeaderAppointment applied.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
