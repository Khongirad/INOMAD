const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const [deployer, notaryZun, notaryMy, notaryTu, ...rest] = await ethers.getSigners();

  // --- StructureRegistry ---
  const StructureRegistry = await ethers.getContractFactory("StructureRegistry");
  const registry = await StructureRegistry.deploy(ethers.ZeroAddress);
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();

  // --- DocumentRegistry ---
  const DocumentRegistry = await ethers.getContractFactory("DocumentRegistry");
  const docReg = await DocumentRegistry.deploy();
  await docReg.waitForDeployment();

  // --- ChairmanRegistry ---
  const ChairmanRegistry = await ethers.getContractFactory("ChairmanRegistry");
  const chairReg = await ChairmanRegistry.deploy();
  await chairReg.waitForDeployment();

  // --- NotaryHub (ctor: structureRegistry, docRegistry, chairmanRegistry) ---
  const NotaryHub = await ethers.getContractFactory("NotaryHub");
  const hub = await NotaryHub.deploy(registryAddr, await docReg.getAddress(), await chairReg.getAddress());
  await hub.waitForDeployment();

  // make hub owner of docReg
  await (await docReg.setOwner(await hub.getAddress())).wait();

  // set notaries
  // grades: CITIZEN=1, ZUN=2, MYANGAN=3, TUMEN=4, CHAIRMAN=5 (per your enum)
  await (await hub.setNotary(notaryZun.address, 2, true)).wait();
  await (await hub.setNotary(notaryMy.address, 3, true)).wait();
  await (await hub.setNotary(notaryTu.address, 4, true)).wait();

  // OPTIONAL: enable deployer as CITIZEN notary (often needed to issue ArbanJoinDoc)
  await (await hub.setNotary(deployer.address, 1, true)).wait();

  // Write addresses
  const stackOut = {
    StructureRegistry: registryAddr,
    DocumentRegistry: await docReg.getAddress(),
    ChairmanRegistry: await chairReg.getAddress(),
    NotaryHub: await hub.getAddress(),
  };
  const outPath = path.join(process.cwd(), "addresses-notary.json");
  fs.writeFileSync(outPath, JSON.stringify(stackOut, null, 2));

  console.log("NOTARY_ADDRESSES_JSON:", outPath);
  for (const [k, v] of Object.entries(stackOut)) console.log(`${k}: ${v}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
