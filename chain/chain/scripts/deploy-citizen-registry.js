const fs = require("fs");
const path = require("path");

function loadJSON(p) { return JSON.parse(fs.readFileSync(p, "utf8")); }
function saveJSON(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 2)); }

async function main() {
  const addressesPath = path.join(__dirname, "..", "addresses.json");
  const addrs = loadJSON(addressesPath);

  const acceptance = addrs.ConstitutionAcceptanceRegistry;
  if (!acceptance) throw new Error("ConstitutionAcceptanceRegistry missing in addresses.json");

  const Factory = await ethers.getContractFactory("CitizenRegistry");
  const reg = await Factory.deploy(acceptance);

  await reg.waitForDeployment();
  const addr = await reg.getAddress();

  console.log("CitizenRegistry:", addr);
  addrs.CitizenRegistry = addr;
  saveJSON(addressesPath, addrs);
  console.log("addresses.json updated");
}

main().catch((e) => { console.error(e); process.exit(1); });
