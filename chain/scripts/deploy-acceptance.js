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

  // bytes32 inputs
  let constitutionHash = process.env.CONSTITUTION_HASH;
  let versionHash = process.env.VERSION_HASH;

  // Provide sane defaults if not set:
  // constitutionHash: keccak256("ALTAN_CONSTITUTION")
  // versionHash:      keccak256("v1")
  if (!constitutionHash) {
    constitutionHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("ALTAN_CONSTITUTION"));
    console.log("CONSTITUTION_HASH not set, using:", constitutionHash);
  }
  if (!versionHash) {
    versionHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("v1"));
    console.log("VERSION_HASH not set, using:", versionHash);
  }

  const Acceptance = await hre.ethers.getContractFactory("ConstitutionAcceptanceRegistry");
  const acceptance = await Acceptance.deploy(constitutionHash, versionHash);
  await acceptance.waitForDeployment();

  const addr = await acceptance.getAddress();
  console.log("ConstitutionAcceptanceRegistry:", addr);

  addrs.ConstitutionAcceptanceRegistry = addr;
  addrs.CONSTITUTION_HASH = constitutionHash;
  addrs.VERSION_HASH = versionHash;
  save(outPath, addrs);

  console.log("Saved to", outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
