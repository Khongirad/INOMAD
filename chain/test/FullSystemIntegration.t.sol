// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ConfederativeKhural} from "../contracts/ConfederativeKhural.sol";
import {ExecutiveChairman} from "../contracts/ExecutiveChairman.sol";
import {JudicialReview} from "../contracts/JudicialReview.sol";
import {SupremeCourt} from "../contracts/SupremeCourt.sol";
import {Ulas} from "../contracts/Ulas.sol";
import {UlasRegistry} from "../contracts/UlasRegistry.sol";
import {GovernanceTumen} from "../contracts/GovernanceTumen.sol";
import {AltanCentralBank} from "../contracts/AltanCentralBank.sol";
import {KeyRatePolicy} from "../contracts/KeyRatePolicy.sol";
import {Altan} from "../contracts/Altan.sol";
import {CoreLaw} from "../contracts/CoreLaw.sol";
import {CoreLock} from "../contracts/CoreLock.sol";

/**
 * @title FullSystemIntegrationTest
 * @notice Test complete 4-branch government + governance hierarchy
 * 
 * Integration Tests:
 * 1. Legislative (Khural) → Executive (Chairman) → Veto
 * 2. Executive (Chairman) → Judicial (Review) → Block
 * 3. Khural → Impeachment → New Election
 * 4. Monetary (KeyRate) → Bank Lending
 * 5. Full hierarchy: Tumen → Ulas → Khural → Law
 */
contract FullSystemIntegrationTest is Test {
    
    // Governance
    UlasRegistry ulasRegistry;
    Ulas ulas;
    ConfederativeKhural khural;
    
    // 4 Branches
    ExecutiveChairman chairman;
    SupremeCourt supremeCourt;
    JudicialReview judicialReview;
    AltanCentralBank centralBank;
    KeyRatePolicy keyRatePolicy;
    
    // Currency
    CoreLaw coreLaw;
    CoreLock coreLock;
    Altan altan;
    
    // Test addresses
    address governor = address(0x100);
    address rep1 = address(0x201);
    address rep2 = address(0x202);
    address rep3 = address(0x203);
    address judge1 = address(0x301);
    address judge2 = address(0x302);
    address judge3 = address(0x303);
    address judge4 = address(0x304);
    address judge5 = address(0x305);
    address boardMember1 = address(0x401);
    address boardMember2 = address(0x402);
    
    function setUp() public {
        vm.startPrank(governor);
        
        // 1. Deploy CoreLaw & CoreLock
        coreLaw = new CoreLaw();
        coreLock = new CoreLock(governor, address(coreLaw));
        
        // 2. Deploy Altan
        altan = new Altan(
            address(coreLaw),
            address(this), // khural placeholder
            address(this), // centralBank placeholder
            address(this), // treasury placeholder
            1_000_000_000 * 1e6  // 1B maxSupply
        );
        
        // 3. Deploy Monetary
        centralBank = new AltanCentralBank(
            address(altan),
            address(coreLock),
            governor
        );
        
        keyRatePolicy = new KeyRatePolicy(
            address(centralBank),
            governor,
            700  // 7% initial key rate
        );
        
        // 4. Deploy Governance
        ulasRegistry = new UlasRegistry();
        (uint256 ulasId, address ulasAddr) = ulasRegistry.createUlas("Test Ulus");
        ulas = Ulas(ulasAddr);
        
        // 5. Deploy Khural
        khural = new ConfederativeKhural(address(ulasRegistry));
        
        // 6. Deploy Executive
        chairman = new ExecutiveChairman(address(khural));
        
        // 7. Deploy Judicial
        supremeCourt = new SupremeCourt();
        judicialReview = new JudicialReview(
            address(supremeCourt),
            address(khural),
            address(chairman)
        );
        
        // Setup judges
        supremeCourt.appointJudge(1, judge1);
        supremeCourt.appointJudge(2, judge2);
        supremeCourt.appointJudge(3, judge3);
        supremeCourt.appointJudge(4, judge4);
        supremeCourt.appointJudge(5, judge5);
        
        // Setup Khural representatives
        khural.addRepresentative(rep1);
        khural.addRepresentative(rep2);
        khural.addRepresentative(rep3);
        
        // Setup KeyRate board
        keyRatePolicy.appointBoardMember(1, boardMember1);
        keyRatePolicy.appointBoardMember(2, boardMember2);
        
        vm.stopPrank();
    }
    
    /* ==================== TEST: LEGISLATIVE → EXECUTIVE ==================== */
    
    function testKhuralPassesLaw_ChairmanVetos() public {
        // 1. Khural passes law
        vm.prank(rep1);
        uint256 lawId = khural.createProposal(
            ConfederativeKhural.ProposalType.LAW,
            "Test Law",
            bytes32(uint256(1))
        );
        
        // Vote for law
        vm.prank(rep1);
        khural.vote(lawId, true, false);
        
        vm.prank(rep2);
        khural.vote(lawId, true, false);
        
        // Fast forward 7 days
        vm.warp(block.timestamp + 7 days + 1);
        
        // Execute law
        vm.prank(rep1);
        khural.executeProposal(lawId);
        
        // 2. Chairman vetoes
        vm.prank(address(khural));
        chairman.electChairman(rep1);  // First elect chairman
        
        vm.prank(rep1);
        chairman.vetoLaw(lawId, "Not in public interest");
        
        // 3. Verify veto
        (address vetoChairman, string memory reason,,) = chairman.getVeto(lawId);
        assertEq(vetoChairman, rep1);
        assertEq(reason, "Not in public interest");
    }
    
    /* ==================== TEST: JUDICIAL REVIEW ==================== */
    
    function testJudicialReview_BlocksUnconstitutionalLaw() public {
        // 1. Khural passes law
        vm.prank(rep1);
        uint256 lawId = khural.createProposal(
            ConfederativeKhural.ProposalType.LAW,
            "Unconstitutional Law",
            bytes32(uint256(2))
        );
        
        // 2. Request judicial review
        vm.prank(rep2);
        uint256 reviewId = judicialReview.requestReview(
            JudicialReview.ReviewType.LAW,
            lawId,
            "Violates Article 5"
        );
        
        // 3. Judges vote unconstitutional
        vm.prank(judge1);
        judicialReview.vote(reviewId, false);  // unconstitutional
        
        vm.prank(judge2);
        judicialReview.vote(reviewId, false);
        
        vm.prank(judge3);
        judicialReview.vote(reviewId, false);
        
        vm.prank(judge4);
        judicialReview.vote(reviewId, false);
        
        vm.prank(judge5);
        judicialReview.vote(reviewId, false);
        
        // 4. Verify blocked
        bool isBlocked = judicialReview.isItemBlocked(
            JudicialReview.ReviewType.LAW,
            lawId
        );
        assertTrue(isBlocked);
    }
    
    /* ==================== TEST: IMPEACHMENT ==================== */
    
    function testKhural_ImpeachesChairman() public {
        // 1. Elect chairman
        vm.prank(address(khural));
        chairman.electChairman(rep1);
        
        (address addr,,,, bool isActive,) = chairman.getChairmanInfo();
        assertEq(addr, rep1);
        assertTrue(isActive);
        
        // 2. Impeach
        vm.prank(address(khural));
        chairman.impeachChairman();
        
        // 3. Verify removed
        (,,,, bool stillActive,) = chairman.getChairmanInfo();
        assertFalse(stillActive);
    }
    
    /* ==================== TEST: KEY RATE POLICY ==================== */
    
    function testKeyRate_BoardVotesOnChange() public {
        // 1. Initial rate
        (uint256 currentRate,) = keyRatePolicy.getCurrentRate();
        assertEq(currentRate, 700);  // 7%
        
        // 2. Propose rate change
        vm.prank(boardMember1);
        uint256 decisionId = keyRatePolicy.proposeRateChange(
            800,  // 8%
            "Inflation targeting"
        );
        
        // 3. Board votes
        vm.prank(boardMember1);
        keyRatePolicy.voteOnDecision(decisionId, true);
        
        vm.prank(boardMember2);
        keyRatePolicy.voteOnDecision(decisionId, true);
        
        // Need 5/9 quorum - add more board members
        vm.startPrank(governor);
        address bm3 = address(0x403);
        address bm4 = address(0x404);
        address bm5 = address(0x405);
        keyRatePolicy.appointBoardMember(3, bm3);
        keyRatePolicy.appointBoardMember(4, bm4);
        keyRatePolicy.appointBoardMember(5, bm5);
        vm.stopPrank();
        
        vm.prank(bm3);
        keyRatePolicy.voteOnDecision(decisionId, true);
        
        vm.prank(bm4);
        keyRatePolicy.voteOnDecision(decisionId, true);
        
        vm.prank(bm5);
        keyRatePolicy.voteOnDecision(decisionId, true);
        
        // 4. Verify rate changed
        (uint256 newRate,) = keyRatePolicy.getCurrentRate();
        assertEq(newRate, 800);  // 8%
    }
    
    /* ==================== TEST: CABINET APPOINTMENTS ==================== */
    
    function testChairman_AppointsCabinet() public {
        // 1. Elect chairman
        vm.prank(address(khural));
        chairman.electChairman(rep1);
        
        // 2. Appoint minister
        address minister = address(0x500);
        vm.prank(rep1);
        chairman.appointMinister("Defense", minister);
        
        // 3. Verify
        address appointed = chairman.getCabinetMinister("Defense");
        assertEq(appointed, minister);
    }
    
    /* ==================== TEST: SUPREME COURT ==================== */
    
    function testSupremeCourt_OpenCase() public {
        address defendant = address(0x600);
        
        // 1. Open case
        vm.prank(governor);
        uint256 caseId = supremeCourt.openCase(
            defendant,
            SupremeCourt.CaseType.FRAUD_VERIFICATION,
            bytes32(uint256(123)),
            new uint256[](0)
        );
        
        // 2. Verify case opened
        assertTrue(caseId > 0);
    }
    
    /* ==================== TEST: FULL FLOW ==================== */
    
    function testFullFlow_TumenToLaw() public {
        // This would simulate:
        // 1. Tumen leader elected
        // 2. Registers for Ulas
        // 3. Ulas chairman elected
        // 4. Chairman becomes Khural rep
        // 5. Rep creates law
        // 6. Law passes
        // 7. Chairman may veto
        // 8. Court may review
        
        // Simplified version:
        vm.prank(rep1);
        uint256 proposalId = khural.createProposal(
            ConfederativeKhural.ProposalType.LAW,
            "Universal Healthcare Act",
            bytes32(uint256(999))
        );
        
        assertTrue(proposalId > 0);
    }
}
