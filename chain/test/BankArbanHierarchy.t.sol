// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/BankArbanHierarchy.sol";

/**
 * @title BankArbanHierarchyTest
 * @notice Tests for 10-100-1000-10000 administrative structure
 */
contract BankArbanHierarchyTest is Test {
    BankArbanHierarchy public hierarchy;

    address public admin = address(0x1);
    address public tumenChairman = address(0x10);
    address public myanganLeader = address(0x20);
    address public zunLeader = address(0x30);
    address public arbanLeader = address(0x40);
    address public employee1 = address(0x100);
    address public employee2 = address(0x101);

    function setUp() public {
        hierarchy = new BankArbanHierarchy(admin);

        // Create full hierarchy
        vm.startPrank(admin);
        
        // Create Tumen
        uint256 tumenId = hierarchy.createTumen("First Tumen", tumenChairman);
        
        vm.stopPrank();

        // Create Myangan
        vm.prank(tumenChairman);
        uint256 myanganId = hierarchy.createMyangan(tumenId, "First Myangan", myanganLeader);

        // Create Zun
        vm.prank(myanganLeader);
        uint256 zunId = hierarchy.createZun(myanganId, "First Zun", zunLeader);

        // Create Arban
        vm.prank(zunLeader);
        hierarchy.createArban(zunId, "First Arban", arbanLeader);
    }

    function test_CreateTumen() public {
        vm.prank(admin);
        uint256 id = hierarchy.createTumen("New Tumen", address(0x999));

        BankArbanHierarchy.Tumen memory tumen = hierarchy.getTumen(id);
        assertEq(tumen.name, "New Tumen");
        assertTrue(tumen.isActive);
    }

    function test_HierarchyRoles() public {
        // Chairman should have CHAIRMAN_ROLE
        assertTrue(hierarchy.hasRole(hierarchy.CHAIRMAN_ROLE(), tumenChairman));
        
        // Myangan leader should have BANKER_ROLE
        assertTrue(hierarchy.hasRole(hierarchy.BANKER_ROLE(), myanganLeader));
        
        // Zun leader should have OFFICER_ROLE
        assertTrue(hierarchy.hasRole(hierarchy.OFFICER_ROLE(), zunLeader));
        
        // Arban leader should have TELLER_ROLE
        assertTrue(hierarchy.hasRole(hierarchy.TELLER_ROLE(), arbanLeader));
    }

    function test_RegisterEmployee() public {
        vm.prank(zunLeader);
        uint256 empId = hierarchy.registerEmployee(1, employee1, 123);

        BankArbanHierarchy.Employee memory emp = hierarchy.getEmployee(empId);
        assertEq(emp.wallet, employee1);
        assertEq(emp.arbanId, 1);
        assertEq(emp.performanceScore, 75); // Initial score
        assertTrue(emp.isActive);
    }

    function test_PerformanceUpdate() public {
        // Register employee
        vm.prank(zunLeader);
        uint256 empId = hierarchy.registerEmployee(1, employee1, 123);

        // Update performance
        vm.prank(zunLeader);
        hierarchy.updatePerformance(empId, 90);

        BankArbanHierarchy.Employee memory emp = hierarchy.getEmployee(empId);
        assertEq(emp.performanceScore, 90);
    }

    function test_CollectiveResponsibility() public {
        // Register multiple employees
        vm.startPrank(zunLeader);
        hierarchy.registerEmployee(1, employee1, 123);
        uint256 emp2Id = hierarchy.registerEmployee(1, employee2, 124);
        vm.stopPrank();

        // Update one employee to low performance
        vm.prank(zunLeader);
        hierarchy.updatePerformance(emp2Id, 30);

        // Arban average should be affected
        BankArbanHierarchy.Arban memory arban = hierarchy.getArban(1);
        // (75 + 30) / 2 = 52.5 -> 52
        assertLt(arban.avgPerformance, 60);
    }

    function test_HierarchyPath() public {
        vm.prank(zunLeader);
        uint256 empId = hierarchy.registerEmployee(1, employee1, 123);

        (
            uint256 arbanId,
            uint256 zunId,
            uint256 myanganId,
            uint256 tumenId
        ) = hierarchy.getHierarchyPath(empId);

        assertEq(arbanId, 1);
        assertEq(zunId, 1);
        assertEq(myanganId, 1);
        assertEq(tumenId, 1);
    }

    function test_MaxArbanSize() public {
        // Fill Arban to max (10)
        vm.startPrank(zunLeader);
        for (uint i = 0; i < 10; i++) {
            hierarchy.registerEmployee(1, address(uint160(0x200 + i)), uint256(200 + i));
        }
        
        // 11th should fail
        vm.expectRevert(BankArbanHierarchy.MaxCapacityReached.selector);
        hierarchy.registerEmployee(1, address(0x300), 300);
        vm.stopPrank();
    }

    function test_CanBePromoted() public {
        vm.prank(zunLeader);
        uint256 empId = hierarchy.registerEmployee(1, employee1, 123);

        // Initial score 75 - not enough
        assertFalse(hierarchy.canBePromoted(empId));

        // Update to 85
        vm.prank(zunLeader);
        hierarchy.updatePerformance(empId, 85);

        // Now can be promoted
        assertTrue(hierarchy.canBePromoted(empId));
    }

    function test_GetStats() public {
        (
            uint256 totalEmployees,
            uint256 totalArbans,
            uint256 totalZuns,
            uint256 totalMyangans,
            uint256 totalTumens
        ) = hierarchy.getStats();

        assertEq(totalArbans, 1);
        assertEq(totalZuns, 1);
        assertEq(totalMyangans, 1);
        assertEq(totalTumens, 1);
    }
}
