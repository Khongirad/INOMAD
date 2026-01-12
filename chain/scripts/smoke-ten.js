const hre = require("hardhat");
const { ethers } = hre;
const addrs = require("../addresses.json");

async function main() {
  const [deployer, ...signers] = await ethers.getSigners();

  const seat = await ethers.getContractAt("SeatSBT", addrs.SeatSBT);
  const ten = await ethers.getContractAt("TenRegistry", addrs.TenRegistry);
  const altan = await ethers.getContractAt("Altan", addrs.Altan);

  // 1) mint 10 seats to 10 addresses via TenRegistry role on SeatSBT
  // seat.mintSeat is restricted to REGISTRAR_ROLE; TenRegistry has it.
  // Поэтому мы минтим сиды НЕ через ten, а напрямую seat может только REGISTRAR.
  // Сейчас REGISTRAR на seat у ten, но транзакцию всё равно подписывает EOA.
  // Значит: для smoke проще временно дать deployer REGISTRAR или сделать helper в TenRegistry.
  //
  // Быстрый MVP: дадим deployer REGISTRAR_ROLE на SeatSBT и CentralBank, потом можно отозвать.

  const REGISTRAR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REGISTRAR_ROLE"));
  if (!(await seat.hasRole(REGISTRAR_ROLE, deployer.address))) {
    console.log("Granting deployer REGISTRAR_ROLE on SeatSBT for smoke...");
    await (await seat.grantRole(REGISTRAR_ROLE, deployer.address)).wait();
  }

  const seatIds = [];
  for (let i = 0; i < 10; i++) {
    const to = signers[i].address;
    const tx = await seat.mintSeat(to);
    const rc = await tx.wait();
    // mintSeat returns seatId, но в ethers v6 проще читать nextId-1
    const nextId = await seat.nextId();
    const seatId = Number(nextId) - 1;
    seatIds.push(seatId);
    console.log(`minted seatId=${seatId} to ${to}`);
  }

  // 2) propose ten
  const proposeTx = await ten.proposeTen(seatIds);
  const proposeRc = await proposeTx.wait();
  const tenId = (await ten.count()) - 1n;
  console.log("proposed tenId=", tenId.toString());

  // 3) approve ten
  const approveTx = await ten.approveTen(tenId);
  await approveTx.wait();
  console.log("approved tenId=", tenId.toString());

  // 4) verify: status + account + ALTAN balances
  for (const seatId of seatIds) {
    const st = await seat.statusOf(seatId);
    const acc = await seat.accountOf(seatId);
    const bal = await altan.balanceOf(acc);

    console.log(
      `seatId=${seatId} status=${st} account=${acc} ALTAN=${ethers.formatEther(
        bal
      )}`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
