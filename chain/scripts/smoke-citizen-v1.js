const fs = require("fs");
const { execSync } = require("child_process");

function sh(cmd) {
  return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
}
function reqEnv(name) {
  if (!process.env[name]) {
    console.error(`Missing env: ${name}`);
    process.exit(1);
  }
}
reqEnv("RPC_URL");

const file = process.argv[2];
if (!file) {
  console.error("Usage: node smoke-citizen-v1.js <addresses-citizen.json>");
  process.exit(1);
}

const j = JSON.parse(fs.readFileSync(file, "utf8"));
const c = (j && j.contracts) || {};
const addrs = [
  ["SeatSBT", c.SeatSBT],
  ["CitizenActivation", c.CitizenActivation],
  ["ArbanRegistry", c.ArbanRegistry],
];

function assertAddr(label, addr) {
  if (!addr || !/^0x[a-fA-F0-9]{40}$/.test(addr)) {
    console.error(`Invalid ${label} address: ${addr}`);
    process.exit(1);
  }
}
function hasCode(addr) {
  const code = sh(`cast code ${addr} --rpc-url ${process.env.RPC_URL}`);
  return code && code !== "0x";
}

for (const [label, addr] of addrs) assertAddr(label, addr);

console.log("[smoke] checking bytecode...");
for (const [label, addr] of addrs) {
  if (!hasCode(addr)) {
    console.error(`[smoke] FAIL: no code at ${label}=${addr}`);
    process.exit(1);
  }
  console.log(`[smoke] OK: ${label}=${addr}`);
}
console.log("[smoke] passed");
