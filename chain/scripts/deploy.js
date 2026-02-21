const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const { ethers } = hre;

function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
}

async function main() {
  const [deployer] = await ethers.getSigners();

  // --- SeatSBT ---
  const SeatSBT = await ethers.getContractFactory("SeatSBT");
  const seat = await SeatSBT.deploy();
  await seat.waitForDeployment();

  // --- SeatAccountFactory ---
  const SeatAccountFactory = await ethers.getContractFactory(
    "SeatAccountFactory"
  );
  const factory = await SeatAccountFactory.deploy(await seat.getAddress());
  await factory.waitForDeployment();

  // --- Altan ---
  const Altan = await ethers.getContractFactory("Altan");
  const altan = await Altan.deploy();
  await altan.waitForDeployment();

  // --- CentralBank ---
  const CentralBank = await ethers.getContractFactory("CentralBank");
  const bank = await CentralBank.deploy(await altan.getAddress());
  await bank.waitForDeployment();

  // ===== ROLES =====

  // MINTER_ROLE -> CentralBank
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  await (await altan.grantRole(MINTER_ROLE, await bank.getAddress())).wait();

// [MVP-disabled] --- TenRegistry block removed ---

  // --- OrganizationFactory ---
  const OrganizationFactory = await ethers.getContractFactory(
    "OrganizationFactory"
  );
  const orgFactory = await OrganizationFactory.deploy(await seat.getAddress());
  await orgFactory.waitForDeployment();

  // smoke: create org + first arban
  const tx = await orgFactory.createOrganizationWithArban(
    0, // OrgType.PRIVATE
    0, // Branch.NONE
    ethers.ZeroAddress, // notary
    ethers.ZeroAddress // archivist
  );
  const receipt = await tx.wait();

  const out = {
    deployer: deployer.address,
    SeatSBT: await seat.getAddress(),
    SeatAccountFactory: await factory.getAddress(),
    Altan: await altan.getAddress(),
    CentralBank: await bank.getAddress(),
// [MVP-disabled]     TenRegistry: await ten.getAddress(),
    OrganizationFactory: await orgFactory.getAddress(),
    smoke_create_org_tx: receipt.hash,
  };

  const outPath = path.join(process.cwd(), "addresses.json");
  writeJson(outPath, out);

  console.log("Deployed:", out);
  console.log("Wrote", outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
