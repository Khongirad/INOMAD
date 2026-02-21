const { ethers } = require("hardhat");

async function main() {
  const [deployer, notaryZun, ...rest] = await ethers.getSigners();

  // Deploy StructureRegistry
  const StructureRegistry = await ethers.getContractFactory(
    "StructureRegistry"
  );
  const registry = await StructureRegistry.deploy(ethers.ZeroAddress);
  await registry.waitForDeployment();

  // Create Zun
  const arbanIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const tx = await registry.registerZun(arbanIds, deployer.address);
  const rc = await tx.wait();
  const evt = rc.logs
    .map((l) => {
      try {
        return registry.interface.parseLog(l);
      } catch {
        return null;
      }
    })
    .find((e) => e && e.name === "ZunRegistered");
  const zunId = evt.args.zunId;

  // Set 10 Arban leaders
  for (let i = 0; i < 10; i++) {
    await (await registry.setArbanLeader(arbanIds[i], rest[i].address)).wait();
  }

  // Deploy DocumentRegistry
  const DocumentRegistry = await ethers.getContractFactory("DocumentRegistry");
  const docReg = await DocumentRegistry.deploy();
  await docReg.waitForDeployment();

  // Deploy NotaryHub
  const NotaryHub = await ethers.getContractFactory("NotaryHub");
  const hub = await NotaryHub.deploy(
    await registry.getAddress(),
    await docReg.getAddress()
  );
  await hub.waitForDeployment();

  // Передаём владение DocumentRegistry хабу (чтобы только hub мог issue/setStatus)
  await (await docReg.setOwner(await hub.getAddress())).wait();

  // Назначаем нотариуса уровня ZUN
  await (await hub.setNotary(notaryZun.address, 2 /*ZUN*/, true)).wait();

  // Нотариус выпускает документ
  const docHash = ethers.keccak256(ethers.toUtf8Bytes("ZUN:notary:issued:v1"));
  const tx2 = await hub.connect(notaryZun).issueZunResolution(zunId, docHash);
  const rc2 = await tx2.wait();

  const issued = rc2.logs
    .map((l) => {
      try {
        return hub.interface.parseLog(l);
      } catch {
        return null;
      }
    })
    .find((e) => e && e.name === "ZunDocumentIssued");

  const docId = issued.args.docId;
  const docAddr = issued.args.docAddress;

  console.log("Issued docId:", docId.toString());
  console.log("Doc address:", docAddr);

  // Проверим метаданные в реестре
  const meta = await docReg.docs(docId);
  console.log(
    "Meta.grade:",
    meta.grade.toString(),
    "scopeId:",
    meta.scopeId.toString(),
    "notary:",
    meta.notary
  );

  // Подпишем документ 10 лидерами
  const ZunResolution = await ethers.getContractFactory("ZunResolution");
  const doc = ZunResolution.attach(docAddr);

  for (let i = 0; i < 10; i++) {
    await (await doc.connect(rest[i]).sign()).wait();
  }
  await (await doc.finalize()).wait();
  console.log("Finalized:", await doc.finalized());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
