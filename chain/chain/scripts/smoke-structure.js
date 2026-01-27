const hre = require("hardhat");
const { ethers } = hre;
const addrs = require("../addresses.json");

async function main() {
  const orgFactory = await ethers.getContractAt(
    "OrganizationFactory",
    addrs.OrganizationFactory
  );

  // create a fresh org + arban (factory now also creates StructureRegistry + builds full tumen)
  const tx = await orgFactory.createOrganizationWithArban(
    0, // OrgType.PRIVATE
    0, // Branch.NONE
    ethers.ZeroAddress,
    ethers.ZeroAddress
  );
  await tx.wait();

  const orgId = (await orgFactory.nextOrgId()) - 1n;
  const rec = await orgFactory.getOrg(orgId);

  console.log("orgId:", orgId.toString());
  console.log("org:", rec.org);
  console.log("structureRegistry:", rec.structureRegistry);
  console.log("tumenId:", rec.tumenId.toString());
  console.log(
    "firstArban:",
    rec.firstArban,
    "firstArbanId:",
    rec.firstArbanId.toString()
  );

  const sr = await ethers.getContractAt(
    "StructureRegistry",
    rec.structureRegistry
  );

  const [myanganIds, myanganCount, completeMyanganCount] =
    await sr.getTumenMyangans();
  console.log("myanganCount:", myanganCount.toString());
  console.log("completeMyanganCount:", completeMyanganCount.toString());

  const assembled = await sr.isTumenAssembled();
  console.log("isTumenAssembled:", assembled);

  // sample deep check: first myangan -> first zun -> first arban
  const firstMyanganId = myanganIds[0];
  const [zunIds, zunCount, completeZunCount] = await sr.getMyanganZuns(
    firstMyanganId
  );
  console.log("firstMyanganId:", firstMyanganId.toString());
  console.log(
    "zunCount:",
    zunCount.toString(),
    "completeZunCount:",
    completeZunCount.toString()
  );

  const firstZunId = zunIds[0];
  const [arbanIds, arbanCount, activeArbanCount] = await sr.getZunArbans(
    firstZunId
  );
  console.log("firstZunId:", firstZunId.toString());
  console.log(
    "arbanCount:",
    arbanCount.toString(),
    "activeArbanCount:",
    activeArbanCount.toString()
  );

  const firstArbanId = arbanIds[0];
  const a = await sr.getArban(firstArbanId);
  console.log("firstArbanNode:", {
    id: a.id.toString(),
    zunId: a.zunId.toString(),
    memberCount: a.memberCount.toString(),
    exists: a.exists,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
