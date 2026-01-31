// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/AcademyOfSciences.sol";

contract AcademyOfSciencesTest is Test {
    AcademyOfSciences public academy;
    
    address public admin = address(0x1);
    address public scientistCouncil = address(0x2);
    address public temple = address(0x3);
    address public treasury = address(0x4);
    address public scientist1 = address(0x5);
    address public scientist2 = address(0x6);
    address public reviewer = address(0x7);
    address public treasurer = address(0x8);
    
    bytes32 public patentHash = keccak256("patent_document");
    bytes32 public discoveryHash = keccak256("discovery_document");
    
    function setUp() public {
        // Deploy contract (test contract is deployer/admin)
        academy = new AcademyOfSciences(scientistCouncil, temple, treasury);
        
        // Grant roles
        academy.grantRole(academy.SCIENTIST_ROLE(), scientist1);
        academy.grantRole(academy.SCIENTIST_ROLE(), scientist2);
        academy.grantRole(academy.REVIEWER_ROLE(), reviewer);
        academy.grantRole(academy.TREASURER_ROLE(), treasurer);
        
        // Fund the academy
        vm.deal(address(academy), 100 ether);
    }
    
    // ============ Patent Tests ============
    
    function test_SubmitPatent() public {
        vm.prank(scientist1);
        uint256 patentId = academy.submitPatent(
            patentHash,
            "Revolutionary Physics Discovery",
            "Physics",
            12345
        );
        
        assertEq(patentId, 1);
        
        AcademyOfSciences.Patent memory patent = academy.getPatent(patentId);
        assertEq(patent.patentId, 1);
        assertEq(patent.submitterSeatId, 12345);
        assertEq(patent.patentHash, patentHash);
        assertEq(patent.title, "Revolutionary Physics Discovery");
        assertEq(patent.field, "Physics");
        assertEq(uint(patent.status), uint(AcademyOfSciences.PatentStatus.PENDING));
    }
    
    function test_ReviewPatent_Approve() public {
        // Submit patent
        vm.prank(scientist1);
        uint256 patentId = academy.submitPatent(
            patentHash,
            "Test Patent",
            "Biology",
            12345
        );
        
        // Review and approve
        vm.prank(reviewer);
        academy.reviewPatent(patentId, true, "Excellent work!");
        
        AcademyOfSciences.Patent memory patent = academy.getPatent(patentId);
        assertEq(uint(patent.status), uint(AcademyOfSciences.PatentStatus.APPROVED));
        assertEq(patent.reviewer, reviewer);
        assertEq(patent.reviewNotes, "Excellent work!");
    }
    
    function test_ReviewPatent_Reject() public {
        vm.prank(scientist1);
        uint256 patentId = academy.submitPatent(
            patentHash,
            "Test Patent",
            "Chemistry",
            12345
        );
        
        vm.prank(reviewer);
        academy.reviewPatent(patentId, false, "Needs more research");
        
        AcademyOfSciences.Patent memory patent = academy.getPatent(patentId);
        assertEq(uint(patent.status), uint(AcademyOfSciences.PatentStatus.REJECTED));
    }
    
    function test_RevertNonScientistSubmitPatent() public {
        vm.expectRevert();
        academy.submitPatent(patentHash, "Test", "Physics", 12345);
    }
    
    function test_RevertNonReviewerReviewPatent() public {
        vm.prank(scientist1);
        uint256 patentId = academy.submitPatent(
            patentHash,
            "Test",
            "Physics",
            12345
        );
        
        vm.expectRevert();
        vm.prank(scientist2);
        academy.reviewPatent(patentId, true, "test");
    }
    
    // ============ Discovery Tests ============
    
    function test_RegisterDiscovery() public {
        vm.prank(scientist1);
        uint256 discoveryId = academy.registerDiscovery(
            discoveryHash,
            "Quantum Breakthrough",
            "Major advancement in quantum computing",
            54321
        );
        
        assertEq(discoveryId, 1);
        
        AcademyOfSciences.Discovery memory discovery = academy.getDiscovery(discoveryId);
        assertEq(discovery.discoveryId, 1);
        assertEq(discovery.scientistSeatId, 54321);
        assertEq(discovery.discoveryHash, discoveryHash);
        assertEq(discovery.title, "Quantum Breakthrough");
        assertEq(discovery.peerReviews, 0);
        assertFalse(discovery.archived);
    }
    
    function test_PeerReviewDiscovery() public {
        // Register discovery
        vm.prank(scientist1);
        uint256 discoveryId = academy.registerDiscovery(
            discoveryHash,
            "Test Discovery",
            "Description",
            54321
        );
        
        // Peer review by scientist2
        vm.prank(scientist2);
        academy.peerReviewDiscovery(discoveryId);
        
        AcademyOfSciences.Discovery memory discovery = academy.getDiscovery(discoveryId);
        assertEq(discovery.peerReviews, 1);
    }
    
    function test_MultiplePeerReviews() public {
        vm.prank(scientist1);
        uint256 discoveryId = academy.registerDiscovery(
            discoveryHash,
            "Test",
            "Desc",
            54321
        );
        
        // First review
        vm.prank(scientist2);
        academy.peerReviewDiscovery(discoveryId);
        
        // Second review by another scientist (need to grant role to admin)
        academy.grantRole(academy.SCIENTIST_ROLE(), admin);
        vm.prank(admin);
        academy.peerReviewDiscovery(discoveryId);
        
        AcademyOfSciences.Discovery memory discovery = academy.getDiscovery(discoveryId);
        assertEq(discovery.peerReviews, 2);
        
        // Check if has minimum reviews
        assertTrue(academy.hasMinimumReviews(discoveryId));
    }
    
    function test_RevertDuplicatePeerReview() public {
        vm.prank(scientist1);
        uint256 discoveryId = academy.registerDiscovery(
            discoveryHash,
            "Test",
            "Desc",
            54321
        );
        
        vm.prank(scientist2);
        academy.peerReviewDiscovery(discoveryId);
        
        // Try to review again
        vm.expectRevert(AcademyOfSciences.AlreadyReviewed.selector);
        vm.prank(scientist2);
        academy.peerReviewDiscovery(discoveryId);
    }
    
    // ============ Grant Tests ============
    
    function test_RequestGrant() public {
        vm.prank(scientist1);
        uint256 grantId = academy.requestGrant(
            "AI Research Project",
            "Developing advanced AI algorithms",
            5 ether,
            12345
        );
        
        assertEq(grantId, 1);
        
        AcademyOfSciences.ResearchGrant memory grant = academy.getGrant(grantId);
        assertEq(grant.grantId, 1);
        assertEq(grant.scientistSeatId, 12345);
        assertEq(grant.projectTitle, "AI Research Project");
        assertEq(grant.requestedAmount, 5 ether);
        assertEq(grant.approvedAmount, 0);
        assertEq(uint(grant.status), uint(AcademyOfSciences.GrantStatus.REQUESTED));
    }
    
    function test_ApproveGrant() public {
        // Request grant
        vm.prank(scientist1);
        uint256 grantId = academy.requestGrant(
            "Test Project",
            "Description",
            10 ether,
            12345
        );
        
        // Approve grant (partial amount)
        vm.prank(reviewer);
        academy.approveGrant(grantId, 7 ether);
        
        AcademyOfSciences.ResearchGrant memory grant = academy.getGrant(grantId);
        assertEq(grant.approvedAmount, 7 ether);
        assertEq(uint(grant.status), uint(AcademyOfSciences.GrantStatus.APPROVED));
    }
    
    function test_DisburseGrant() public {
        // Request grant
        vm.prank(scientist1);
        uint256 grantId = academy.requestGrant(
            "Test",
            "Desc",
            5 ether,
            12345
        );
        
        // Approve
        vm.prank(reviewer);
        academy.approveGrant(grantId, 5 ether);
        
        // Disburse
        vm.prank(treasurer);
        academy.disburseGrant(grantId);
        
        AcademyOfSciences.ResearchGrant memory grant = academy.getGrant(grantId);
        assertEq(uint(grant.status), uint(AcademyOfSciences.GrantStatus.DISBURSED));
        assertTrue(grant.disbursedAt > 0);
    }
    
    function test_RevertDisburseUnapprovedGrant() public {
        vm.prank(scientist1);
        uint256 grantId = academy.requestGrant(
            "Test",
            "Desc",
            5 ether,
            12345
        );
        
        // Try to disburse without approval
        vm.expectRevert(AcademyOfSciences.InvalidStatus.selector);
        vm.prank(treasurer);
        academy.disburseGrant(grantId);
    }
    
    function test_RevertDisburseInsufficientFunds() public {
        // Deploy new academy with 0 balance
        AcademyOfSciences newAcademy = new AcademyOfSciences(
            scientistCouncil,
            temple,
            treasury
        );
        
        newAcademy.grantRole(newAcademy.SCIENTIST_ROLE(), scientist1);
        newAcademy.grantRole(newAcademy.REVIEWER_ROLE(), reviewer);
        newAcademy.grantRole(newAcademy.TREASURER_ROLE(), treasurer);
        
        vm.prank(scientist1);
        uint256 grantId = newAcademy.requestGrant(
            "Test",
            "Desc",
            5 ether,
            12345
        );
        
        vm.prank(reviewer);
        newAcademy.approveGrant(grantId, 5 ether);
        
        vm.expectRevert(AcademyOfSciences.InsufficientFunds.selector);
        vm.prank(treasurer);
        newAcademy.disburseGrant(grantId);
    }
    
    // ============ Integration Tests ============
    
    function test_Integration_FullPatentWorkflow() public {
        // 1. Submit patent
        vm.prank(scientist1);
        uint256 patentId = academy.submitPatent(
            patentHash,
            "Full Workflow Patent",
            "Computer Science",
            12345
        );
        
        // 2. Review and approve
        vm.prank(reviewer);
        academy.reviewPatent(patentId, true, "Approved for publication");
        
        // 3. Verify final state
        AcademyOfSciences.Patent memory patent = academy.getPatent(patentId);
        assertEq(uint(patent.status), uint(AcademyOfSciences.PatentStatus.APPROVED));
        assertTrue(patent.reviewedAt > 0);
    }
    
    function test_Integration_DiscoveryWithPeerReview() public {
        // 1. Register discovery
        vm.prank(scientist1);
        uint256 discoveryId = academy.registerDiscovery(
            discoveryHash,
            "Major Discovery",
            "Breakthrough in medicine",
            54321
        );
        
        // 2. Multiple peer reviews
        vm.prank(scientist2);
        academy.peerReviewDiscovery(discoveryId);
        
        academy.grantRole(academy.SCIENTIST_ROLE(), admin);
        vm.prank(admin);
        academy.peerReviewDiscovery(discoveryId);
        
        // 3. Verify minimum reviews reached
        assertTrue(academy.hasMinimumReviews(discoveryId));
    }
    
    function test_Integration_GrantFullCycle() public {
        // 1. Request grant
        vm.prank(scientist1);
        uint256 grantId = academy.requestGrant(
            "Full Cycle Project",
            "Complete research project",
            10 ether,
            12345
        );
        
        // 2. Approve grant
        vm.prank(reviewer);
        academy.approveGrant(grantId, 8 ether);
        
        // 3. Disburse funds
        vm.prank(treasurer);
        academy.disburseGrant(grantId);
        
        // 4. Verify complete cycle
        AcademyOfSciences.ResearchGrant memory grant = academy.getGrant(grantId);
        assertEq(uint(grant.status), uint(AcademyOfSciences.GrantStatus.DISBURSED));
        assertEq(grant.approvedAmount, 8 ether);
    }
}
