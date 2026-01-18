const fs = require("fs");
const path = require("path");

function loadJSON(p) { return JSON.parse(fs.readFileSync(p, "utf8")); }
function saveJSON(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 2)); }

async function main() {
  const addressesPath = path.join(__dirname, "..", "addresses.json");
  const addrs = loadJSON(addressesPath);

  const Factory = await ethers.getContractFactory("SeatSBT");
  const c = await Factory.deploy();
  await c.waitForDeployment();
  const addr = await c.getAddress();

  console.log("SeatSBT:", addr);
  addrs.SeatSBT = addr;
  saveJSON(addressesPath, addrs);
  console.log("addresses.json updated");
}

main().catch((e) => { console.error(e); process.exit(1); });
