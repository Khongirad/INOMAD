const hre = require("hardhat");
const fs = require("fs");

function load(path) {
  try { return JSON.parse(fs.readFileSync(path, "utf8")); } catch { return {}; }
}
function save(path, obj) {
  fs.writeFileSync(path, JSON.stringify(obj, null, 2));
}
async function mustHaveCode(addr, label) {
  const code = await hre.ethers.provider.getCode(addr);
  const size = (code.length - 2) / 2;
  if (size === 0) throw new Error(`${label} codeSize=0 at ${addr}`);
  return size;
}
async function deploy(name, args = []) {
  const F = await hre.ethers.getContractFactory(name);
  const c = await F.deploy(...args);
  await c.waitForDeployment();
  const addr = await c.getAddress();
  await mustHaveCode(addr, name);
  return { c, addr };
}

async function main() {
  const outPath = "addresses.json";
  const addrs = load(outPath);

  if (!addrs.CONSTITUTION_HASH) addrs.CONSTITUTION_HASH = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("constitution:v1"));
  if (!addrs.VERSION_HASH) addrs.VERSION_HASH = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("version:v1"));

  const ch = addrs.CONSTITUTION_HASH;
  const vh = addrs.VERSION_HASH;

  const { addr: acceptanceAddr } = await deploy("ConstitutionAcceptanceRegistry", [ch, vh]);
  console.log("ConstitutionAcceptanceRegistry:", acceptanceAddr);

  const { addr: citizenAddr } = await deploy("CitizenRegistry", [acceptanceAddr]);
  console.log("CitizenRegistry:", citizenAddr);

  const { addr: seatAddr } = await deploy("SeatSBT", [citizenAddr]);
  console.log("SeatSBT:", seatAddr);

  // wire seat into citizen registry (optional)
  try {
    const citizen = await hre.ethers.getContractAt("CitizenRegistry", citizenAddr);
    const tx = await citizen.setSeatSBT(seatAddr);
    await tx.wait();
    console.log("CitizenRegistry.setSeatSBT ok");
  } catch {
    console.log("CitizenRegistry.setSeatSBT skipped");
  }

  // SupremeCourt: try (seatAddr) then fallback to no-args
  let courtAddr, court;
  try {
    ({ c: court, addr: courtAddr } = await deploy("SupremeCourt", [seatAddr]));
    console.log("SupremeCourt (ctor seat):", courtAddr);
  } catch (e) {
    ({ c: court, addr: courtAddr } = await deploy("SupremeCourt", []));
    console.log("SupremeCourt (no-args):", courtAddr);

    // optional wiring if setter exists
    try {
      const tx = await court.setSeatSBT(seatAddr);
      await tx.wait();
      console.log("SupremeCourt.setSeatSBT ok");
    } catch {
      // ignore
    }
  }

  const { addr: activationAddr } = await deploy("ActivationRegistry", [seatAddr, courtAddr, acceptanceAddr]);
  console.log("ActivationRegistry:", activationAddr);

  addrs.ConstitutionAcceptanceRegistry = acceptanceAddr;
  addrs.CitizenRegistry = citizenAddr;
  addrs.SeatSBT = seatAddr;
  addrs.SupremeCourt = courtAddr;
  addrs.ActivationRegistry = activationAddr;

  save(outPath, addrs);
  console.log("Saved to addresses.json");
}

main().catch((e) => { console.error(e); process.exit(1); });
