const fs = require("fs");
const path = require("path");

function loadJSON(p) { return JSON.parse(fs.readFileSync(p, "utf8")); }
function saveJSON(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 2)); }

async function main() {
  const addressesPath = path.join(__dirname, "..", "addresses.json");
  const addrs = loadJSON(addressesPath);

  const ch = addrs.CONSTITUTION_HASH;
  const vh = addrs.VERSION_HASH;
  if (!ch || !vh) throw new Error("CONSTITUTION_HASH / VERSION_HASH missing in addresses.json");

  const Factory = await ethers.getContractFactory("ConstitutionAcceptanceRegistry");
  const c = await Factory.deploy(ch, vh);

  await c.waitForDeployment();
  const addr = await c.getAddress();

  console.log("ConstitutionAcceptanceRegistry:", addr);
  addrs.ConstitutionAcceptanceRegistry = addr;
  saveJSON(addressesPath, addrs);
  console.log("addresses.json updated");
}

main().catch((e) => { console.error(e); process.exit(1); });
