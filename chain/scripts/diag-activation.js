const hre = require("hardhat");

async function safe(label, fn) {
  try {
    const v = await fn();
    console.log(label, v);
    return v;
  } catch (e) {
    console.log(label, "n/a");
    return null;
  }
}

async function main() {
  const activationAddr = process.env.ACTIVATION;
  const seatId = Number(process.env.SEAT_ID || "1");
  const citizen = process.env.CITIZEN_ADDR;
  const v2 = process.env.V2_ADDR || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

  if (!activationAddr) throw new Error("Set ACTIVATION env");

  const act = await hre.ethers.getContractAt("ActivationRegistry", activationAddr);

  console.log("== ActivationRegistry ==");
  console.log("address", activationAddr);
  console.log("seatId", seatId);
  console.log("citizen", citizen);
  console.log("v2", v2);

  const seatSbtAddr = await safe("seatSbt()", () => act.seatSbt());
  const courtAddr = await safe("supremeCourt()", () => act.supremeCourt());
  const acceptanceAddr = await safe("acceptance()", () => act.acceptance());

  await safe("threshold()", () => act.threshold());
  await safe("validators[citizen]()", () => act.validators(citizen));
  await safe("validators[v2]()", () => act.validators(v2));

  await safe("requestedAt(seatId)()", () => act.requestedAt(seatId));
  await safe("approvals(seatId)()", () => act.approvals(seatId));
  await safe("localBanned(seatId)()", () => act.localBanned(seatId));

  await safe("statusWithCourt(seatId)()", async () => {
    const r = await act.statusWithCourt(seatId);
    // tuple printing
    return { status: Number(r[0]), frozen: r[1], banned: r[2] };
  });

  await safe("isActive(seatId)()", () => act.isActive(seatId));

  if (seatSbtAddr) {
    const seat = await hre.ethers.getContractAt("SeatSBT", seatSbtAddr);
    await safe("SeatSBT.exists(seatId)()", () => seat.exists(seatId));
    await safe("SeatSBT.ownerOf(seatId)()", () => seat.ownerOf(seatId));
  }

  if (acceptanceAddr) {
    const acc = await hre.ethers.getContractAt("ConstitutionAcceptanceRegistry", acceptanceAddr);
    if (citizen) await safe("Acceptance.hasAccepted(citizen)()", () => acc.hasAccepted(citizen));
    await safe("Acceptance.hasAcceptedSeat(seatId)()", () => acc.hasAcceptedSeat(seatId));
  }

  if (courtAddr) {
    const court = await hre.ethers.getContractAt("SupremeCourt", courtAddr);
    await safe("Court.frozenSeat(seatId)()", () => court.frozenSeat(seatId));
    await safe("Court.bannedSeat(seatId)()", () => court.bannedSeat(seatId));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
