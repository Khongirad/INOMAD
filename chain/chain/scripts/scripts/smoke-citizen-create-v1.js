const { ethers } = require("hardhat");

async function main() {
  const [deployer, user] = await ethers.getSigners();

  // ===== addresses (замени при необходимости) =====
  // Если у тебя деплой-скрипт сохраняет адреса — подставь их отсюда
  const SeatSBT = await ethers.getContractFactory("SeatSBT");
  const CitizenRegistry = await ethers.getContractFactory("CitizenRegistry");

  // 1) Deploy SeatSBT (если уже задеплоен — замени на getContractAt)
  const seat = await SeatSBT.deploy("Seat", "SEAT");
  await seat.waitForDeployment();
  console.log("SeatSBT:", await seat.getAddress());

  // 2) Mint seatId = 1 пользователю
  // Убедись, что mint разрешён (REGISTRAR_ROLE у deployer)
  await seat.mintSeat(user.address);
  const seatId = 1;
  console.log("Minted seatId:", seatId, "to", user.address);

  // 3) Deploy CitizenRegistry
  const registry = await CitizenRegistry.deploy(await seat.getAddress());
  await registry.waitForDeployment();
  console.log("CitizenRegistry:", await registry.getAddress());

  // 4) Create CitizenAccount (пользователь сам)
  const tx = await registry.connect(user).createMyCitizen(
    seatId,
    user.address // controller (EOA на MVP)
  );
  await tx.wait();

  const citizen = await registry.citizenOfSeat(seatId);
  console.log("CitizenAccount:", citizen);

  // 5) Проверки
  const seatOfCitizen = await registry.seatOfCitizen(citizen);
  console.log("seatOfCitizen:", seatOfCitizen.toString());

  if (seatOfCitizen.toString() !== seatId.toString()) {
    throw new Error("seatOfCitizen mismatch");
  }

  console.log("OK: citizen created and linked to seat");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
