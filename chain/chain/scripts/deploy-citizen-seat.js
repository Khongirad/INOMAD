const hre = require("hardhat");
const fs = require("fs");

function load(path) {
  try { return JSON.parse(fs.readFileSync(path, "utf8")); } catch { return {}; }
}
function save(path, obj) {
  fs.writeFileSync(path, JSON.stringify(obj, null, 2));
}

async function main() {
  const outPath = "addresses.json";
  const addrs = load(outPath);

  const acceptance = process.env.ACCEPTANCE;
  if (!acceptance) throw new Error("Set ACCEPTANCE env var");

  // 1) Deploy CitizenRegistry(acceptance)
  const CitizenRegistry = await hre.ethers.getContractFactory("CitizenRegistry");
  const citizen = await CitizenRegistry.deploy(acceptance);
  await citizen.waitForDeployment();
  const citizenAddr = await citizen.getAddress();
  console.log("CitizenRegistry:", citizenAddr);

  // 2) Deploy SeatSBT(issuer = CitizenRegistry)
  const SeatSBT = await hre.ethers.getContractFactory("SeatSBT");
  const seat = await SeatSBT.deploy(citizenAddr);
  await seat.waitForDeployment();
  const seatAddr = await seat.getAddress();
  console.log("SeatSBT:", seatAddr);

  // 3) Wire CitizenRegistry -> SeatSBT (у вас setSeatSBT должен быть)
  if (typeof citizen.setSeatSBT === "function") {
    const tx = await citizen.setSeatSBT(seatAddr);
    await tx.wait();
    console.log("CitizenRegistry.setSeatSBT done");
  } else {
    console.log("CitizenRegistry has no setSeatSBT(address) — skip wiring");
  }

  // Save
  addrs.CitizenRegistry = citizenAddr;
  addrs.SeatSBT = seatAddr;
  save(outPath, addrs);
  console.log("Saved to", outPath);

  // Check issuer
  if (typeof seat.issuer === "function") {
    console.log("SeatSBT.issuer():", await seat.issuer());
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
