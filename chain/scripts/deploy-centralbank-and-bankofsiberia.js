const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("deployer:", deployer.address);

  // 1) Central Bank
  const CBS = await hre.ethers.getContractFactory("CentralBankOfSiberia");
  const cbs = await CBS.deploy();
  await cbs.waitForDeployment();
  const cbsAddr = await cbs.getAddress();
  console.log("CentralBankOfSiberia:", cbsAddr);

  // 2) License Registry (owned by Central Bank)
  const Reg = await hre.ethers.getContractFactory("BankLicenseRegistry");
  const reg = await Reg.deploy(cbsAddr);
  await reg.waitForDeployment();
  const regAddr = await reg.getAddress();
  console.log("BankLicenseRegistry:", regAddr);

  // 3) Ledger (Central Bank + Registry)
  const Ledger = await hre.ethers.getContractFactory("AltanBankLedger");
  const ledger = await Ledger.deploy(cbsAddr, regAddr);
  await ledger.waitForDeployment();
  const ledgerAddr = await ledger.getAddress();
  console.log("AltanBankLedger:", ledgerAddr);

  // 4) Wire Central Bank -> Registry/Ledger
  await (await cbs.setLicenseRegistry(regAddr)).wait();
  await (await cbs.setLedger(ledgerAddr)).wait();
  console.log("CBS wired to Registry & Ledger");

  // 5) Deploy Bank of Siberia (points to Ledger)
  const BoS = await hre.ethers.getContractFactory("BankOfSiberia");
  const bos = await BoS.deploy(ledgerAddr);
  await bos.waitForDeployment();
  const bosAddr = await bos.getAddress();
  console.log("BankOfSiberia:", bosAddr);

  // 6) Issue first bank license to Bank of Siberia
  const nameHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("BANK_OF_SIBERIA"));
  const metaHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("FIRST_LICENSED_BANK"));
  await (await cbs.issueBankLicense(bosAddr, nameHash, metaHash)).wait();
  console.log("License issued to BankOfSiberia");

  // 7) Smoke test: mint from CBS to an INOMAD account
  const INOMAD_ACCOUNT_ID = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("ACCOUNT:INOMAD_INC"));
  const ASSET_NATIVE = "0x0000000000000000000000000000000000000000";
  await (
    await cbs.mintToAccount(
      INOMAD_ACCOUNT_ID,
      ASSET_NATIVE,
      1_000_000n,
      hre.ethers.encodeBytes32String("genesis_mint")
    )
  ).wait();
  console.log("Minted 1,000,000 units to INOMAD accountId");
  console.log("INOMAD_ACCOUNT_ID:", INOMAD_ACCOUNT_ID);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
