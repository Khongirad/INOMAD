const fs = require("fs");
const path = require("path");

function loadJSON(p) { return JSON.parse(fs.readFileSync(p, "utf8")); }
function saveJSON(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 2)); }

async function main() {
  const addressesPath = path.join(__dirname, "..", "addresses.json");
  const addrs = loadJSON(addressesPath);

  const seatSbt = addrs.SeatSBT;
  if (!seatSbt) throw new Error("SeatSBT missing");

  const Factory = await ethers.getContractFactory("AltanWalletRegistry");
  const reg = await Factory.deploy(seatSbt);
  await reg.waitForDeployment();
  const addr = await reg.getAddress();

  console.log("AltanWalletRegistry:", addr);
  addrs.AltanWalletRegistry = addr;
  saveJSON(addressesPath, addrs);
  console.log("addresses.json updated");
}

main().catch((e) => { console.error(e); process.exit(1); });
