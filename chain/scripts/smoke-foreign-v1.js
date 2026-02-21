/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

function reqEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

async function main() {
  const RPC = reqEnv("RPC");
  const PK = reqEnv("PK");

  const addrsPath = path.join(__dirname, "..", "addresses-foreign.json");
  const addrs = JSON.parse(fs.readFileSync(addrsPath, "utf8"));

  const provider = new ethers.JsonRpcProvider(RPC);
  const baseWallet = new ethers.Wallet(PK, provider);
  const wallet = new ethers.NonceManager(baseWallet);

  const AUTH = addrs.ExecutiveAuthority;
  const SBT = addrs.ForeignSeatSBT;
  const FAR = addrs.ForeignAffairsRegistry;
  const GW  = addrs.GatewayRouter;

  const abiAuth = ["function hasRole(bytes32,address) view returns (bool)"];
  const abiSbt  = ["function minter() view returns (address)", "function ownerOf(uint256) view returns (address)"];
  const abiFar  = [
    "function seatOfPassport(bytes32) view returns (uint256)",
    "function revokeForeignSeat(uint256)",
  ];
  const abiGw = [
    "function getRoute(bytes32) view returns (address)",
    "function onboardForeign(address,bytes32,string) returns (uint256)",
  ];

  const auth = new ethers.Contract(AUTH, abiAuth, provider);
  const sbt  = new ethers.Contract(SBT,  abiSbt,  provider);
  const far  = new ethers.Contract(FAR,  abiFar,  wallet);
  const gw   = new ethers.Contract(GW,   abiGw,   wallet);

  const ROUTE_KEY = ethers.keccak256(ethers.toUtf8Bytes("FOREIGN_AFFAIRS"));
  const OFFICER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("FOREIGN_AFFAIRS_OFFICER"));

  console.log("RPC:", RPC);
  const deployer = await wallet.getAddress();
  console.log("Deployer:", deployer);
  console.log("AUTH:", AUTH);
  console.log("SBT :", SBT);
  console.log("FAR :", FAR);
  console.log("GW  :", GW);

  // 1) route
  const route = await gw.getRoute(ROUTE_KEY);
  console.log("Route(FOREIGN_AFFAIRS) =", route);
  if (route.toLowerCase() !== FAR.toLowerCase()) throw new Error("Route mismatch");

  // 2) minter
  const minter = await sbt.minter();
  console.log("SBT.minter =", minter);
  if (minter.toLowerCase() !== FAR.toLowerCase()) throw new Error("Minter mismatch");

  // 3) officer role for GW
  const okOfficer = await auth.hasRole(OFFICER_ROLE, GW);
  console.log("GW has OFFICER role =", okOfficer);
  if (!okOfficer) throw new Error("GW is not OFFICER");

  // 4) issue
  const passportHash = ethers.keccak256(ethers.toUtf8Bytes("passport:KZ:123456789"));
  const to = deployer;
  const uri = "ipfs://Qm.../foreign.json";

  console.log("Issuing seat...");
  const tx1 = await gw.onboardForeign(to, passportHash, uri);
  const r1 = await tx1.wait();
  console.log("onboard tx:", r1.hash);

  const seatId = await new ethers.Contract(FAR, ["function seatOfPassport(bytes32) view returns (uint256)"], provider)
    .seatOfPassport(passportHash);

  console.log("seatId =", seatId.toString());
  if (seatId === 0n) throw new Error("seatOfPassport is 0 after issue");

  const owner = await sbt.ownerOf(seatId);
  console.log("ownerOf(seatId) =", owner);
  if (owner.toLowerCase() !== to.toLowerCase()) throw new Error("owner mismatch");

  // 5) revoke
  console.log("Revoking seat...");
  const tx2 = await far.revokeForeignSeat(seatId);
  const r2 = await tx2.wait();
  console.log("revoke tx:", r2.hash);

  const seatAfter = await new ethers.Contract(FAR, ["function seatOfPassport(bytes32) view returns (uint256)"], provider)
    .seatOfPassport(passportHash);
  console.log("seatOfPassport after revoke =", seatAfter.toString());
  if (seatAfter !== 0n) throw new Error("seatOfPassport not cleared");

  try {
    await sbt.ownerOf(seatId);
    throw new Error("ownerOf did not revert after burn");
  } catch (e) {
    console.log("ownerOf reverted as expected");
  }

  console.log("SMOKE OK");
}

main().catch((e) => {
  console.error("SMOKE FAIL:", e.message || e);
  process.exit(1);
});
