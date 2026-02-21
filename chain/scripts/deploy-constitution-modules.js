const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

function loadAddresses(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    return {};
  }
}

function saveAddresses(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("deployer:", deployer.address);

  const outPath = path.join(__dirname, "..", "addresses.json");
  const addresses = loadAddresses(outPath);

  const Factory = await hre.ethers.getContractFactory("ConstitutionModuleRegistry");
  const reg = await Factory.deploy();
  await reg.waitForDeployment();

  const addr = await reg.getAddress();
  console.log("ConstitutionModuleRegistry:", addr);

  addresses.ConstitutionModuleRegistry = addr;
  saveAddresses(outPath, addresses);
  console.log("Saved to addresses.json");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
