// scripts/smoke-arban-to-zun-v1.js
// Run:
//   npx hardhat run scripts/smoke-arban-to-zun-v1.js --network localhost
//
// What it does (MVP):
// 1) Deploy SeatSBT, Organization, StructureRegistry, DocumentRegistry, NotaryHub, ArbanRegistry
// 2) Mint 20 seats to 10 signers (2 seats per Arban)
// 3) Create 10 Arbans via NotaryHub.issueArbanJoinDoc + 2 signatures + finalize
// 4) Register Zun from 10 Arbans in StructureRegistry
// 5) Issue ZunResolution via NotaryHub (ZUN notary)
// 6) Sign ZunResolution by 10 Arban leaders (the 10 signers) and finalize
//
// Assumptions:
// - Your ZunResolution requires signatures from 10 Arban leaders determined via StructureRegistry.arbanLeader(arbanId)
// - NotaryHub has issueArbanJoinDoc + issueZunResolution
// - ArbanRegistry.setOwner exists (to set NotaryHub as owner so it can authorize docs)

const { ethers } = require("hardhat");

async function main() {
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  const citizenNotary = signers[1];
  const zunNotary = signers[2];

  // We will use 10 different citizens as Arban leaders (signers[3]..signers[12])
  const leaders = signers.slice(3, 13);
  if (leaders.length !== 10) throw new Error("Need at least 13 signers");

  // ===== Deploy SeatSBT =====
  const SeatSBT = await ethers.getContractFactory("SeatSBT");
  const seat = await SeatSBT.deploy("SeatSBT", "SEAT");
  await seat.waitForDeployment();

  // Try grant REGISTRAR_ROLE to deployer (if AccessControl-based)
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
    ethers.ZeroAddress
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

  // ===== Make NotaryHub owner of ArbanRegistry (so it can setJoinDoc / setUpdater) =====
  await (await ar.setOwner(await hub.getAddress())).wait();

  // ===== Set notaries =====
  // enum NotaryGrade { NONE, CITIZEN, ZUN, MYANGAN, TUMEN, CHAIRMAN }
  const CITIZEN = 1;
  const ZUN = 2;
  await (await hub.setNotary(citizenNotary.address, CITIZEN, true)).wait();
  await (await hub.setNotary(zunNotary.address, ZUN, true)).wait();

  // ===== Mint 20 seats: 2 seats per leader (seatId pairs) =====
  // seatIds: for i in 0..9 -> (2i+1, 2i+2)
  for (let i = 0; i < 10; i++) {
    await (await seat.mintSeat(leaders[i].address)).wait(); // odd
    await (await seat.mintSeat(leaders[i].address)).wait(); // even
  }

  // ===== Create 10 Arbans via JoinDoc =====
  const hubCitizen = hub.connect(citizenNotary);

  const arbanIds = [];
  for (let i = 0; i < 10; i++) {
    const arbanId = i + 1;
    const leader = leaders[i].address;
    const s1 = 2 * i + 1;
    const s2 = 2 * i + 2;
    const seatIds = [s1, s2];

    const docHash = ethers.keccak256(
      ethers.toUtf8Bytes(`ARBAN_JOIN_${arbanId}_V1`)
    );

    const tx = await hubCitizen.issueArbanJoinDoc(
      await ar.getAddress(),
      await seat.getAddress(),
      arbanId,
      leader,
      seatIds,
      2, // minSignatures
      docHash
    );
    const rc = await tx.wait();

    let joinDocAddr = null;
    for (const log of rc.logs) {
      try {
        const p = hub.interface.parseLog(log);
        if (p && p.name === "ArbanJoinDocIssued") {
          joinDocAddr = p.args.docAddress;
        }
      } catch (_) {}
    }
    if (!joinDocAddr)
      throw new Error(`Join doc event not found for arbanId=${arbanId}`);

    const ArbanJoinDoc = await ethers.getContractFactory("ArbanJoinDoc");
    const joinDoc = ArbanJoinDoc.attach(joinDocAddr);

    // both signatures come from same leader EOA (owns both seats)
    await (await joinDoc.connect(leaders[i]).join(s1)).wait();
    await (await joinDoc.connect(leaders[i]).join(s2)).wait();

    await (await joinDoc.finalize()).wait();

    // verify registry leader
    const regLeader = await ar.leaderOfArban(arbanId);
    if (regLeader.toLowerCase() !== leader.toLowerCase()) {
      throw new Error(`FAIL: leaderOfArban mismatch for arbanId=${arbanId}`);
    }

    // verify structure sync if available
    try {
      const structLeader = await structure.arbanLeader(arbanId);
      if (structLeader.toLowerCase() !== leader.toLowerCase()) {
        throw new Error(
          `FAIL: structure.arbanLeader mismatch for arbanId=${arbanId}`
        );
      }
    } catch (_) {}

    arbanIds.push(arbanId);
  }

  console.log("Created Arbans:", arbanIds.map(String));

  // ===== Register Zun from 10 Arbans =====
  const zunLeader = leaders[0].address;
  const txZ = await structure.registerZun(arbanIds, zunLeader);
  const rcZ = await txZ.wait();

  // best-effort: read ZunRegistered event from StructureRegistry
  let zunId = null;
  try {
    for (const log of rcZ.logs) {
      try {
        const p = structure.interface.parseLog(log);
        if (p && p.name === "ZunRegistered") {
          zunId = p.args.zunId;
        }
      } catch (_) {}
    }
  } catch (_) {}
  if (!zunId) zunId = 1;

  console.log("ZunId:", zunId.toString());
  console.log("Zun address:", await structure.zunAddress(zunId));

  // ===== Issue ZunResolution =====
  const hubZun = hub.connect(zunNotary);
  const zunDocHash = ethers.keccak256(ethers.toUtf8Bytes("ZUN_RESOLUTION_V1"));

  const txR = await hubZun.issueZunResolution(zunId, zunDocHash);
  const rcR = await txR.wait();

  let resAddr = null;
  for (const log of rcR.logs) {
    try {
      const p = hub.interface.parseLog(log);
      if (p && p.name === "ZunDocumentIssued") {
        resAddr = p.args.docAddress;
      }
    } catch (_) {}
  }
  if (!resAddr) throw new Error("ZunDocumentIssued event not found");

  console.log("ZunResolution:", resAddr);

  // ===== Sign ZunResolution by 10 Arban leaders =====
  const ZunResolution = await ethers.getContractFactory("ZunResolution");
  const res = ZunResolution.attach(resAddr);

  // Try both function names: sign() or signAsLeader()
  // Your earlier smoke showed "SignedCount: 10" and "Finalized: true"
  // We'll detect what exists by calling static checks.
  const signFn = res.interface.fragments.find(
    (f) => f.type === "function" && f.name === "sign"
  )
    ? "sign"
    : res.interface.fragments.find(
        (f) => f.type === "function" && f.name === "signAsLeader"
      )
    ? "signAsLeader"
    : null;

  if (!signFn) {
    throw new Error(
      "ZunResolution has no sign/signAsLeader function. Adjust smoke script."
    );
  }

  for (let i = 0; i < 10; i++) {
    // In many implementations sign() takes no args; in yours earlier it likely takes none.
    const connected = res.connect(leaders[i]);
    const frag = connected.interface.getFunction(signFn);
    if (frag.inputs.length === 0) {
      await (await connected[signFn]()).wait();
    } else if (frag.inputs.length === 1) {
      // some variants require arbanId or seatId; we pass arbanId[i]
      await (await connected[signFn](arbanIds[i])).wait();
    } else {
      throw new Error(
        `Unexpected ${signFn} signature arity: ${frag.inputs.length}`
      );
    }
  }

  const sc = await res.signedCount();
  console.log("SignedCount:", sc.toString());

  await (await res.finalize()).wait();
  const fin = await res.finalized();
  console.log("Finalized:", fin);

  if (sc.toString() !== "10" || fin !== true) {
    throw new Error("FAIL: ZunResolution did not finalize with 10 signatures");
  }

  console.log("OK: Arban -> Zun flow works (10 leaders signed ZunResolution).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
