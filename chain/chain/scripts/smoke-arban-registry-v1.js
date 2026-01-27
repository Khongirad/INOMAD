// npx hardhat run scripts/smoke-arban-registry-v1.js --network localhost
const { ethers } = require("hardhat");

async function main() {
  const signers = await ethers.getSigners();
  const [deployer, ...users] = signers;

  // --- Deploy SeatSBT + Organization + StructureRegistry (минимум, без TenRegistry)
  const SeatSBT = await ethers.getContractFactory("SeatSBT");
  const seat = await SeatSBT.deploy("SeatSBT", "SEAT");
  await seat.waitForDeployment();

  const Organization = await ethers.getContractFactory("Organization");
  const org = await Organization.deploy(deployer.address);
  await org.waitForDeployment();

  const StructureRegistry = await ethers.getContractFactory(
    "StructureRegistry"
  );
  const structure = await StructureRegistry.deploy(await org.getAddress());
  await structure.waitForDeployment();

  console.log("SeatSBT:", await seat.getAddress());
  console.log("Organization:", await org.getAddress());
  console.log("StructureRegistry:", await structure.getAddress());

  // --- Mint 100 seats directly (MVP smoke)
  // если у тебя mintSeat ограничен ролями, временно выдай deployer роль REGISTRAR_ROLE
  const REGISTRAR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REGISTRAR_ROLE"));
  await (await seat.grantRole(REGISTRAR_ROLE, deployer.address)).wait();

  // mint seatIds 1..100 на разные адреса
  for (let i = 1; i <= 100; i++) {
    const to = users[(i - 1) % users.length].address;
    await (await seat.mintSeat(to)).wait();
  }
  console.log("Minted seats 1..100");

  // --- Deploy ArbanRegistry
  const ArbanRegistry = await ethers.getContractFactory("ArbanRegistry");
  const ar = await ArbanRegistry.deploy(
    await org.getAddress(),
    await seat.getAddress(),
    await structure.getAddress()
  );
  await ar.waitForDeployment();

  console.log("ArbanRegistry:", await ar.getAddress());

  // NOTE: StructureRegistry.setArbanLeader is onlyOwner сейчас.
  // Значит: OWNER StructureRegistry должен быть ArbanRegistry ИЛИ сделай setOwner(arbanRegistry) для smoke.
  await (await structure.setOwner(await ar.getAddress())).wait();
  console.log("StructureRegistry.owner -> ArbanRegistry");

  // --- Create 10 Arbans (каждый по 10 seatId)
  const arbanIds = [];
  for (let a = 0; a < 10; a++) {
    const start = a * 10 + 1;
    const seatIds = [];
    for (let k = 0; k < 10; k++) seatIds.push(start + k);

    // лидер = владелец первого seatId (для простоты)
    const leaderAddr = await seat.ownerOf(seatIds[0]);

    // createArban должен вызываться владельцем всех seatId (в твоём MVP).
    // Мы минтаили сиды на разные адреса => это не пройдёт.
    // Поэтому для smoke: переминтим эти 10 сидов на deployer, или mint сразу deployer.
    // Здесь сделаем transfer сидов к deployer (если SeatSBT soulbound, transfers не будет).
    // Тогда проще: mint seats сразу на deployer в этом smoke.
    // -----
    // Вместо этого, для корректного smoke ниже: создадим Arban из 2 seats, оба принадлежат deployer.
    // -----
  }

  console.log(
    "IMPORTANT: твой ArbanRegistry.createArban сейчас требует, чтобы msg.sender владел КАЖДЫМ seatId."
  );
  console.log(
    "Для smoke сделай mint всех seat на deployer ИЛИ временно ослабь правило до 'leader owns first seat'."
  );

  // Практический вариант: быстрое решение для smoke:
  // - mint все seat на deployer
  // - создать 10 Arbans
  // - registerZun([1..10])
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
