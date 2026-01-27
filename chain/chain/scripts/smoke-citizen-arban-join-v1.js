const hre = require("hardhat");
const { ethers } = hre;

function mustAddr(name, v) {
  if (typeof v !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(v)) {
    throw new Error(
      `Invalid ${name} address: '${v}'. Provide a real 0x... address (42 chars).`
    );
  }
  return v;
}

async function ownerOfSafe(seatSBT, seatId) {
  try {
    return await seatSBT.ownerOf(seatId);
  } catch {
    return null;
  }
}

async function main() {
  const SEAT_SBT = mustAddr("SEAT_SBT", process.env.SEAT_SBT);
  const CITIZEN_REGISTRY = mustAddr(
    "CITIZEN_REGISTRY",
    process.env.CITIZEN_REGISTRY
  );
  const ARBAN_REGISTRY = mustAddr("ARBAN_REGISTRY", process.env.ARBAN_REGISTRY);
  const NOTARY_HUB = mustAddr("NOTARY_HUB", process.env.NOTARY_HUB);

  const signers = await ethers.getSigners();
  const [deployer] = signers;

  // hard guard: ensure contracts exist on this network
  for (const [k, a] of Object.entries({
    SEAT_SBT,
    CITIZEN_REGISTRY,
    ARBAN_REGISTRY,
    NOTARY_HUB,
  })) {
    const code = await ethers.provider.getCode(a);
    if (!code || code === "0x") {
      throw new Error(
        `${k} has no code at ${a} on network=${hre.network.name}. Your addresses are from another chain/run.`
      );
    }
  }

  const seatSBT = await ethers.getContractAt("SeatSBT", SEAT_SBT);
  const citizenRegistry = await ethers.getContractAt(
    "CitizenRegistry",
    CITIZEN_REGISTRY
  );
  const arbanRegistry = await ethers.getContractAt(
    "ArbanRegistry",
    ARBAN_REGISTRY
  );
  const notaryHub = await ethers.getContractAt("NotaryHub", NOTARY_HUB);

  // 0) Ensure seatIds 1..10 exist.
  // SeatSBT has mintSeat(address to). It mints sequential ids, starting from 1.
  for (let id = 1; id <= 10; id++) {
    let owner = await ownerOfSafe(seatSBT, id);
    while (!owner) {
      const to = signers[id % signers.length].address;
      const tx = await seatSBT.connect(deployer).mintSeat(to);
      await tx.wait();
      owner = await ownerOfSafe(seatSBT, id);
    }
  }

  const seatIds = Array.from({ length: 10 }, (_, i) => i + 1);
  console.log("seatIds:", seatIds);

  // 1) Create CitizenAccounts
  for (const seatId of seatIds) {
    const owner = await seatSBT.ownerOf(seatId);
    const signer =
      signers.find((s) => s.address.toLowerCase() === owner.toLowerCase()) ||
      deployer;

    const existing = await citizenRegistry.citizenOfSeat(seatId);
    if (existing && existing !== ethers.ZeroAddress) continue;

    const tx = await citizenRegistry
      .connect(signer)
      .createCitizen(seatId, owner);
    await tx.wait();
  }

  // 2) leader = citizen of seatIds[0]
  const arbanId = 1;
  const minSignatures = 2;
  const leaderSeatId = seatIds[0];
  const leaderCitizen = await citizenRegistry.citizenOfSeat(leaderSeatId);
  if (!leaderCitizen || leaderCitizen === ethers.ZeroAddress) {
    throw new Error("Leader citizen account not created");
  }

  // 3) Issue ArbanJoinDoc
  const docHash = ethers.keccak256(ethers.toUtf8Bytes("ARBAN_JOIN_DOC:v1"));
  const issueTx = await notaryHub
    .connect(deployer)
    .issueArbanJoinDoc(
      ARBAN_REGISTRY,
      SEAT_SBT,
      arbanId,
      leaderCitizen,
      seatIds,
      minSignatures,
      docHash
    );
  const issueRc = await issueTx.wait();

  const evt = issueRc.logs
    .map((l) => {
      try {
        return notaryHub.interface.parseLog(l);
      } catch {
        return null;
      }
    })
    .find((e) => e && e.name === "ArbanJoinDocIssued");

  if (!evt) throw new Error("ArbanJoinDocIssued event not found");
  const docAddress = evt.args.docAddress;
  console.log("ArbanJoinDoc:", docAddress);

  const doc = await ethers.getContractAt("ArbanJoinDoc", docAddress);

  // 4) Join via SeatAccount.execute
  for (const seatId of seatIds.slice(0, minSignatures)) {
    const citizenAcc = await citizenRegistry.citizenOfSeat(seatId);
    if (!citizenAcc || citizenAcc === ethers.ZeroAddress)
      throw new Error(`No citizen for seatId=${seatId}`);

    const owner = await seatSBT.ownerOf(seatId);
    const signer =
      signers.find((s) => s.address.toLowerCase() === owner.toLowerCase()) ||
      deployer;

    const joinCalldata = doc.interface.encodeFunctionData("join", [seatId]);
    const citizen = await ethers.getContractAt("SeatAccount", citizenAcc);
    const tx = await citizen
      .connect(signer)
      .execute(docAddress, 0, joinCalldata);
    await tx.wait();
    console.log("Joined seatId", seatId, "via", citizenAcc);
  }

  // 5) finalize
  const finTx = await doc.connect(deployer).finalize();
  await finTx.wait();
  console.log("Finalized");

  const leaderOnChain = await arbanRegistry.leaderOfArban(arbanId);
  console.log("leaderOfArban:", leaderOnChain);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
