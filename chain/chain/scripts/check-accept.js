const hre = require("hardhat");
async function main(){
  const accAddr = process.env.ACCEPTANCE;
  const user = process.env.CITIZEN_ADDR;
  const seatId = Number(process.env.SEAT_ID||"1");
  const acc = await hre.ethers.getContractAt("ConstitutionAcceptanceRegistry", accAddr);
  console.log("hasAccepted(user) =", await acc.hasAccepted(user));
  console.log("hasAcceptedSeat(seatId) =", await acc.hasAcceptedSeat(seatId));
}
main().catch(e=>{console.error(e);process.exit(1);});
