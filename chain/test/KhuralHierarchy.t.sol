// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/VotingCenter.sol";
import "../contracts/StatisticsBureau.sol";
import "../contracts/ArbanKhural.sol";
import "../contracts/ZunKhural.sol";
import "../contracts/MyangangKhural.sol";
import "../contracts/TumenKhural.sol";

/**
 * @title KhuralHierarchyTest
 * @notice Tests for complete Khural hierarchy: Arban → Zun → Myangan → Tumen
 */
contract KhuralHierarchyTest is Test {
    VotingCenter public votingCenter;
    StatisticsBureau public statisticsBureau;
    
    ArbanKhural public arban1;
    ArbanKhural public arban2;
    ZunKhural public zun1;
    MyangangKhural public myangan1;
    TumenKhural public tumen1;
    
    address public admin = address(0x1);
    address public temple = address(0x2);
    
    // Arban 1 representatives
    address public arban1_rep1 = address(0x101);
    address public arban1_rep2 = address(0x102);
    address public arban1_rep3 = address(0x103);
    
    // Arban 2 representatives
    address public arban2_rep1 = address(0x201);
    address public arban2_rep2 = address(0x202);
    
    // Delegates
    address public zunDelegate1 = address(0x101); // From Arban 1
    address public zunDelegate2 = address(0x201); // From Arban 2
    address public myangangDelegate1 = address(0x101); // From Zun
    address public tumenDelegate1 = address(0x101); // From Myangan
    
    function setUp() public {
        vm.startPrank(admin);
        
        // Deploy core
        statisticsBureau = new StatisticsBureau(admin, temple);
        votingCenter = new VotingCenter(admin, address(statisticsBureau));
        statisticsBureau.grantRole(statisticsBureau.VOTING_CENTER_ROLE(), address(votingCenter));
        
        // Deploy hierarchy
        arban1 = new ArbanKhural(admin, 1, "Arban 1", address(votingCenter));
        arban2 = new ArbanKhural(admin, 2, "Arban 2", address(votingCenter));
        zun1 = new ZunKhural(admin, 1, "Zun 1", address(votingCenter));
        myangan1 = new MyangangKhural(admin, 1, "Myangan 1", address(votingCenter));
        tumen1 = new TumenKhural(admin, 1, "Tumen 1", address(votingCenter));
        
       // Grant admin roles
        votingCenter.grantRole(votingCenter.DEFAULT_ADMIN_ROLE(), address(arban1));
        votingCenter.grantRole(votingCenter.DEFAULT_ADMIN_ROLE(), address(arban2));
        votingCenter.grantRole(votingCenter.DEFAULT_ADMIN_ROLE(), address(zun1));
        votingCenter.grantRole(votingCenter.DEFAULT_ADMIN_ROLE(), address(myangan1));
        votingCenter.grantRole(votingCenter.DEFAULT_ADMIN_ROLE(), address(tumen1));
        
        // Add Arban 1 representatives
        arban1.addRepresentative(arban1_rep1, 1);
        arban1.addRepresentative(arban1_rep2, 2);
        arban1.addRepresentative(arban1_rep3, 3);
        
        // Add Arban 2 representatives
        arban2.addRepresentative(arban2_rep1, 1);
        arban2.addRepresentative(arban2_rep2, 2);
        
        vm.stopPrank();
    }
    
    function test_ZunKhural_AddDelegates() public {
        vm.startPrank(admin);
        zun1.addDelegate(zunDelegate1, 1); // From Arban 1
        zun1.addDelegate(zunDelegate2, 2); // From Arban 2
        vm.stopPrank();
        
        assertEq(zun1.getDelegateCount(), 2);
        assertTrue(zun1.isDelegate(zunDelegate1));
        assertTrue(zun1.isDelegate(zunDelegate2));
    }
    
    function test_ZunKhural_CreateProposal() public {
        vm.prank(admin);
        zun1.addDelegate(zunDelegate1, 1);
        
        vm.prank(zunDelegate1);
        uint256 proposalId = votingCenter.createProposal(
            VotingCenter.ProposalType.ZUN_POLICY,
            2, // Zun level
            1, // zunId
            "Regional Education Policy",
            "Standardize curriculum across all Arbans",
            "",
            7 days
        );
        
        assertEq(proposalId, 1);
        
        VotingCenter.Proposal memory proposal = votingCenter.getProposal(1);
        assertEq(proposal.khuralLevel, 2);
        assertEq(uint(proposal.proposalType), uint(VotingCenter.ProposalType.ZUN_POLICY));
    }
    
    function test_ZunKhural_ElectMyangangDelegate() public {
        vm.prank(admin);
        zun1.addDelegate(zunDelegate1, 1);
        
        vm.prank(zunDelegate1);
        zun1.electMyangangDelegate(zunDelegate1);
        
        (,,, address delegate,) = zun1.getInfo();
        assertEq(delegate, zunDelegate1);
    }
    
    function test_MyangangKhural_AddDelegates() public {
        vm.startPrank(admin);
        myangan1.addDelegate(myangangDelegate1, 1); // From Zun 1
        vm.stopPrank();
        
        assertEq(myangan1.getDelegateCount(), 1);
        assertTrue(myangan1.isDelegate(myangangDelegate1));
    }
    
    function test_MyangangKhural_CreateProposal() public {
        vm.prank(admin);
        myangan1.addDelegate(myangangDelegate1, 1);
        
        vm.prank(myangangDelegate1);
        uint256 proposalId = votingCenter.createProposal(
            VotingCenter.ProposalType.MYANGAN_LAW,
            3, // Myangan level
            1, // myangangId
            "Provincial Tax Law",
            "Establish provincial tax rates",
            "",
            7 days
        );
        
        assertEq(proposalId, 1);
        
        VotingCenter.Proposal memory proposal = votingCenter.getProposal(1);
        assertEq(proposal.khuralLevel, 3);
        assertEq(uint(proposal.proposalType), uint(VotingCenter.ProposalType.MYANGAN_LAW));
        
        // Check quorum (70% for Myangan)
        (,,uint256 quorum,) = votingCenter.getProposalResults(proposalId);
        assertEq(quorum, 7);
    }
    
    function test_TumenKhural_AddDelegates() public {
        vm.startPrank(admin);
        tumen1.addDelegate(tumenDelegate1, 1); // From Myangan 1
        vm.stopPrank();
        
        assertEq(tumen1.getDelegateCount(), 1);
        assertTrue(tumen1.isDelegate(tumenDelegate1));
    }
    
    function test_TumenKhural_CreateNationalProposal() public {
        vm.prank(admin);
        tumen1.addDelegate(tumenDelegate1, 1);
        
        vm.prank(tumenDelegate1);
        uint256 proposalId = votingCenter.createProposal(
            VotingCenter.ProposalType.TUMEN_NATIONAL,
            4, // Tumen (national) level
            1, // tumenId
            "National Defense Act",
            "Establish national defense policy",
            "",
            14 days // Longer period for national laws
        );
        
        assertEq(proposalId, 1);
        
        VotingCenter.Proposal memory proposal = votingCenter.getProposal(1);
        assertEq(proposal.khuralLevel, 4);
        assertEq(uint(proposal.proposalType), uint(VotingCenter.ProposalType.TUMEN_NATIONAL));
        
        // Check quorum (80% for Tumen)
        (,,uint256 quorum,) = votingCenter.getProposalResults(proposalId);
        assertEq(quorum, 8);
    }
    
    function test_TumenKhural_ConstitutionalAmendment() public {
        vm.prank(admin);
        tumen1.addDelegate(tumenDelegate1, 1);
        
        vm.prank(tumenDelegate1);
        uint256 proposalId = votingCenter.createProposal(
            VotingCenter.ProposalType.CONSTITUTIONAL,
            4, // Tumen level
            1,
            "Constitutional Amendment: Voting Rights",
            "Extend voting rights to 16+",
            "",
            30 days // Longest period for constitution
        );
        
        VotingCenter.Proposal memory proposal = votingCenter.getProposal(1);
        assertEq(uint(proposal.proposalType), uint(VotingCenter.ProposalType.CONSTITUTIONAL));
    }
    
    function test_TumenKhural_ElectChairman() public {
        vm.prank(admin);
        tumen1.addDelegate(tumenDelegate1, 1);
        
        vm.prank(tumenDelegate1);
        tumen1.electChairman(tumenDelegate1);
        
        (,,,address chairman,) = tumen1.getInfo();
        assertEq(chairman, tumenDelegate1);
    }
    
    function test_DelegationFlow_ArbanToTumen() public {
        vm.startPrank(admin);
        
        // Setup delegation chain
        zun1.addDelegate(zunDelegate1, 1);
        myangan1.addDelegate(myangangDelegate1, 1);
        tumen1.addDelegate(tumenDelegate1, 1);
        
        vm.stopPrank();
        
        // Verify chain exists
        assertTrue(arban1.isRepresentative(arban1_rep1));
        assertTrue(zun1.isDelegate(zunDelegate1));
        assertTrue(myangan1.isDelegate(myangangDelegate1));
        assertTrue(tumen1.isDelegate(tumenDelegate1));
        
        // Same person at all levels (arban1_rep1)
        assertEq(zunDelegate1, arban1_rep1);
        assertEq(myangangDelegate1, arban1_rep1);
        assertEq(tumenDelegate1, arban1_rep1);
    }
    
    function test_QuorumEscalation() public {
        vm.startPrank(admin);
        zun1.addDelegate(zunDelegate1, 1);
        myangan1.addDelegate(myangangDelegate1, 1);
        tumen1.addDelegate(tumenDelegate1, 1);
        vm.stopPrank();
        
        // Create proposals at each level
        vm.prank(arban1_rep1);
        uint256 arbanProposal = votingCenter.createProposal(
            VotingCenter.ProposalType.ARBAN_BUDGET,
            1, 1, "Arban", "Desc", "", 7 days
        );
        
        vm.prank(zunDelegate1);
        uint256 zunProposal = votingCenter.createProposal(
            VotingCenter.ProposalType.ZUN_POLICY,
            2, 1, "Zun", "Desc", "", 7 days
        );
        
        vm.prank(myangangDelegate1);
        uint256 myangangProposal = votingCenter.createProposal(
            VotingCenter.ProposalType.MYANGAN_LAW,
            3, 1, "Myangan", "Desc", "", 7 days
        );
        
        vm.prank(tumenDelegate1);
        uint256 tumenProposal = votingCenter.createProposal(
            VotingCenter.ProposalType.TUMEN_NATIONAL,
            4, 1, "Tumen", "Desc", "", 7 days
        );
        
        // Check quorum escalation
        (,,uint256 quorum1,) = votingCenter.getProposalResults(arbanProposal);
        (,,uint256 quorum2,) = votingCenter.getProposalResults(zunProposal);
        (,,uint256 quorum3,) = votingCenter.getProposalResults(myangangProposal);
        (,,uint256 quorum4,) = votingCenter.getProposalResults(tumenProposal);
        
        assertEq(quorum1, 6); // 60%
        assertEq(quorum2, 6); // 60%
        assertEq(quorum3, 7); // 70%
        assertEq(quorum4, 8); // 80%
    }
    
    function test_StatisticsBureau_TracksAllLevels() public {
        vm.startPrank(admin);
        zun1.addDelegate(zunDelegate1, 1);
        myangan1.addDelegate(myangangDelegate1, 1);
        tumen1.addDelegate(tumenDelegate1, 1);
        vm.stopPrank();
        
        // Create proposals at all levels
        vm.prank(arban1_rep1);
        votingCenter.createProposal(
            VotingCenter.ProposalType.ARBAN_BUDGET,
            1, 1, "Arban", "Desc", "", 7 days
        );
        
        vm.prank(zunDelegate1);
        votingCenter.createProposal(
            VotingCenter.ProposalType.ZUN_POLICY,
            2, 1, "Zun", "Desc", "", 7 days
        );
        
        vm.prank(myangangDelegate1);
        votingCenter.createProposal(
            VotingCenter.ProposalType.MYANGAN_LAW,
            3, 1, "Myangan", "Desc", "", 7 days
        );
        
        vm.prank(tumenDelegate1);
        votingCenter.createProposal(
            VotingCenter.ProposalType.TUMEN_NATIONAL,
            4, 1, "Tumen", "Desc", "", 7 days
        );
        
        // Check statistics
        assertEq(statisticsBureau.getStats(1).totalProposals, 1);
        assertEq(statisticsBureau.getStats(2).totalProposals, 1);
        assertEq(statisticsBureau.getStats(3).totalProposals, 1);
        assertEq(statisticsBureau.getStats(4).totalProposals, 1);
    }
    
    function test_CannotExceed10DelegatesPerLevel() public {
        vm.startPrank(admin);
        
        // Try to add 11 delegates to Zun
        for (uint256 i = 0; i < 10; i++) {
            zun1.addDelegate(address(uint160(0x1000 + i)), i + 1);
        }
        
        // 11th should fail
        vm.expectRevert("Max 10 delegates");
        zun1.addDelegate(address(0x9999), 11);
        
        vm.stopPrank();
    }
}
