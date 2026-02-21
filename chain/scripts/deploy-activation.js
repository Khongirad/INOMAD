const hre = require("hardhat");
const fs = require("fs");

function load(path) { try { return JSON.parse(fs.readFileSync(path, "utf8")); } catch { return {}; } }
function save(path, obj) { fs.writeFileSync(path, JSON.stringify(obj, null, 2)); }

async function main() {
  const outPath = "addresses.json";
  const addrs = load(outPath);

  const seat = addrs.SeatSBT;
  const acceptance = addrs.ConstitutionAcceptanceRegistry;
  if (!seat) throw new Error("SeatSBT missing in addresses.json");
  if (!acceptance) throw new Error("ConstitutionAcceptanceRegistry missing in addresses.json");

  // 1) Deploy SupremeCourt (if not already)
  let courtAddr = addrs.SupremeCourt;
  if (!courtAddr) {
    const Court = await hre.ethers.getContractFactory("SupremeCourt");
    const court = await Court.deploy();
    await court.waitForDeployment();
    courtAddr = await court.getAddress();
    console.log("SupremeCourt:", courtAddr);
    addrs.SupremeCourt = courtAddr;
  } else {
    console.log("SupremeCourt (existing):", courtAddr);
  }

  // 2) Deploy ActivationRegistry(seat, court, acceptance)
  const Activation = await hre.ethers.getContractFactory("ActivationRegistry");
  const act = await Activation.deploy(seat, courtAddr, acceptance);
  await act.waitForDeployment();
  const actAddr = await act.getAddress();
  console.log("ActivationRegistry:", actAddr);

  addrs.ActivationRegistry = actAddr;
  save(outPath, addrs);
  console.log("Saved to", outPath);
}

main().catch((e) => { console.error(e); process.exit(1); });
