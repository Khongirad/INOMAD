// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Ulas} from "../contracts/Ulas.sol";
import {UlasRegistry} from "../contracts/UlasRegistry.sol";
import {GovernanceTumen} from "../contracts/GovernanceTumen.sol";
import {GovernanceTumenRegistry} from "../contracts/GovernanceTumenRegistry.sol";
import {ConfederativeKhural} from "../contracts/ConfederativeKhural.sol";

/**
 * @title GovernanceIntegrationTest
 * @notice Test full governance hierarchy: GovernanceTumen → Ulas → Khural
 */
contract GovernanceIntegrationTest is Test {
    
    // Registries
    GovernanceTumenRegistry tumenRegistry;
    UlasRegistry ulasRegistry;
    ConfederativeKhural khural;
    
    // Test units
    GovernanceTumen tumen1;
    GovernanceTumen tumen2;
    Ulas ulas;
    
    // Test addresses
    address owner = address(this);
    address myangan1 = address(0x1);
    address myangan2 = address(0x2);
    address myangan3 = address(0x3);
    address myangan4 = address(0x4);
    address myangan5 = address(0x5);
    address myangan6 = address(0x6);
    address myangan7 = address(0x7);
    address myangan8 = address(0x8);
    address myangan9 = address(0x9);
    address myangan10 = address(0xA);
    
    function setUp() public {
        // Deploy registries
        tumenRegistry = new GovernanceTumenRegistry();
        ulasRegistry = new UlasRegistry();
        khural = new ConfederativeKhural(address(ulasRegistry));
        
        // Create Ulas
        (uint256 ulasId, address ulasAddr) = ulasRegistry.createUlas("Ulus #1");
        ulas = Ulas(ulasAddr);
        
        // Create GovernanceTumens
        tumen1 = new GovernanceTumen(1, "Tumen #1", address(ulas));
        tumen2 = new GovernanceTumen(2, "Tumen #2", address(ulas));
        
        // Register Tumens
        tumenRegistry.registerTumen(address(tumen1), "Tumen #1");
        tumenRegistry.registerTumen(address(tumen2), "Tumen #2");
        
        // Register Tumens in Ulas
        ulas.registerTumen(address(tumen1));
        ulas.registerTumen(address(tumen2));
    }
    
    function testTumenCouncilElection() public {
        // Add Myangans to Tumen1 council
        tumen1.addMyanganToCouncil(1, myangan1);
        tumen1.addMyanganToCouncil(2, myangan2);
        tumen1.addMyanganToCouncil(3, myangan3);
        tumen1.addMyanganToCouncil(4, myangan4);
        tumen1.addMyanganToCouncil(5, myangan5);
        tumen1.addMyanganToCouncil(6, myangan6);
        
        // Check council
        assertTrue(tumen1.isCouncilMember(myangan1));
        assertEq(tumen1.activeMemberCount(), 6);
        
        // Vote for leader
        vm.prank(myangan1);
        tumen1.voteForLeader(myangan1);
        
        vm.prank(myangan2);
        tumen1.voteForLeader(myangan1);
        
        vm.prank(myangan3);
        tumen1.voteForLeader(myangan1);
        
        vm.prank(myangan4);
        tumen1.voteForLeader(myangan1);
        
        vm.prank(myangan5);
        tumen1.voteForLeader(myangan1);
        
        vm.prank(myangan6);
        tumen1.voteForLeader(myangan1);
        
        // Check leader elected
        assertEq(tumen1.leader(), myangan1);
    }
    
    function testUlasCandidateRegistration() public {
        // Setup Tumen1 with leader
        testTumenCouncilElection();
        
        // Leader registers for Ulas council
        vm.prank(myangan1);
        tumen1.registerForUlasCouncil();
        
        // Check registered
        assertTrue(ulas.isCandidate(myangan1));
    }
    
    function testUlasTop10Election() public {
        // Create 15 Tumen candidates
        address[] memory candidates = new address[](15);
        for (uint256 i = 0; i < 15; i++) {
            candidates[i] = address(uint160(0x100 + i));
            
            // Register as candidate
            vm.prank(candidates[i]);
            ulas.registerAsCandidate();
        }
        
        // Register voters (Tumens)
        for (uint256 i = 0; i < 15; i++) {
            address voter = address(uint160(0x200 + i));
            ulas.registerTumen(voter);
            
            // Vote for candidate (first 10 get most votes)
            vm.prank(voter);
            if (i < 10) {
                ulas.voteForCouncilCandidate(candidates[i]);
            } else {
                ulas.voteForCouncilCandidate(candidates[10]);
            }
        }
        
        // Finalize election
        ulas.finalizeCouncilElection();
        
        // Check top 10
        address[10] memory council = ulas.getCouncil();
        assertTrue(ulas.isCouncilMember(candidates[0]));
        assertEq(ulas.activeMemberCount(), 10);
    }
    
    function testUlasChairmanElection() public {
        // Setup Ulas council
        testUlasTop10Election();
        
        address[10] memory council = ulas.getCouncil();
        address candidate = council[0];
        
        // Council votes for chairman
        for (uint256 i = 0; i < 6; i++) {
            vm.prank(council[i]);
            ulas.voteForChairman(candidate);
        }
        
        // Check chairman elected
        assertEq(ulas.chairman(), candidate);
    }
    
    function testKhuralProposal() public {
        // Add representative
        address rep = address(0x1000);
        khural.addRepresentative(rep);
        
        // Create proposal
        vm.prank(rep);
        uint256 proposalId = khural.createProposal(
            ConfederativeKhural.ProposalType.LAW,
            "Test Law",
            bytes32(uint256(1))
        );
        
        // Check proposal
        (
            uint256 id,
            ConfederativeKhural.ProposalType pType,
            ConfederativeKhural.ProposalStatus status,
            ,,,,,,,
        ) = khural.getProposal(proposalId);
        
        assertEq(id, proposalId);
        assertEq(uint256(pType), uint256(ConfederativeKhural.ProposalType.LAW));
        assertEq(uint256(status), uint256(ConfederativeKhural.ProposalStatus.ACTIVE));
    }
    
    function testFullHierarchyIntegration() public {
        // 1. Elect Tumen leader
        testTumenCouncilElection();
        address tumenLeader = tumen1.leader();
        assertEq(tumenLeader, myangan1);
        
        // 2. Register for Ulas
        vm.prank(tumenLeader);
        tumen1.registerForUlasCouncil();
        assertTrue(ulas.isCandidate(tumenLeader));
        
        // 3. Simulate Ulas election (would need more setup)
        // 4. Ulas chairman becomes Khural representative
        // 5. Khural creates and votes on proposals
    }
}
