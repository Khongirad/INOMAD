const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

function saveAddresses(addrs) {
  const p = path.join(process.cwd(), "addresses.json");
  const prev = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : {};
  const next = { ...prev, ...addrs };
  fs.writeFileSync(p, JSON.stringify(next, null, 2));
  console.log("Saved to addresses.json");
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("deployer:", deployer.address);

  const TumenAuth = await hre.ethers.getContractFactory("TumenAuthorityMock");
  const tumenAuth = await TumenAuth.deploy();
  await tumenAuth.waitForDeployment();
  console.log("TumenAuthorityMock:", await tumenAuth.getAddress());

  // Deploy KhuralLawProcess with placeholder registry address first (set after LawRegistry deploy)
  const Khural = await hre.ethers.getContractFactory("KhuralLawProcess");

  // We'll deploy a temporary LawRegistry authority as deployer, then switch authority to Khural.
  // So first deploy a stub Khural with lawRegistry = deployer (will be replaced by correct address via redeploy below).
  // Easier: deploy LawRegistry with deployer as authority, then deploy Khural with LawRegistry addr, then setAuthority on LawRegistry.
  const Law = await hre.ethers.getContractFactory("LawRegistry");
  const law = await Law.deploy(deployer.address);
  await law.waitForDeployment();
  console.log("LawRegistry:", await law.getAddress());

  // Params: quorum=1, superMajorityBps=6667 (2/3), timelockSeconds=0 for local testing
  const quorum = 1;
  const superMajorityBps = 6667;
  const timelockSeconds = 0;

  const khural = await Khural.deploy(await tumenAuth.getAddress(), await law.getAddress(), quorum, superMajorityBps, timelockSeconds);
  await khural.waitForDeployment();
  console.log("KhuralLawProcess:", await khural.getAddress());

  // hand over authority to KhuralLawProcess
  const tx = await law.setAuthority(await khural.getAddress());
  await tx.wait();

  saveAddresses({
    TumenAuthorityMock: await tumenAuth.getAddress(),
    LawRegistry: await law.getAddress(),
    KhuralLawProcess: await khural.getAddress(),
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
