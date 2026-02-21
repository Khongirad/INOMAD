const { ethers } = require("ethers");
const fs = require("fs");

async function main() {
  const rpcUrl = process.env.RPC_URL;
  const accAddr = process.env.ACCEPTANCE;
  const user = process.env.CITIZEN_ADDR;
  const seatId = BigInt(process.env.SEAT_ID || "1");

  if (!rpcUrl || !accAddr || !user) throw new Error("Need RPC_URL, ACCEPTANCE, CITIZEN_ADDR");

  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const net = await provider.getNetwork();
  const bn = await provider.getBlockNumber();
  const code = await provider.getCode(accAddr);

  console.log("chainId =", net.chainId.toString());
  console.log("blockNumber =", bn);
  console.log("codeSize =", (code.length - 2) / 2);

  // Load ABI from artifacts (Hardhat compiled)
  const artifact = JSON.parse(fs.readFileSync(
    "artifacts/contracts/ConstitutionAcceptanceRegistry.sol/ConstitutionAcceptanceRegistry.json",
    "utf8"
  ));
  const acc = new ethers.Contract(accAddr, artifact.abi, provider);

  const hasAccepted = await acc.hasAccepted(user);
  const hasAcceptedSeat = await acc.hasAcceptedSeat(seatId);

  const aUser = await acc.acceptanceOf(user);
  const aSeat = await acc.acceptanceOfSeat(seatId);

  console.log("hasAccepted(user) =", hasAccepted);
  console.log("hasAcceptedSeat(seatId) =", hasAcceptedSeat);
  console.log("acceptanceOf(user).acceptedAt =", aUser.acceptedAt.toString());
  console.log("acceptanceOfSeat(seatId).acceptedAt =", aSeat.acceptedAt.toString());
}

main().catch((e) => { console.error(e); process.exit(1); });
