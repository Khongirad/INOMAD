const hre = require("hardhat");

async function main() {
  const activation = process.env.ACTIVATION;
  const seatId = Number(process.env.SEAT_ID || "1");
  const act = await hre.ethers.getContractAt("ActivationRegistry", activation);
  const ok = await act.isActive(seatId);
  console.log("isActive(", seatId, ") =", ok);
}

main().catch((e) => { console.error(e); process.exit(1); });
