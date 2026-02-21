const hre = require("hardhat");

async function main() {
  const constitutionText = "ALTAN CONSTITUTION v1";
  const versionText = "v1.0";

  const constitutionHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(constitutionText));
  const versionHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(versionText));

  console.log("constitutionHash:", constitutionHash);
  console.log("versionHash:", versionHash);

  const Factory = await hre.ethers.getContractFactory("ConstitutionAcceptanceRegistry");
  const contract = await Factory.deploy(constitutionHash, versionHash);
  await contract.waitForDeployment();

  console.log("Deployed to:", await contract.getAddress());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
