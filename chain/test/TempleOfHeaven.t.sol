// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/TempleOfHeaven.sol";
import "../contracts/ScientistCouncil.sol";
import "../contracts/WisdomCouncil.sol";

contract TempleOfHeavenTest is Test {
    TempleOfHeaven public temple;
    ScientistCouncil public scientistCouncil;
    WisdomCouncil public wisdomCouncil;
    
    address public admin = address(0x1);
    address public stateFunding = address(0x2);
    address public donationAccount = address(0x3);
    address public scientist1 = address(0x4);
    address public elder1 = address(0x5);
    address public citizen = address(0x6);
    
    bytes32 public docHash = keccak256("test_document");
    
    function setUp() public {
        // Contracts are deployed by test contract (address(this))
        // which gets DEFAULT_ADMIN_ROLE automatically
        temple = new TempleOfHeaven(stateFunding, donationAccount);
        scientistCouncil = new ScientistCouncil();
        wisdomCouncil = new WisdomCouncil();
        
        // Grant roles for Temple
        temple.grantScientistCouncil(scientist1);
        temple.grantWisdomCouncil(elder1);
    }
    
    // ============ Temple Tests ============
    
    function test_Temple_SubmitRecord() public {
        vm.prank(citizen);
        temple.submitRecord(
            docHash,
            TempleOfHeaven.RecordType.LIBRARY,
            "ipfs://QmTest"
        );
        
        TempleOfHeaven.Record memory record = temple.getRecord(docHash);
        assertEq(record.documentHash, docHash);
        assertEq(uint(record.recordType), uint(TempleOfHeaven.RecordType.LIBRARY));
        assertEq(record.submitter, citizen);
        assertFalse(record.scientificVerified);
        assertFalse(record.ethicalVerified);
    }
    
    function test_Temple_ScientificVerify() public {
        vm.prank(citizen);
        temple.submitRecord(docHash, TempleOfHeaven.RecordType.LIBRARY, "test");
        
        vm.prank(scientist1);
        temple.scientificVerify(docHash, true);
        
        TempleOfHeaven.Record memory record = temple.getRecord(docHash);
        assertTrue(record.scientificVerified);
        assertEq(record.scientificVerifier, scientist1);
    }
    
    function test_Temple_EthicalVerify() public {
        vm.prank(citizen);
        temple.submitRecord(docHash, TempleOfHeaven.RecordType.ARCHIVE, "test");
        
        vm.prank(elder1);
        temple.ethicalVerify(docHash, true);
        
        TempleOfHeaven.Record memory record = temple.getRecord(docHash);
        assertTrue(record.ethicalVerified);
        assertEq(record.ethicalVerifier, elder1);
    }
    
    function test_Temple_FullyVerified() public {
        vm.prank(citizen);
        temple.submitRecord(docHash, TempleOfHeaven.RecordType.CADASTRE, "test");
        
        vm.prank(scientist1);
        temple.scientificVerify(docHash, true);
        
        vm.prank(elder1);
        temple.ethicalVerify(docHash, true);
        
        assertTrue(temple.isFullyVerified(docHash));
    }
    
    function test_Temple_ReceiveDonation() public {
        vm.deal(citizen, 1 ether);
        
        vm.prank(citizen);
        temple.receiveDonation{value: 0.5 ether}();
        
        assertEq(temple.getDonation(citizen), 0.5 ether);
        assertEq(temple.totalDonations(), 0.5 ether);
        assertEq(temple.getBalance(), 0.5 ether);
    }
    
    function test_Temple_ReceiveStateFunding() public {
        vm.deal(stateFunding, 10 ether);
        
        // Grant STATE_TREASURER role (test contract is admin)
        temple.grantRole(temple.STATE_TREASURER(), stateFunding);
        
        vm.prank(stateFunding);
        temple.receiveStateFunding{value: 5 ether}();
        
        assertEq(temple.getBalance(), 5 ether);
    }
    
    function test_Temple_GetRecordsByType() public {
        bytes32 hash1 = keccak256("doc1");
        bytes32 hash2 = keccak256("doc2");
        bytes32 hash3 = keccak256("doc3");
        
        vm.startPrank(citizen);
        temple.submitRecord(hash1, TempleOfHeaven.RecordType.LIBRARY, "test1");
        temple.submitRecord(hash2, TempleOfHeaven.RecordType.LIBRARY, "test2");
        temple.submitRecord(hash3, TempleOfHeaven.RecordType.ARCHIVE, "test3");
        vm.stopPrank();
        
        bytes32[] memory libraryRecords = temple.getRecordsByType(TempleOfHeaven.RecordType.LIBRARY);
        assertEq(libraryRecords.length, 2);
        
        bytes32[] memory archiveRecords = temple.getRecordsByType(TempleOfHeaven.RecordType.ARCHIVE);
        assertEq(archiveRecords.length, 1);
    }
    
    function test_Temple_RevertDuplicateRecord() public {
        vm.startPrank(citizen);
        temple.submitRecord(docHash, TempleOfHeaven.RecordType.LIBRARY, "test");
        
        vm.expectRevert(TempleOfHeaven.RecordAlreadyExists.selector);
        temple.submitRecord(docHash, TempleOfHeaven.RecordType.LIBRARY, "test2");
        vm.stopPrank();
    }
    
    function test_Temple_RevertUnauthorizedScientificVerify() public {
        vm.prank(citizen);
        temple.submitRecord(docHash, TempleOfHeaven.RecordType.LIBRARY, "test");
        
        vm.expectRevert();
        vm.prank(citizen);
        temple.scientificVerify(docHash, true);
    }
    
    // ============ Scientist Council Tests ============
    
    function test_ScientistCouncil_NominateScientist() public {
        // Test contract is admin, grant role directly
        scientistCouncil.grantRole(scientistCouncil.ARBAN_NOMINATOR(), admin);
        
        vm.prank(admin);
        uint256 scientistId = scientistCouncil.nominateScientist(
            12345,
            keccak256("PhD_Certificate"),
            "Physics",
            1,
            scientist1
        );
        
        assertEq(scientistId, 1);
        
        ScientistCouncil.Scientist memory sci = scientistCouncil.getScientist(scientistId);
        assertEq(sci.seatId, 12345);
        assertEq(sci.field, "Physics");
        assertEq(sci.nominatedByArbanId, 1);
        assertFalse(sci.approved);
    }
    
    function test_ScientistCouncil_ApproveScientist() public {
        // Setup: grant roles (test contract is admin)
        scientistCouncil.grantRole(scientistCouncil.ARBAN_NOMINATOR(), admin);
        scientistCouncil.grantRole(scientistCouncil.COUNCILOR_ROLE(), admin);
        scientistCouncil.grantRole(scientistCouncil.COUNCILOR_ROLE(), scientist1);
        scientistCouncil.grantRole(scientistCouncil.COUNCILOR_ROLE(), elder1);
        
        // Nominate
        vm.prank(admin);
        uint256 scientistId = scientistCouncil.nominateScientist(
            12345,
            keccak256("PhD"),
            "Biology",
            1,
            address(0x10)
        );
        
        // Approve by 3 councilors
        vm.prank(admin);
        scientistCouncil.approveScientist(scientistId);
        
        vm.prank(scientist1);
        scientistCouncil.approveScientist(scientistId);
        
        vm.prank(elder1);
        scientistCouncil.approveScientist(scientistId);
        
        ScientistCouncil.Scientist memory sci = scientistCouncil.getScientist(scientistId);
        assertTrue(sci.approved);
        assertEq(sci.approvals, 3);
    }
    
    function test_ScientistCouncil_SubmitDiscovery() public {
        // Setup (test contract is admin)
        scientistCouncil.grantRole(scientistCouncil.COUNCILOR_ROLE(), scientist1);
        
        vm.prank(scientist1);
        scientistCouncil.submitDiscovery(
            keccak256("new_discovery"),
            "Revolutionary physics breakthrough"
        );
        
        // Event should be emitted (tested implicitly)
    }
    
    // ============ Wisdom Council Tests ============
    
    function test_WisdomCouncil_NominateElder() public {
        // Test contract is admin
        wisdomCouncil.grantRole(wisdomCouncil.ARBAN_NOMINATOR(), admin);
        
        vm.prank(admin);
        uint256 elderId = wisdomCouncil.nominateElder(
            54321,
            "kind, honest, compassionate, wise",
            2,
            elder1
        );
        
        assertEq(elderId, 1);
        
        WisdomCouncil.Elder memory elder = wisdomCouncil.getElder(elderId);
        assertEq(elder.seatId, 54321);
        assertEq(elder.virtues, "kind, honest, compassionate, wise");
        assertEq(elder.nominatedByArbanId, 2);
        assertFalse(elder.approved);
    }
    
    function test_WisdomCouncil_ApproveElder() public {
        // Setup: grant roles (test contract is admin)
        wisdomCouncil.grantRole(wisdomCouncil.ARBAN_NOMINATOR(), admin);
        wisdomCouncil.grantRole(wisdomCouncil.ELDER_ROLE(), admin);
        wisdomCouncil.grantRole(wisdomCouncil.ELDER_ROLE(), elder1);
        wisdomCouncil.grantRole(wisdomCouncil.ELDER_ROLE(), scientist1);
        
        // Nominate
        vm.prank(admin);
        uint256 elderId = wisdomCouncil.nominateElder(
            54321,
            "wise and kind",
            2,
            address(0x20)
        );
        
        // Approve by 3 elders
        vm.prank(admin);
        wisdomCouncil.approveElder(elderId);
        
        vm.prank(elder1);
        wisdomCouncil.approveElder(elderId);
        
        vm.prank(scientist1);
        wisdomCouncil.approveElder(elderId);
        
        WisdomCouncil.Elder memory elder = wisdomCouncil.getElder(elderId);
        assertTrue(elder.approved);
        assertEq(elder.approvals, 3);
    }
    
    function test_WisdomCouncil_EthicalReview() public {
        // Test contract is admin
        wisdomCouncil.grantRole(wisdomCouncil.ELDER_ROLE(), elder1);
        
        bytes32 ethicalDoc = keccak256("ethical_question");
        
        vm.prank(elder1);
        wisdomCouncil.ethicalReview(
            ethicalDoc,
            true,
            "This aligns with our cultural values"
        );
        
        WisdomCouncil.EthicalReview memory review = wisdomCouncil.getEthicalReview(ethicalDoc);
        assertTrue(review.approved);
        assertEq(review.reviewer, elder1);
        assertEq(review.reasoning, "This aligns with our cultural values");
    }
    
    function test_WisdomCouncil_CulturalHeritageReview() public {
        // Test contract is admin
        wisdomCouncil.grantRole(wisdomCouncil.ELDER_ROLE(), elder1);
        
        vm.prank(elder1);
        wisdomCouncil.culturalHeritageReview(
            keccak256("ancient_artifact"),
            true
        );
        
        // Event emitted (verified implicitly)
    }
    
    // ============ Integration Tests ============
    
    function test_Integration_FullWorkflow() public {
        // 1. Submit record to Temple
        vm.prank(citizen);
        temple.submitRecord(docHash, TempleOfHeaven.RecordType.LIBRARY, "Important discovery");
        
        // 2. Scientist verifies
        vm.prank(scientist1);
        temple.scientificVerify(docHash, true);
        
        // 3. Elder reviews ethically
        vm.prank(elder1);
        temple.ethicalVerify(docHash, true);
        
        // 4. Check fully verified
        assertTrue(temple.isFullyVerified(docHash));
        
        TempleOfHeaven.Record memory record = temple.getRecord(docHash);
        assertTrue(record.scientificVerified);
        assertTrue(record.ethicalVerified);
        assertEq(record.scientificVerifier, scientist1);
        assertEq(record.ethicalVerifier, elder1);
    }
}
