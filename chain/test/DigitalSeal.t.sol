// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/DigitalSeal.sol";

contract DigitalSealTest is Test {
    DigitalSeal public seal;
    
    address public signer1 = address(0x1);
    address public signer2 = address(0x2);
    address public nonSigner = address(0x3);
    
    bytes32 public txHash = keccak256("test_transaction");
    bytes public emptyData = "";
    
    event SealCreated(address indexed signer1, address indexed signer2, uint256 timestamp);
    event Approved(bytes32 indexed txHash, address indexed approver, uint8 totalApprovals);
    event Revoked(bytes32 indexed txHash, address indexed revoker, uint8 totalApprovals);
    event Executed(bytes32 indexed txHash, uint256 timestamp);
    
    function setUp() public {
        seal = new DigitalSeal(signer1, signer2);
    }
    
    // ============ Constructor Tests ============
    
    function test_Constructor_SetSigners() public {
        assertEq(seal.signers(0), signer1);
        assertEq(seal.signers(1), signer2);
    }
    
    function test_Constructor_EmitsSealCreated() public {
        vm.expectEmit(true, true, false, false);
        emit SealCreated(signer1, signer2, block.timestamp);
        
        new DigitalSeal(signer1, signer2);
    }
    
    function test_Constructor_RevertIfZeroAddress() public {
        vm.expectRevert("Invalid signer1");
        new DigitalSeal(address(0), signer2);
        
        vm.expectRevert("Invalid signer2");
        new DigitalSeal(signer1, address(0));
    }
    
    function test_Constructor_RevertIfSameSigner() public {
        vm.expectRevert("Signers must be different");
        new DigitalSeal(signer1, signer1);
    }
    
    // ============ Approve Tests ============
    
    function test_Approve_ByFirstSigner() public {
        vm.prank(signer1);
        seal.approve(txHash);
        
        assertTrue(seal.approvals(txHash, signer1));
        assertEq(seal.approvalCount(txHash), 1);
    }
    
    function test_Approve_BySecondSigner() public {
        vm.prank(signer2);
        seal.approve(txHash);
        
        assertTrue(seal.approvals(txHash, signer2));
        assertEq(seal.approvalCount(txHash), 1);
    }
    
    function test_Approve_ByBothSigners() public {
        vm.prank(signer1);
        seal.approve(txHash);
        
        vm.prank(signer2);
        seal.approve(txHash);
        
        assertEq(seal.approvalCount(txHash), 2);
    }
    
    function test_Approve_EmitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit Approved(txHash, signer1, 1);
        
        vm.prank(signer1);
        seal.approve(txHash);
    }
    
    function test_Approve_CreatesDocumentMetadata() public {
        vm.prank(signer1);
        seal.approve(txHash);
        
        DigitalSeal.SealedDocument memory doc = seal.getDocument(txHash);
        assertEq(doc.documentHash, txHash);
        assertEq(doc.createdAt, block.timestamp);
        assertEq(doc.executedAt, 0);
        assertTrue(doc.exists);
    }
    
    function test_Approve_RevertIfNotSigner() public {
        vm.expectRevert(DigitalSeal.NotASigner.selector);
        vm.prank(nonSigner);
        seal.approve(txHash);
    }
    
    function test_Approve_RevertIfAlreadyApproved() public {
        vm.prank(signer1);
        seal.approve(txHash);
        
        vm.expectRevert(DigitalSeal.AlreadyApproved.selector);
        vm.prank(signer1);
        seal.approve(txHash);
    }
    
    function test_Approve_RevertIfAlreadyExecuted() public {
        // Both approve
        vm.prank(signer1);
        seal.approve(txHash);
        vm.prank(signer2);
        seal.approve(txHash);
        
        // Execute
        vm.prank(signer1);
        seal.execute(txHash, emptyData);
        
        // Try to approve again
        vm.expectRevert(DigitalSeal.AlreadyExecuted.selector);
        vm.prank(signer1);
        seal.approve(keccak256("test_transaction"));
    }
    
    // ============ Revoke Tests ============
    
    function test_Revoke_RemovesApproval() public {
        vm.prank(signer1);
        seal.approve(txHash);
        
        vm.prank(signer1);
        seal.revoke(txHash);
        
        assertFalse(seal.approvals(txHash, signer1));
        assertEq(seal.approvalCount(txHash), 0);
    }
    
    function test_Revoke_EmitsEvent() public {
        vm.prank(signer1);
        seal.approve(txHash);
        
        vm.expectEmit(true, true, false, true);
        emit Revoked(txHash, signer1, 0);
        
        vm.prank(signer1);
        seal.revoke(txHash);
    }
    
    function test_Revoke_RevertIfNotApproved() public {
        vm.expectRevert(DigitalSeal.NotApproved.selector);
        vm.prank(signer1);
        seal.revoke(txHash);
    }
    
    function test_Revoke_RevertIfNotSigner() public {
        vm.expectRevert(DigitalSeal.NotASigner.selector);
        vm.prank(nonSigner);
        seal.revoke(txHash);
    }
    
    // ============ Execute Tests ============
    
    function test_Execute_AfterBothApprovals() public {
        vm.prank(signer1);
        seal.approve(txHash);
        vm.prank(signer2);
        seal.approve(txHash);
        
        vm.prank(signer1);
        seal.execute(txHash, emptyData);
        
        assertTrue(seal.executed(txHash));
    }
    
    function test_Execute_UpdatesDocumentTimestamp() public {
        vm.prank(signer1);
        seal.approve(txHash);
        vm.prank(signer2);
        seal.approve(txHash);
        
        vm.prank(signer1);
        seal.execute(txHash, emptyData);
        
        DigitalSeal.SealedDocument memory doc = seal.getDocument(txHash);
        assertEq(doc.executedAt, block.timestamp);
    }
    
    function test_Execute_EmitsEvent() public {
        vm.prank(signer1);
        seal.approve(txHash);
        vm.prank(signer2);
        seal.approve(txHash);
        
        vm.expectEmit(true, false, false, true);
        emit Executed(txHash, block.timestamp);
        
        vm.prank(signer1);
        seal.execute(txHash, emptyData);
    }
    
    function test_Execute_RevertIfInsufficientApprovals() public {
        vm.prank(signer1);
        seal.approve(txHash);
        
        vm.expectRevert(DigitalSeal.InsufficientApprovals.selector);
        vm.prank(signer1);
        seal.execute(txHash, emptyData);
    }
    
    function test_Execute_RevertIfAlreadyExecuted() public {
        vm.prank(signer1);
        seal.approve(txHash);
        vm.prank(signer2);
        seal.approve(txHash);
        
        vm.prank(signer1);
        seal.execute(txHash, emptyData);
        
        vm.expectRevert(DigitalSeal.AlreadyExecuted.selector);
        vm.prank(signer1);
        seal.execute(txHash, emptyData);
    }
    
    function test_Execute_RevertIfNotSigner() public {
        vm.prank(signer1);
        seal.approve(txHash);
        vm.prank(signer2);
        seal.approve(txHash);
        
        vm.expectRevert(DigitalSeal.NotASigner.selector);
        vm.prank(nonSigner);
        seal.execute(txHash, emptyData);
    }
    
    // ============ Verify Tests ============
    
    function test_Verify_NoApprovals() public {
        (bool approved, bool isExecuted, uint8 approvals) = seal.verify(txHash);
        
        assertFalse(approved);
        assertFalse(isExecuted);
        assertEq(approvals, 0);
    }
    
    function test_Verify_OneApproval() public {
        vm.prank(signer1);
        seal.approve(txHash);
        
        (bool approved, bool isExecuted, uint8 approvals) = seal.verify(txHash);
        
        assertFalse(approved); // Need 2
        assertFalse(isExecuted);
        assertEq(approvals, 1);
    }
    
    function test_Verify_TwoApprovals() public {
        vm.prank(signer1);
        seal.approve(txHash);
        vm.prank(signer2);
        seal.approve(txHash);
        
        (bool approved, bool isExecuted, uint8 approvals) = seal.verify(txHash);
        
        assertTrue(approved);
        assertFalse(isExecuted);
        assertEq(approvals, 2);
    }
    
    function test_Verify_Executed() public {
        vm.prank(signer1);
        seal.approve(txHash);
        vm.prank(signer2);
        seal.approve(txHash);
        vm.prank(signer1);
        seal.execute(txHash, emptyData);
        
        (bool approved, bool isExecuted, uint8 approvals) = seal.verify(txHash);
        
        assertTrue(approved);
        assertTrue(isExecuted);
        assertEq(approvals, 2);
    }
    
    // ============ View Function Tests ============
    
    function test_HasApproved_ReturnsTrue() public {
        vm.prank(signer1);
        seal.approve(txHash);
        
        assertTrue(seal.hasApproved(txHash, signer1));
    }
    
    function test_HasApproved_ReturnsFalse() public {
        assertFalse(seal.hasApproved(txHash, signer1));
    }
    
    function test_IsSigner_ReturnsTrue() public {
        assertTrue(seal.isSigner(signer1));
        assertTrue(seal.isSigner(signer2));
    }
    
    function test_IsSigner_ReturnsFalse() public {
        assertFalse(seal.isSigner(nonSigner));
    }
    
    function test_GetDocument_RevertIfNotFound() public {
        vm.expectRevert(DigitalSeal.DocumentNotFound.selector);
        seal.getDocument(txHash);
    }
    
    // ============ Integration Tests ============
    
    function test_FullWorkflow_ApproveExecute() public {
        // Signer 1 approves
        vm.prank(signer1);
        seal.approve(txHash);
        
        // Signer 2 approves
        vm.prank(signer2);
        seal.approve(txHash);
        
        // Verify ready
        (bool approved,,) = seal.verify(txHash);
        assertTrue(approved);
        
        // Execute
        vm.prank(signer1);
        seal.execute(txHash, emptyData);
        
        // Verify executed
        (,bool isExecuted,) = seal.verify(txHash);
        assertTrue(isExecuted);
    }
    
    function test_FullWorkflow_ApproveRevokeApproveExecute() public {
        // Signer 1 approves
        vm.prank(signer1);
        seal.approve(txHash);
        
        // Signer 1 changes mind
        vm.prank(signer1);
        seal.revoke(txHash);
        
        // Signer 1 approves again
        vm.prank(signer1);
        seal.approve(txHash);
        
        // Signer 2 approves
        vm.prank(signer2);
        seal.approve(txHash);
        
        // Execute
        vm.prank(signer2);
        seal.execute(txHash, emptyData);
        
        assertTrue(seal.executed(txHash));
    }
}
