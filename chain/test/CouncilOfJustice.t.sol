// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/CouncilOfJustice.sol";

contract CouncilOfJusticeTest is Test {
    CouncilOfJustice public council;
    
    address public temple = address(0x1);
    address public admin = address(0x2);
    address public judge1 = address(0x3);
    address public judge2 = address(0x4);
    address public judge3 = address(0x5);
    address public clerk = address(0x6);
    address public citizen = address(0x7);
    
    bytes32 public legalEducationHash = keccak256("law_degree");
    bytes32 public caseHash = keccak256("case_documents");
    bytes32 public rulingHash = keccak256("ruling_document");
    bytes32 public precedentHash = keccak256("precedent_document");
    
    function setUp() public {
        // Deploy contract
        council = new CouncilOfJustice(temple);
        
        // Grant roles
        council.grantRole(council.ARBAN_NOMINATOR(), admin);
        council.grantRole(council.JUDGE_ROLE(), judge1);
        council.grantRole(council.JUDGE_ROLE(), judge2);
        council.grantRole(council.JUDGE_ROLE(), judge3);
        council.grantRole(council.CLERK_ROLE(), clerk);
    }
    
    // ============ Member Management Tests ============
    
    function test_NominateMember() public {
        vm.prank(admin);
        uint256 memberId = council.nominateMember(
            12345,
            legalEducationHash,
            "Civil Law",
            1,
            citizen
        );
        
        assertEq(memberId, 1);
        
        CouncilOfJustice.Member memory member = council.getMember(memberId);
        assertEq(member.memberId, 1);
        assertEq(member.seatId, 12345);
        assertEq(member.legalEducationHash, legalEducationHash);
        assertEq(member.specialization, "Civil Law");
        assertFalse(member.approved);
        assertEq(member.casesHandled, 0);
    }
    
    function test_ApproveMember() public {
        // Nominate member
        vm.prank(admin);
        uint256 memberId = council.nominateMember(
            12345,
            legalEducationHash,
            "Criminal Law",
            1,
            address(0x8)
        );
        
        // Approve by 3 judges
        vm.prank(judge1);
        council.approveMember(memberId);
        
        vm.prank(judge2);
        council.approveMember(memberId);
        
        vm.prank(judge3);
        council.approveMember(memberId);
        
        CouncilOfJustice.Member memory member = council.getMember(memberId);
        assertTrue(member.approved);
        assertEq(member.approvals, 3);
        
        // Check if judge role was granted
        assertTrue(council.isJudge(address(0x8)));
    }
    
    function test_RevertDuplicateNomination() public {
        vm.prank(admin);
        council.nominateMember(12345, legalEducationHash, "Civil Law", 1, citizen);
        
        vm.expectRevert(CouncilOfJustice.AlreadyNominated.selector);
        vm.prank(admin);
        council.nominateMember(12345, legalEducationHash, "Criminal Law", 1, citizen);
    }
    
    function test_RevertDuplicateApproval() public {
        vm.prank(admin);
        uint256 memberId = council.nominateMember(
            12345,
            legalEducationHash,
            "Civil Law",
            1,
            citizen
        );
        
        vm.prank(judge1);
        council.approveMember(memberId);
        
        vm.expectRevert(CouncilOfJustice.AlreadyApproved.selector);
        vm.prank(judge1);
        council.approveMember(memberId);
    }
    
    // ============ Judicial Case Tests ============
    
    function test_FileCase() public {
        uint256 caseId = council.fileCase(
            11111,  // plaintiff
            22222,  // defendant
            caseHash,
            "Contract dispute",
            CouncilOfJustice.RulingType.CIVIL
        );
        
        assertEq(caseId, 1);
        
        CouncilOfJustice.JudicialCase memory judicialCase = council.getCase(caseId);
        assertEq(judicialCase.caseId, 1);
        assertEq(judicialCase.plaintiffSeatId, 11111);
        assertEq(judicialCase.defendantSeatId, 22222);
        assertEq(judicialCase.caseHash, caseHash);
        assertEq(uint(judicialCase.status), uint(CouncilOfJustice.CaseStatus.PENDING));
        assertEq(judicialCase.assignedJudge, address(0));
    }
    
    function test_AssignCase() public {
        // File case
        uint256 caseId = council.fileCase(
            11111,
            22222,
            caseHash,
            "Test case",
            CouncilOfJustice.RulingType.CIVIL
        );
        
        // Assign to judge
        vm.prank(clerk);
        council.assignCase(caseId, judge1);
        
        CouncilOfJustice.JudicialCase memory judicialCase = council.getCase(caseId);
        assertEq(judicialCase.assignedJudge, judge1);
        assertEq(uint(judicialCase.status), uint(CouncilOfJustice.CaseStatus.ASSIGNED));
    }
    
    function test_RuleOnCase() public {
        // File case
        uint256 caseId = council.fileCase(
            11111,
            22222,
            caseHash,
            "Test case",
            CouncilOfJustice.RulingType.CRIMINAL
        );
        
        // Assign to judge
        vm.prank(clerk);
        council.assignCase(caseId, judge1);
        
        // Judge rules
        vm.prank(judge1);
        council.ruleOnCase(caseId, rulingHash, "Guilty. 5 years imprisonment.");
        
        CouncilOfJustice.JudicialCase memory judicialCase = council.getCase(caseId);
        assertEq(judicialCase.rulingHash, rulingHash);
        assertEq(judicialCase.ruling, "Guilty. 5 years imprisonment.");
        assertEq(uint(judicialCase.status), uint(CouncilOfJustice.CaseStatus.RULED));
        assertTrue(judicialCase.ruledAt > 0);
    }
    
    function test_RevertAssignToNonJudge() public {
        uint256 caseId = council.fileCase(
            11111,
            22222,
            caseHash,
            "Test",
            CouncilOfJustice.RulingType.CIVIL
        );
        
        vm.expectRevert(CouncilOfJustice.NotFound.selector);
        vm.prank(clerk);
        council.assignCase(caseId, citizen);
    }
    
    function test_RevertRuleByWrongJudge() public {
        uint256 caseId = council.fileCase(
            11111,
            22222,
            caseHash,
            "Test",
            CouncilOfJustice.RulingType.CIVIL
        );
        
        vm.prank(clerk);
        council.assignCase(caseId, judge1);
        
        vm.expectRevert(CouncilOfJustice.NotAssignedJudge.selector);
        vm.prank(judge2);
        council.ruleOnCase(caseId, rulingHash, "Test ruling");
    }
    
    function test_RevertRuleOnUnassignedCase() public {
        uint256 caseId = council.fileCase(
            11111,
            22222,
            caseHash,
            "Test",
            CouncilOfJustice.RulingType.CIVIL
        );
        
        vm.expectRevert();
        vm.prank(judge1);
        council.ruleOnCase(caseId, rulingHash, "Test");
    }
    
    // ============ Legal Precedent Tests ============
    
    function test_RegisterPrecedent() public {
        // File and rule on case
        uint256 caseId = council.fileCase(
            11111,
            22222,
            caseHash,
            "Landmark case",
            CouncilOfJustice.RulingType.CIVIL
        );
        
        vm.prank(clerk);
        council.assignCase(caseId, judge1);
        
        vm.prank(judge1);
        council.ruleOnCase(caseId, rulingHash, "Important ruling");
        
        // Register precedent
        vm.prank(judge1);
        uint256 precedentId = council.registerPrecedent(
            caseId,
            precedentHash,
            "Contracts require good faith",
            "Good Faith Doctrine"
        );
        
        assertEq(precedentId, 1);
        
        CouncilOfJustice.LegalPrecedent memory precedent = council.getPrecedent(precedentId);
        assertEq(precedent.precedentId, 1);
        assertEq(precedent.sourceCaseId, caseId);
        assertEq(precedent.precedentHash, precedentHash);
        assertEq(precedent.summary, "Contracts require good faith");
        assertEq(precedent.legalPrinciple, "Good Faith Doctrine");
        assertEq(precedent.judge, judge1);
        assertFalse(precedent.archived);
    }
    
    function test_RevertRegisterPrecedentFromUnruledCase() public {
        uint256 caseId = council.fileCase(
            11111,
            22222,
            caseHash,
            "Test",
            CouncilOfJustice.RulingType.CIVIL
        );
        
        vm.expectRevert(CouncilOfJustice.InvalidStatus.selector);
        vm.prank(judge1);
        council.registerPrecedent(
            caseId,
            precedentHash,
            "Summary",
            "Principle"
        );
    }
    
    // ============ Integration Tests ============
    
    function test_Integration_FullMemberJourney() public {
        // 1. Nominate
        vm.prank(admin);
        uint256 memberId = council.nominateMember(
            99999,
            legalEducationHash,
            "Constitutional Law",
            1,
            address(0x9)
        );
        
        // 2. Approve by 3 judges
        vm.prank(judge1);
        council.approveMember(memberId);
        
        vm.prank(judge2);
        council.approveMember(memberId);
        
        vm.prank(judge3);
        council.approveMember(memberId);
        
        // 3. Verify member is approved and has judge role
        CouncilOfJustice.Member memory member = council.getMember(memberId);
        assertTrue(member.approved);
        assertTrue(council.isJudge(address(0x9)));
    }
    
    function test_Integration_FullCaseWorkflow() public {
        // 1. File case
        uint256 caseId = council.fileCase(
            11111,
            22222,
            caseHash,
            "Property dispute",
            CouncilOfJustice.RulingType.CIVIL
        );
        
        // 2. Assign to judge
        vm.prank(clerk);
        council.assignCase(caseId, judge1);
        
        // 3. Judge rules
        vm.prank(judge1);
        council.ruleOnCase(caseId, rulingHash, "Plaintiff wins. Defendant must pay damages.");
        
        // 4. Register precedent
        vm.prank(judge1);
        uint256 precedentId = council.registerPrecedent(
            caseId,
            precedentHash,
            "Property rights are paramount",
            "Property Rights Doctrine"
        );
        
        // 5. Verify complete workflow
        CouncilOfJustice.JudicialCase memory judicialCase = council.getCase(caseId);
        assertEq(uint(judicialCase.status), uint(CouncilOfJustice.CaseStatus.RULED));
        
        CouncilOfJustice.LegalPrecedent memory precedent = council.getPrecedent(precedentId);
        assertEq(precedent.sourceCaseId, caseId);
    }
}
