const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const { ethers } = hre;

function readAddresses() {
  const p = path.join(process.cwd(), "addresses.json");
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

async function main() {
  const addrs = readAddresses();
  const signers = await ethers.getSigners();

  const seat = await ethers.getContractAt("SeatSBT", addrs.SeatSBT);
  const altan = await ethers.getContractAt("Altan", addrs.Altan);
  const ten = await ethers.getContractAt("TenRegistry", addrs.TenRegistry);

  const seatIds = [];
  for (let i = 0; i < 10; i++) {
    const to = signers[i].address;
    const tx = await seat.mintSeat(to);
    await tx.wait();
    const nextId = await seat.nextId();
    const seatId = Number(nextId) - 1;
    seatIds.push(seatId);
  }

  console.log("Minted seatIds:", seatIds);

  const proposeTx = await ten.proposeTen(seatIds);
  await proposeTx.wait();

  const tenId = (await ten.count()) - 1n;
  console.log("Proposed tenId:", tenId.toString());

  const approveTx = await ten.approveTen(tenId);
  await approveTx.wait();
  console.log("Approved tenId:", tenId.toString());

  for (let i = 0; i < 10; i++) {
    const seatId = seatIds[i];
    const acc = await seat.accountOf(seatId);
    const st = await seat.statusOf(seatId);
    const bal = await altan.balanceOf(acc);
    console.log(`seat#${seatId} status=${st} account=${acc} ALTAN=${ethers.formatEther(bal)}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
