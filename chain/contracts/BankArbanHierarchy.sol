// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

// Interface for ArbanCompletion contract
interface IArbanCompletion {
    enum ArbanType { NONE, FAMILY, ORGANIZATIONAL }
    
    function getArbanTypeForSeat(uint256 seatId) external view returns (
        ArbanType arbanType,
        uint256 arbanId
    );
}

/**
 * @title BankArbanHierarchy
 * @notice 10-100-1000-10000 Administrative Structure for Bank of Siberia
 * 
 * Hierarchy:
 * ┌─────────────────────────────────────────────────────┐
 * │ TUMEN (10,000) - CHAIRMAN_ROLE                      │
 * │   └── MYANGAN (1,000) x10 - BANKER_ROLE             │
 * │         └── ZUN (100) x10 - OFFICER_ROLE            │
 * │               └── ARBAN (10) x10 - TELLER_ROLE      │
 * │                     └── Bank Employee               │
 * └─────────────────────────────────────────────────────┘
 *
 * Круговая порука (Collective Responsibility):
 * - Responsibility of one = Responsibility of all
 * - Poor performance of one affects entire Arban's reputation
 * - Good performance elevates entire hierarchy
 */
contract BankArbanHierarchy is AccessControl {

    // ============ ROLES HIERARCHY ============
    
    bytes32 public constant CHAIRMAN_ROLE = keccak256("CHAIRMAN_ROLE");   // Тумен (10000)
    bytes32 public constant BANKER_ROLE = keccak256("BANKER_ROLE");       // Мянган (1000)
    bytes32 public constant OFFICER_ROLE = keccak256("OFFICER_ROLE");     // Зун (100)
    bytes32 public constant TELLER_ROLE = keccak256("TELLER_ROLE");       // Арбан (10)

    // ============ STRUCTURES ============
    
    // Employee (individual bank worker)
    struct Employee {
        uint256 id;
        address wallet;
        uint256 seatId;          // SeatSBT ID
        uint256 arbanId;         // Which Arban they belong to
        uint64 joinedAt;
        uint64 lastActiveAt;
        uint256 performanceScore; // 0-100
        bool isActive;
    }

    // Arban (10 employees)
    struct Arban {
        uint256 id;
        uint256 zunId;           // Parent Zun
        string name;
        address leader;          // Arban leader
        uint256 memberCount;
        uint256 avgPerformance;  // Average of all members
        bool isActive;
    }

    // Zun (100 employees = 10 Arbans)
    struct Zun {
        uint256 id;
        uint256 myanganId;       // Parent Myangan
        string name;
        address leader;          // Zun leader
        uint256 arbanCount;
        uint256 avgPerformance;
        bool isActive;
    }

    // Myangan (1000 employees = 10 Zuns)
    struct Myangan {
        uint256 id;
        uint256 tumenId;         // Parent Tumen
        string name;
        address leader;          // Myangan leader
        uint256 zunCount;
        uint256 avgPerformance;
        bool isActive;
    }

    // Tumen (10000 employees = 10 Myangans)
    struct Tumen {
        uint256 id;
        string name;
        address chairman;
        uint256 myanganCount;
        uint256 totalEmployees;
        uint256 avgPerformance;
        bool isActive;
    }

    // ============ STORAGE ============
    
    // Reference to ArbanCompletion (for citizen verification)
    IArbanCompletion public arbanCompletion;
    
    // Counters
    uint256 public nextEmployeeId;
    uint256 public nextArbanId;
    uint256 public nextZunId;
    uint256 public nextMyanganId;
    uint256 public nextTumenId;

    // Mappings
    mapping(uint256 => Employee) public employees;
    mapping(uint256 => Arban) public arbans;
    mapping(uint256 => Zun) public zuns;
    mapping(uint256 => Myangan) public myangans;
    mapping(uint256 => Tumen) public tumens;

    // Lookup mappings
    mapping(address => uint256) public employeeByWallet;
    mapping(uint256 => uint256) public employeeBySeatId;
    mapping(uint256 => uint256[]) public arbanMembers;      // arbanId => employeeIds
    mapping(uint256 => uint256[]) public zunArbans;         // zunId => arbanIds
    mapping(uint256 => uint256[]) public myanganZuns;       // myanganId => zunIds
    mapping(uint256 => uint256[]) public tumenMyangans;     // tumenId => myanganIds

    // Performance thresholds
    uint256 public constant MIN_PERFORMANCE = 50;  // Below this = probation
    uint256 public constant MAX_ARBAN_SIZE = 10;
    uint256 public constant MAX_ZUN_ARBANS = 10;
    uint256 public constant MAX_MYANGAN_ZUNS = 10;
    uint256 public constant MAX_TUMEN_MYANGANS = 10;

    // ============ EVENTS ============
    
    event TumenCreated(uint256 indexed id, string name, address chairman);
    event MyanganCreated(uint256 indexed id, uint256 indexed tumenId, string name, address leader);
    event ZunCreated(uint256 indexed id, uint256 indexed myanganId, string name, address leader);
    event ArbanCreated(uint256 indexed id, uint256 indexed zunId, string name, address leader);
    event EmployeeRegistered(uint256 indexed id, uint256 indexed arbanId, address wallet);
    event EmployeePerformanceUpdated(uint256 indexed employeeId, uint256 oldScore, uint256 newScore);
    event ArbanPerformanceUpdated(uint256 indexed arbanId, uint256 avgScore);
    event CollectiveResponsibilityTriggered(uint256 indexed arbanId, string reason);

    // ============ ERRORS ============
    
    error ZeroAddress();
    error NotFound();
    error MaxCapacityReached();
    error AlreadyExists();
    error NotActive();
    error InsufficientPerformance();

    // ============ CONSTRUCTOR ============
    
    constructor(address admin) {
        if (admin == address(0)) revert ZeroAddress();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(CHAIRMAN_ROLE, admin);
    }

    /**
     * @notice Set ArbanCompletion contract address
     */
    function setArbanCompletion(address _arbanCompletion) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        if (_arbanCompletion == address(0)) revert ZeroAddress();
        arbanCompletion = IArbanCompletion(_arbanCompletion);
    }

    // ============ HIERARCHY CREATION ============
    
    /**
     * @notice Create a new Tumen (top level, 10000 capacity)
     */
    function createTumen(string calldata name, address chairman) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
        returns (uint256 id) 
    {
        id = ++nextTumenId;
        
        tumens[id] = Tumen({
            id: id,
            name: name,
            chairman: chairman,
            myanganCount: 0,
            totalEmployees: 0,
            avgPerformance: 100,
            isActive: true
        });

        _grantRole(CHAIRMAN_ROLE, chairman);
        emit TumenCreated(id, name, chairman);
    }

    /**
     * @notice Create a Myangan under a Tumen (1000 capacity)
     */
    function createMyangan(
        uint256 tumenId,
        string calldata name,
        address leader
    ) external onlyRole(CHAIRMAN_ROLE) returns (uint256 id) {
        Tumen storage tumen = tumens[tumenId];
        if (!tumen.isActive) revert NotActive();
        if (tumen.myanganCount >= MAX_TUMEN_MYANGANS) revert MaxCapacityReached();

        id = ++nextMyanganId;
        
        myangans[id] = Myangan({
            id: id,
            tumenId: tumenId,
            name: name,
            leader: leader,
            zunCount: 0,
            avgPerformance: 100,
            isActive: true
        });

        tumenMyangans[tumenId].push(id);
        tumen.myanganCount++;

        _grantRole(BANKER_ROLE, leader);
        emit MyanganCreated(id, tumenId, name, leader);
    }

    /**
     * @notice Create a Zun under a Myangan (100 capacity)
     */
    function createZun(
        uint256 myanganId,
        string calldata name,
        address leader
    ) external onlyRole(BANKER_ROLE) returns (uint256 id) {
        Myangan storage myangan = myangans[myanganId];
        if (!myangan.isActive) revert NotActive();
        if (myangan.zunCount >= MAX_MYANGAN_ZUNS) revert MaxCapacityReached();

        id = ++nextZunId;
        
        zuns[id] = Zun({
            id: id,
            myanganId: myanganId,
            name: name,
            leader: leader,
            arbanCount: 0,
            avgPerformance: 100,
            isActive: true
        });

        myanganZuns[myanganId].push(id);
        myangan.zunCount++;

        _grantRole(OFFICER_ROLE, leader);
        emit ZunCreated(id, myanganId, name, leader);
    }

    /**
     * @notice Create an Arban under a Zun (10 capacity)
     */
    function createArban(
        uint256 zunId,
        string calldata name,
        address leader
    ) external onlyRole(OFFICER_ROLE) returns (uint256 id) {
        Zun storage zun = zuns[zunId];
        if (!zun.isActive) revert NotActive();
        if (zun.arbanCount >= MAX_ZUN_ARBANS) revert MaxCapacityReached();

        id = ++nextArbanId;
        
        arbans[id] = Arban({
            id: id,
            zunId: zunId,
            name: name,
            leader: leader,
            memberCount: 0,
            avgPerformance: 100,
            isActive: true
        });

        zunArbans[zunId].push(id);
        zun.arbanCount++;

        _grantRole(TELLER_ROLE, leader);
        emit ArbanCreated(id, zunId, name, leader);
    }

    // ============ EMPLOYEE MANAGEMENT ============
    
    /**
     * @notice Register a new bank employee
     */
    function registerEmployee(
        uint256 arbanId,
        address wallet,
        uint256 seatId
    ) external onlyRole(OFFICER_ROLE) returns (uint256 id) {
        if (wallet == address(0)) revert ZeroAddress();
        if (employeeByWallet[wallet] != 0) revert AlreadyExists();

        Arban storage arban = arbans[arbanId];
        if (!arban.isActive) revert NotActive();
        if (arban.memberCount >= MAX_ARBAN_SIZE) revert MaxCapacityReached();

        id = ++nextEmployeeId;
        
        employees[id] = Employee({
            id: id,
            wallet: wallet,
            seatId: seatId,
            arbanId: arbanId,
            joinedAt: uint64(block.timestamp),
            lastActiveAt: uint64(block.timestamp),
            performanceScore: 75, // Start at 75
            isActive: true
        });

        employeeByWallet[wallet] = id;
        if (seatId != 0) {
            employeeBySeatId[seatId] = id;
        }
        arbanMembers[arbanId].push(id);
        arban.memberCount++;

        // Grant basic teller role
        _grantRole(TELLER_ROLE, wallet);

        // Update hierarchy employee count
        _incrementTotalEmployees(arbanId);

        emit EmployeeRegistered(id, arbanId, wallet);
    }

    function _incrementTotalEmployees(uint256 arbanId) internal {
        Arban storage arban = arbans[arbanId];
        Zun storage zun = zuns[arban.zunId];
        Myangan storage myangan = myangans[zun.myanganId];
        Tumen storage tumen = tumens[myangan.tumenId];
        
        tumen.totalEmployees++;
    }

    // ============ PERFORMANCE MANAGEMENT ============
    
    /**
     * @notice Update employee performance score
     */
    function updatePerformance(
        uint256 employeeId,
        uint256 newScore
    ) external onlyRole(OFFICER_ROLE) {
        require(newScore <= 100, "Score must be 0-100");
        
        Employee storage emp = employees[employeeId];
        if (!emp.isActive) revert NotActive();

        uint256 oldScore = emp.performanceScore;
        emp.performanceScore = newScore;
        emp.lastActiveAt = uint64(block.timestamp);

        emit EmployeePerformanceUpdated(employeeId, oldScore, newScore);

        // Recalculate Arban average (круговая порука)
        _recalculateArbanPerformance(emp.arbanId);
    }

    /**
     * @notice Recalculate Arban performance (collective responsibility)
     */
    function _recalculateArbanPerformance(uint256 arbanId) internal {
        uint256[] storage members = arbanMembers[arbanId];
        if (members.length == 0) return;

        uint256 total = 0;
        for (uint256 i = 0; i < members.length; i++) {
            total += employees[members[i]].performanceScore;
        }

        uint256 avg = total / members.length;
        arbans[arbanId].avgPerformance = avg;

        emit ArbanPerformanceUpdated(arbanId, avg);

        // Trigger collective responsibility if below threshold
        if (avg < MIN_PERFORMANCE) {
            emit CollectiveResponsibilityTriggered(
                arbanId, 
                "Arban performance below minimum threshold"
            );
        }

        // Propagate up the hierarchy
        _recalculateZunPerformance(arbans[arbanId].zunId);
    }

    function _recalculateZunPerformance(uint256 zunId) internal {
        uint256[] storage arbanIds = zunArbans[zunId];
        if (arbanIds.length == 0) return;

        uint256 total = 0;
        for (uint256 i = 0; i < arbanIds.length; i++) {
            total += arbans[arbanIds[i]].avgPerformance;
        }

        zuns[zunId].avgPerformance = total / arbanIds.length;
    }

    // ============ ROLE ASSIGNMENT BY HIERARCHY ============
    
    /**
     * @notice Get role based on employee's position
     */
    function getEmployeeRole(uint256 employeeId) external view returns (bytes32) {
        Employee storage emp = employees[employeeId];
        if (!emp.isActive) return bytes32(0);

        Arban storage arban = arbans[emp.arbanId];
        
        // Is Arban leader?
        if (arban.leader == emp.wallet) return TELLER_ROLE;
        
        Zun storage zun = zuns[arban.zunId];
        // Is Zun leader?
        if (zun.leader == emp.wallet) return OFFICER_ROLE;
        
        Myangan storage myangan = myangans[zun.myanganId];
        // Is Myangan leader?
        if (myangan.leader == emp.wallet) return BANKER_ROLE;
        
        Tumen storage tumen = tumens[myangan.tumenId];
        // Is Tumen chairman?
        if (tumen.chairman == emp.wallet) return CHAIRMAN_ROLE;

        return TELLER_ROLE; // Default
    }

    /**
     * @notice Check if employee has sufficient performance for promotion
     */
    function canBePromoted(uint256 employeeId) external view returns (bool) {
        Employee storage emp = employees[employeeId];
        return emp.isActive && emp.performanceScore >= 80;
    }

    // ============ VIEW FUNCTIONS ============
    
    function getEmployee(uint256 id) external view returns (Employee memory) {
        return employees[id];
    }

    function getArban(uint256 id) external view returns (Arban memory) {
        return arbans[id];
    }

    function getZun(uint256 id) external view returns (Zun memory) {
        return zuns[id];
    }

    function getMyangan(uint256 id) external view returns (Myangan memory) {
        return myangans[id];
    }

    function getTumen(uint256 id) external view returns (Tumen memory) {
        return tumens[id];
    }

    function getArbanMembers(uint256 arbanId) external view returns (uint256[] memory) {
        return arbanMembers[arbanId];
    }

    function getHierarchyPath(uint256 employeeId) external view returns (
        uint256 arbanId,
        uint256 zunId,
        uint256 myanganId,
        uint256 tumenId
    ) {
        Employee storage emp = employees[employeeId];
        arbanId = emp.arbanId;
        zunId = arbans[arbanId].zunId;
        myanganId = zuns[zunId].myanganId;
        tumenId = myangans[myanganId].tumenId;
    }

    function getStats() external view returns (
        uint256 totalEmployees,
        uint256 totalArbans,
        uint256 totalZuns,
        uint256 totalMyangans,
        uint256 totalTumens
    ) {
        return (
            nextEmployeeId,
            nextArbanId,
            nextZunId,
            nextMyanganId,
            nextTumenId
        );
    }
}
