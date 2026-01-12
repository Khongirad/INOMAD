const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const { ethers } = hre;

function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
}

async function main() {
  const [deployer] = await ethers.getSigners();

  const SeatSBT = await ethers.getContractFactory("SeatSBT");
  const seat = await SeatSBT.deploy();
  await seat.waitForDeployment();

  const SeatAccountFactory = await ethers.getContractFactory("SeatAccountFactory");
  const factory = await SeatAccountFactory.deploy(await seat.getAddress());
  await factory.waitForDeployment();

  const Altan = await ethers.getContractFactory("Altan");
  const altan = await Altan.deploy();
  await altan.waitForDeployment();

  const CentralBank = await ethers.getContractFactory("CentralBank");
  const bank = await CentralBank.deploy(await altan.getAddress());
  await bank.waitForDeployment();

  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  await (await altan.grantRole(MINTER_ROLE, await bank.getAddress())).wait();

  const TenRegistry = await ethers.getContractFactory("TenRegistry");
  const ten = await TenRegistry.deploy(
    await seat.getAddress(),
    await factory.getAddress(),
    await bank.getAddress()
  );
  await ten.waitForDeployment();

  const REGISTRAR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REGISTRAR_ROLE"));
  await (await seat.grantRole(REGISTRAR_ROLE, await ten.getAddress())).wait();
  await (await bank.grantRole(REGISTRAR_ROLE, await ten.getAddress())).wait();

  const out = {
    deployer: deployer.address,
    SeatSBT: await seat.getAddress(),
    SeatAccountFactory: await factory.getAddress(),
    Altan: await altan.getAddress(),
    CentralBank: await bank.getAddress(),
    TenRegistry: await ten.getAddress()
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
