// scripts/smoke-citizen-sign-joindoc-v1.js
// Run:
//   npx hardhat run scripts/smoke-citizen-sign-joindoc-v1.js --network localhost

const { ethers } = require("hardhat");

async function main() {
  const [deployer, citizenNotary, user] = await ethers.getSigners();

  // ===== Deploy SeatSBT =====
  const SeatSBT = await ethers.getContractFactory("SeatSBT");
  const seat = await SeatSBT.deploy("SeatSBT", "SEAT");
  await seat.waitForDeployment();

  // grant REGISTRAR_ROLE to deployer if applicable
  const REGISTRAR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REGISTRAR_ROLE"));
  try {
    await (await seat.grantRole(REGISTRAR_ROLE, deployer.address)).wait();
  } catch (_) {}

  // ===== Mint 2 seats to user =====
  await (await seat.mintSeat(user.address)).wait(); // seatId 1
  await (await seat.mintSeat(user.address)).wait(); // seatId 2

  // ===== Deploy CitizenRegistry =====
  const CitizenRegistry = await ethers.getContractFactory("CitizenRegistry");
  const citizens = await CitizenRegistry.deploy(await seat.getAddress());
  await citizens.waitForDeployment();

  // ===== Create CitizenAccounts for both seats (same controller user EOA) =====
  const citizensAsUser = citizens.connect(user);
  const txC1 = await citizensAsUser.createCitizen(1, user.address);
  const rcC1 = await txC1.wait();
  const citizen1 = await citizens.citizenOfSeat(1);

  const txC2 = await citizensAsUser.createCitizen(2, user.address);
  await txC2.wait();
  const citizen2 = await citizens.citizenOfSeat(2);

  console.log("SeatSBT:", await seat.getAddress());
  console.log("CitizenRegistry:", await citizens.getAddress());
  console.log("Citizen(1):", citizen1);
  console.log("Citizen(2):", citizen2);

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

  // NotaryHub must own ArbanRegistry to authorize join docs
  await (await ar.setOwner(await hub.getAddress())).wait();

  // set CITIZEN notary
  const CITIZEN = 1;
  await (await hub.setNotary(citizenNotary.address, CITIZEN, true)).wait();

  console.log("Organization:", await org.getAddress());
  console.log("StructureRegistry:", await structure.getAddress());
  console.log("DocumentRegistry:", await docReg.getAddress());
  console.log("NotaryHub:", await hub.getAddress());
  console.log("ArbanRegistry:", await ar.getAddress());

  // ===== Issue ArbanJoinDoc =====
  const hubAsNotary = hub.connect(citizenNotary);

  const arbanId = 1;
  const leader = citizen1; // IMPORTANT: leader is CitizenAccount
  const seatIds = [1, 2];
  const minSignatures = 2;
  const docHash = ethers.keccak256(
    ethers.toUtf8Bytes("ARBAN_JOIN_BY_CITIZEN_V1")
  );

  const tx = await hubAsNotary.issueArbanJoinDoc(
    await ar.getAddress(),
    await seat.getAddress(),
    arbanId,
    leader,
    seatIds,
    minSignatures,
    docHash
  );
  const rc = await tx.wait();

  let joinDocAddr = null;
  for (const log of rc.logs) {
    try {
      const p = hub.interface.parseLog(log);
      if (p && p.name === "ArbanJoinDocIssued") joinDocAddr = p.args.docAddress;
    } catch (_) {}
  }
  if (!joinDocAddr) throw new Error("Join doc event not found");

  console.log("JoinDoc:", joinDocAddr);

  // ===== Sign joinDoc via CitizenAccount.execute(...) =====
  const ArbanJoinDoc = await ethers.getContractFactory("ArbanJoinDoc");
  const joinDoc = ArbanJoinDoc.attach(joinDocAddr);

  const SeatAccount = await ethers.getContractFactory("SeatAccount");
  const citizenAcc1 = SeatAccount.attach(citizen1);
  const citizenAcc2 = SeatAccount.attach(citizen2);

  // encode join(seatId)
  const calldata1 = joinDoc.interface.encodeFunctionData("join", [1]);
  const calldata2 = joinDoc.interface.encodeFunctionData("join", [2]);

  // user controls both accounts (controller=user)
  await (
    await citizenAcc1.connect(user).execute(joinDocAddr, 0, calldata1)
  ).wait();
  await (
    await citizenAcc2.connect(user).execute(joinDocAddr, 0, calldata2)
  ).wait();

  console.log("signedCount:", (await joinDoc.signedCount()).toString());

  await (await joinDoc.finalize()).wait();
  console.log("finalized:", await joinDoc.finalized());

  // ===== Verify Arban created =====
  const arbanAddr = await ar.arbanAddress(arbanId);
  console.log("Arban:", arbanAddr);

  const regLeader = await ar.leaderOfArban(arbanId);
  console.log("ArbanRegistry leader:", regLeader);

  if (regLeader.toLowerCase() !== leader.toLowerCase()) {
    throw new Error("FAIL: leader is not CitizenAccount");
  }

  // verify structure sync if available
  try {
    const structLeader = await structure.arbanLeader(arbanId);
    console.log("StructureRegistry arbanLeader:", structLeader);
  } catch (_) {}

  console.log("OK: CitizenAccount executed doc.join() and finalized.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
