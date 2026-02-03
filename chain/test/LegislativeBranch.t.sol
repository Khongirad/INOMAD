// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/VotingCenter.sol";
import "../contracts/StatisticsBureau.sol";
import "../contracts/ArbanKhural.sol";

/**
 * @title LegislativeBranchTest
 * @notice Comprehensive tests for Legislative Branch (Khural) system
 */
contract LegislativeBranchTest is Test {
    VotingCenter public votingCenter;
    StatisticsBureau public statisticsBureau;
    ArbanKhural public arbanKhural;
    
    address public admin = address(0x1);
    address public temple = address(0x2);
    address public rep1 = address(0x101);
    address public rep2 = address(0x102);
    address public rep3 = address(0x103);
    address public rep4 = address(0x104);
    address public rep5 = address(0x105);
    address public rep6 = address(0x106);
    
    function setUp() public {
        vm.startPrank(admin);
        
        // Deploy StatisticsBureau first
        statisticsBureau = new StatisticsBureau(admin, temple);
        
        // Deploy VotingCenter
        votingCenter = new VotingCenter(admin, address(statisticsBureau));
        
        // Grant VOTING_CENTER_ROLE to VotingCenter in StatisticsBureau
        statisticsBureau.grantRole(statisticsBureau.VOTING_CENTER_ROLE(), address(votingCenter));
        
        // Deploy ArbanKhural
        arbanKhural = new ArbanKhural(admin, 1, "Test Arban", address(votingCenter));
        
        // Grant ArbanKhural admin role in VotingCenter so it can manage KHURAL_ROLE
        votingCenter.grantRole(votingCenter.DEFAULT_ADMIN_ROLE(), address(arbanKhural));
        
        // Add representatives
        arbanKhural.addRepresentative(rep1, 1);
        arbanKhural.addRepresentative(rep2, 2);
        arbanKhural.addRepresentative(rep3, 3);
        
        vm.stopPrank();
    }
    
    function test_CreateProposal() public {
        vm.prank(rep1);
        uint256 proposalId = votingCenter.createProposal(
            VotingCenter.ProposalType.ARBAN_BUDGET,
            1, // Arban level
            1, // arbanId
            "Allocate 1000 ALTAN for school",
            "We need funds for new school building",
            "",
            7 days
        );
        
        assertEq(proposalId, 1);
        
        VotingCenter.Proposal memory proposal =votingCenter.getProposal(1);
        assertEq(uint(proposal.proposalType), uint(VotingCenter.ProposalType.ARBAN_BUDGET));
        assertEq(proposal.khuralLevel, 1);
        assertEq(proposal.proposer, rep1);
        assertEq(uint(proposal.status), uint(VotingCenter.ProposalStatus.ACTIVE));
    }
    
    function test_VoteOnProposal() public {
        // Create proposal
        vm.prank(rep1);
        uint256 proposalId = votingCenter.createProposal(
            VotingCenter.ProposalType.ARBAN_BUDGET,
            1, 1,
            "Test Proposal",
            "Description",
            "",
            7 days
        );
        
        // Vote yes
        vm.prank(rep1);
        votingCenter.vote(proposalId, true, "I support this");
        
        // Vote no
        vm.prank(rep2);
        votingCenter.vote(proposalId, false, "I oppose this");
        
        // Check votes
        (uint256 votesFor, uint256 votesAgainst,,) = votingCenter.getProposalResults(proposalId);
        assertEq(votesFor, 1);
        assertEq(votesAgainst, 1);
        
        // Check if voted
        assertTrue(votingCenter.hasVoted(proposalId, rep1));
        assertTrue(votingCenter.hasVoted(proposalId, rep2));
        assertFalse(votingCenter.hasVoted(proposalId, rep3));
    }
    
    function test_CannotVoteTwice() public {
        vm.prank(rep1);
        uint256 proposalId = votingCenter.createProposal(
            VotingCenter.ProposalType.ARBAN_BUDGET,
            1, 1,
            "Test",
            "Desc",
            "",
            7 days
        );
        
        vm.prank(rep1);
        votingCenter.vote(proposalId, true, "");
        
        // Try to vote again - should fail
        vm.prank(rep1);
        vm.expectRevert("Already voted");
        votingCenter.vote(proposalId, true, "");
    }
    
    function test_FinalizeProposal_Passed() public {
        // Add more representatives
        vm.startPrank(admin);
        arbanKhural.addRepresentative(rep4, 4);
        arbanKhural.addRepresentative(rep5, 5);
        arbanKhural.addRepresentative(rep6, 6);
        vm.stopPrank();
        
        // Create proposal
        vm.prank(rep1);
        uint256 proposalId = votingCenter.createProposal(
            VotingCenter.ProposalType.ARBAN_BUDGET,
            1, 1,
            "Test",
            "Desc",
            "",
            7 days
        );
        
        // Get 6 votes for (quorum is 6)
        vm.prank(rep1);
        votingCenter.vote(proposalId, true, "");
        vm.prank(rep2);
        votingCenter.vote(proposalId, true, "");
        vm.prank(rep3);
        votingCenter.vote(proposalId, true, "");
        vm.prank(rep4);
        votingCenter.vote(proposalId, true, "");
        vm.prank(rep5);
        votingCenter.vote(proposalId, true, "");
        vm.prank(rep6);
        votingCenter.vote(proposalId, true, "");
        
        // Fast forward past voting period
        vm.warp(block.timestamp + 8 days);
        
        // Finalize
        votingCenter.finalizeProposal(proposalId);
        
        VotingCenter.Proposal memory proposal = votingCenter.getProposal(proposalId);
        assertEq(uint(proposal.status), uint(VotingCenter.ProposalStatus.PASSED));
    }
    
    function test_FinalizeProposal_Rejected_NoQuorum() public {
        vm.prank(rep1);
        uint256 proposalId = votingCenter.createProposal(
            VotingCenter.ProposalType.ARBAN_BUDGET,
            1, 1,
            "Test",
            "Desc",
            "",
            7 days
        );
        
        // Only 2 votes (quorum is 6)
        vm.prank(rep1);
        votingCenter.vote(proposalId, true, "");
        vm.prank(rep2);
        votingCenter.vote(proposalId, true, "");
        
        vm.warp(block.timestamp + 8 days);
        votingCenter.finalizeProposal(proposalId);
        
        VotingCenter.Proposal memory proposal = votingCenter.getProposal(proposalId);
        assertEq(uint(proposal.status), uint(VotingCenter.ProposalStatus.REJECTED));
    }
    
    function test_FinalizeProposal_Rejected_NoMajority() public {
        vm.startPrank(admin);
        arbanKhural.addRepresentative(rep4, 4);
        arbanKhural.addRepresentative(rep5, 5);
        arbanKhural.addRepresentative(rep6, 6);
        vm.stopPrank();
        
        vm.prank(rep1);
        uint256 proposalId = votingCenter.createProposal(
            VotingCenter.ProposalType.ARBAN_BUDGET,
            1, 1,
            "Test",
            "Desc",
            "",
            7 days
        );
        
        // 3 for, 3 against
        vm.prank(rep1);
        votingCenter.vote(proposalId, true, "");
        vm.prank(rep2);
        votingCenter.vote(proposalId, true, "");
        vm.prank(rep3);
        votingCenter.vote(proposalId, true, "");
        vm.prank(rep4);
        votingCenter.vote(proposalId, false, "");
        vm.prank(rep5);
        votingCenter.vote(proposalId, false, "");
        vm.prank(rep6);
        votingCenter.vote(proposalId, false, "");
        
        vm.warp(block.timestamp + 8 days);
        votingCenter.finalizeProposal(proposalId);
        
        VotingCenter.Proposal memory proposal = votingCenter.getProposal(proposalId);
        assertEq(uint(proposal.status), uint(VotingCenter.ProposalStatus.REJECTED));
    }
    
    function test_StatisticsBureau_RecordsProposal() public {
        vm.prank(rep1);
        votingCenter.createProposal(
            VotingCenter.ProposalType.ARBAN_BUDGET,
            1, 1,
            "Test",
            "Desc",
            "",
            7 days
        );
        
        StatisticsBureau.VotingStats memory stats = statisticsBureau.getStats(1);
        assertEq(stats.totalProposals, 1);
        assertEq(stats.activeProposals, 1);
    }
    
    function test_StatisticsBureau_RecordsVotes() public {
        vm.prank(rep1);
        uint256 proposalId = votingCenter.createProposal(
            VotingCenter.ProposalType.ARBAN_BUDGET,
            1, 1,
            "Test",
            "Desc",
            "",
            7 days
        );
        
        vm.prank(rep1);
        votingCenter.vote(proposalId, true, "");
        
        vm.prank(rep2);
        votingCenter.vote(proposalId, false, "");
        
        StatisticsBureau.VotingStats memory stats = statisticsBureau.getStats(1);
        assertEq(stats.totalVotes, 2);
        
        assertEq(statisticsBureau.getVoterActivity(rep1), 1);
        assertEq(statisticsBureau.getVoterActivity(rep2), 1);
    }
    
    function test_ArbanKhural_AddRepresentatives() public {
        assertEq(arbanKhural.getRepresentativeCount(), 3);
        
        vm.prank(admin);
        arbanKhural.addRepresentative(rep4, 4);
        
        assertEq(arbanKhural.getRepresentativeCount(), 4);
        assertTrue(arbanKhural.isRepresentative(rep4));
    }
    
    function test_ArbanKhural_CannotExceed10Reps() public {
        vm.startPrank(admin);
        arbanKhural.addRepresentative(rep4, 4);
        arbanKhural.addRepresentative(rep5, 5);
        arbanKhural.addRepresentative(rep6, 6);
        arbanKhural.addRepresentative(address(0x107), 7);
        arbanKhural.addRepresentative(address(0x108), 8);
        arbanKhural.addRepresentative(address(0x109), 9);
        arbanKhural.addRepresentative(address(0x110), 10);
        
        // Try to add 11th - should fail
        vm.expectRevert("Max 10 representatives");
        arbanKhural.addRepresentative(address(0x111), 11);
        vm.stopPrank();
    }
    
    function test_ArbanKhural_ElectZunDelegate() public {
        vm.prank(rep1);
        arbanKhural.electZunDelegate(rep2);
        
        (,,,address delegate,) = arbanKhural.getInfo();
        assertEq(delegate, rep2);
    }
    
    function test_CensusUpdate() public {
        vm.prank(admin);
        statisticsBureau.updateCensus(
            10000,  // citizens
            5000,   // families
            500,    // arbans
            50,     // zuns
            5,      // myangans
            1       // tumens
        );
        
        StatisticsBureau.CensusData memory census = statisticsBureau.getCensus();
        assertEq(census.totalCitizens, 10000);
        assertEq(census.totalFamilies, 5000);
        assertEq(census.totalArbans, 500);
    }
    
    function test_QuorumCalculation() public {
        // Level 1 (Arban): 60%
        vm.prank(rep1);
        uint256 proposalId1 = votingCenter.createProposal(
            VotingCenter.ProposalType.ARBAN_BUDGET,
            1, 1,
            "Test",
            "Desc",
            "",
            7 days
        );
        
        (,,uint256 quorum1,) = votingCenter.getProposalResults(proposalId1);
        assertEq(quorum1, 6); // 6 out of 10
    }
}
