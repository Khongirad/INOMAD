// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ArbanCompletion} from "./ArbanCompletion.sol";

/**
 * @title ArbanCreditLine
 * @notice Credit system for BOTH Arban types (Family and Organizational)
 * 
 * Monetary Policy:
 * - Interest rates set by Central Bank
 * - Central Bank Governing Council: 10 members elected by Financial Guilds
 * - Key rate determined by Central Bank monetary policy
 * 
 * Eligibility:
 * - Family Arban: Married couple (children optional)
 * - Organizational Arban: Has 10+ members
 * 
 * Credit Limit:
 * - Family Base: 25,000 ALTAN
 * - Org Base: 50,000 ALTAN
 * - Max: 500,000 ALTAN
 * 
 * Credit Rating: 0-1000 scale (500 = neutral start)
 */
contract ArbanCreditLine {
    
    /* ==================== ERRORS ==================== */
    error NotOwner();
    error ZeroAddress();
    error ArbanNotEligible();
    error CreditLineExists();
    error NoCreditLine();
    error InsufficientCredit();
    error LoanNotActive();
    error AlreadyRepaid();
    
    /* ==================== CONSTANTS ==================== */
    uint256 public constant FAMILY_BASE_LIMIT = 25_000 * 1e6;   // 25,000 ALTAN
    uint256 public constant ORG_BASE_LIMIT = 50_000 * 1e6;      // 50,000 ALTAN
    uint256 public constant MAX_CREDIT_LIMIT = 500_000 * 1e6;   // 500,000 ALTAN
    uint256 public constant NEUTRAL_RATING = 500;
    uint256 public constant MAX_RATING = 1000;
    
    // Interest rate set by Central Bank (basis points, e.g., 500 = 5%)
    uint256 public interestRateBps = 500;  // Default 5%, configurable by Central Bank
    
    /* ==================== STATE ==================== */
    address public owner;
    ArbanCompletion public immutable arbanCompletion;
    
    enum CreditType { NONE, FAMILY, ORG }
    
    struct CreditLine {
        uint256 arbanId;
        CreditType creditType;
        uint256 creditRating;
        uint256 creditLimit;
        uint256 borrowed;
        uint256 totalBorrowed;
        uint256 totalRepaid;
        uint256 defaultCount;
        uint256 onTimeCount;
        bool isActive;
        uint256 openedAt;
    }
    
    struct Loan {
        uint256 loanId;
        uint256 arbanId;
        CreditType creditType;
        uint256 principal;
        uint256 interest;
        uint256 dueDate;
        uint256 borrowedAt;
        uint256 repaidAt;
        bool active;
        bool defaulted;
    }
    
    // Separate mappings for Family and Org
    mapping(uint256 => CreditLine) public familyCreditLines;
    mapping(uint256 => CreditLine) public orgCreditLines;
    mapping(uint256 => Loan[]) public familyLoans;
    mapping(uint256 => Loan[]) public orgLoans;
    mapping(uint256 => bool) public hasFamilyCreditLine;
    mapping(uint256 => bool) public hasOrgCreditLine;
    
    uint256 public nextLoanId = 1;
    
    /* ==================== EVENTS ==================== */
    event OwnerChanged(address indexed oldOwner, address indexed newOwner);
    event InterestRateUpdated(uint256 oldRateBps, uint256 newRateBps);
    event CreditLineOpened(uint256 indexed arbanId, CreditType creditType, uint256 creditLimit);
    event LoanTaken(uint256 indexed loanId, uint256 indexed arbanId, CreditType creditType, uint256 amount);
    event LoanRepaid(uint256 indexed loanId, uint256 indexed arbanId, CreditType creditType, bool onTime);
    event RatingUpdated(uint256 indexed arbanId, CreditType creditType, uint256 newRating);
    
    /* ==================== MODIFIERS ==================== */
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    
    /* ==================== CONSTRUCTOR ==================== */
    constructor(address arbanCompletion_) {
        if (arbanCompletion_ == address(0)) revert ZeroAddress();
        owner = msg.sender;
        arbanCompletion = ArbanCompletion(arbanCompletion_);
    }
    
    /* ==================== ADMIN ==================== */
    
    /**
     * @notice Set interest rate (Central Bank only)
     * @dev Rate in basis points (e.g., 500 = 5%)
     * @param rateBps Interest rate in basis points
     */
    function setInterestRate(uint256 rateBps) external onlyOwner {
        uint256 oldRate = interestRateBps;
        interestRateBps = rateBps;
        emit InterestRateUpdated(oldRate, rateBps);
    }
    
    /* ==================== FAMILY CREDIT ==================== */
    
    function openFamilyCreditLine(uint256 familyArbanId) external {
        if (hasFamilyCreditLine[familyArbanId]) revert CreditLineExists();
        
        // Check eligibility via ArbanCompletion (has children)
        if (!arbanCompletion.isEligibleForTier2(familyArbanId)) revert ArbanNotEligible();
        
        familyCreditLines[familyArbanId] = CreditLine({
            arbanId: familyArbanId,
            creditType: CreditType.FAMILY,
            creditRating: NEUTRAL_RATING,
            creditLimit: FAMILY_BASE_LIMIT,
            borrowed: 0,
            totalBorrowed: 0,
            totalRepaid: 0,
            defaultCount: 0,
            onTimeCount: 0,
            isActive: true,
            openedAt: block.timestamp
        });
        
        hasFamilyCreditLine[familyArbanId] = true;
        emit CreditLineOpened(familyArbanId, CreditType.FAMILY, FAMILY_BASE_LIMIT);
    }
    
    function borrowFamily(uint256 familyArbanId, uint256 amount, uint256 durationDays) external returns (uint256 loanId) {
        if (!hasFamilyCreditLine[familyArbanId]) revert NoCreditLine();
        CreditLine storage credit = familyCreditLines[familyArbanId];
        if (credit.borrowed + amount > credit.creditLimit) revert InsufficientCredit();
        
        uint256 interest = (amount * interestRateBps * durationDays) / (365 * 10000); // BPS calculation
        loanId = nextLoanId++;
        
        familyLoans[familyArbanId].push(Loan({
            loanId: loanId,
            arbanId: familyArbanId,
            creditType: CreditType.FAMILY,
            principal: amount,
            interest: interest,
            dueDate: block.timestamp + (durationDays * 1 days),
            borrowedAt: block.timestamp,
            repaidAt: 0,
            active: true,
            defaulted: false
        }));
        
        credit.borrowed += amount;
        credit.totalBorrowed += amount;
        
        emit LoanTaken(loanId, familyArbanId, CreditType.FAMILY, amount);
    }
    
    function repayFamily(uint256 familyArbanId, uint256 loanIdx) external {
        if (!hasFamilyCreditLine[familyArbanId]) revert NoCreditLine();
        Loan storage loan = familyLoans[familyArbanId][loanIdx];
        if (!loan.active) revert LoanNotActive();
        
        CreditLine storage credit = familyCreditLines[familyArbanId];
        bool onTime = block.timestamp <= loan.dueDate;
        
        loan.active = false;
        loan.repaidAt = block.timestamp;
        loan.defaulted = !onTime;
        
        credit.borrowed -= loan.principal;
        credit.totalRepaid += loan.principal + loan.interest;
        
        if (onTime) {
            credit.onTimeCount++;
            _improveRating(credit);
        } else {
            credit.defaultCount++;
            _reduceRating(credit);
        }
        
        emit LoanRepaid(loan.loanId, familyArbanId, CreditType.FAMILY, onTime);
    }
    
    /* ==================== ORG CREDIT ==================== */
    
    function openOrgCreditLine(uint256 orgArbanId) external {
        if (hasOrgCreditLine[orgArbanId]) revert CreditLineExists();
        
        // Org Arbans with 10+ members are eligible
        (,uint256[] memory members,,,,) = arbanCompletion.getOrgArban(orgArbanId);
        require(members.length >= 10, "Need 10+ members");
        
        orgCreditLines[orgArbanId] = CreditLine({
            arbanId: orgArbanId,
            creditType: CreditType.ORG,
            creditRating: NEUTRAL_RATING,
            creditLimit: ORG_BASE_LIMIT,
            borrowed: 0,
            totalBorrowed: 0,
            totalRepaid: 0,
            defaultCount: 0,
            onTimeCount: 0,
            isActive: true,
            openedAt: block.timestamp
        });
        
        hasOrgCreditLine[orgArbanId] = true;
        emit CreditLineOpened(orgArbanId, CreditType.ORG, ORG_BASE_LIMIT);
    }
    
    function borrowOrg(uint256 orgArbanId, uint256 amount, uint256 durationDays) external returns (uint256 loanId) {
        if (!hasOrgCreditLine[orgArbanId]) revert NoCreditLine();
        CreditLine storage credit = orgCreditLines[orgArbanId];
        if (credit.borrowed + amount > credit.creditLimit) revert InsufficientCredit();
        
        uint256 interest = (amount * interestRateBps * durationDays) / (365 * 10000); // BPS calculation
        loanId = nextLoanId++;
        
        orgLoans[orgArbanId].push(Loan({
            loanId: loanId,
            arbanId: orgArbanId,
            creditType: CreditType.ORG,
            principal: amount,
            interest: interest,
            dueDate: block.timestamp + (durationDays * 1 days),
            borrowedAt: block.timestamp,
            repaidAt: 0,
            active: true,
            defaulted: false
        }));
        
        credit.borrowed += amount;
        credit.totalBorrowed += amount;
        
        emit LoanTaken(loanId, orgArbanId, CreditType.ORG, amount);
    }
    
    function repayOrg(uint256 orgArbanId, uint256 loanIdx) external {
        if (!hasOrgCreditLine[orgArbanId]) revert NoCreditLine();
        Loan storage loan = orgLoans[orgArbanId][loanIdx];
        if (!loan.active) revert LoanNotActive();
        
        CreditLine storage credit = orgCreditLines[orgArbanId];
        bool onTime = block.timestamp <= loan.dueDate;
        
        loan.active = false;
        loan.repaidAt = block.timestamp;
        loan.defaulted = !onTime;
        
        credit.borrowed -= loan.principal;
        credit.totalRepaid += loan.principal + loan.interest;
        
        if (onTime) {
            credit.onTimeCount++;
            _improveRating(credit);
        } else {
            credit.defaultCount++;
            _reduceRating(credit);
        }
        
        emit LoanRepaid(loan.loanId, orgArbanId, CreditType.ORG, onTime);
    }
    
    /* ==================== INTERNAL ==================== */
    
    function _improveRating(CreditLine storage credit) internal {
        uint256 newRating = credit.creditRating + 10;
        if (newRating > MAX_RATING) newRating = MAX_RATING;
        credit.creditRating = newRating;
        _updateLimit(credit);
        emit RatingUpdated(credit.arbanId, credit.creditType, newRating);
    }
    
    function _reduceRating(CreditLine storage credit) internal {
        uint256 newRating = credit.creditRating > 50 ? credit.creditRating - 50 : 0;
        credit.creditRating = newRating;
        _updateLimit(credit);
        emit RatingUpdated(credit.arbanId, credit.creditType, newRating);
    }
    
    function _updateLimit(CreditLine storage credit) internal {
        uint256 baseLimit = credit.creditType == CreditType.FAMILY ? FAMILY_BASE_LIMIT : ORG_BASE_LIMIT;
        uint256 newLimit = (baseLimit * credit.creditRating) / NEUTRAL_RATING;
        if (newLimit > MAX_CREDIT_LIMIT) newLimit = MAX_CREDIT_LIMIT;
        credit.creditLimit = newLimit;
    }
    
    /* ==================== VIEW ==================== */
    
    function getFamilyCreditLine(uint256 arbanId) external view returns (
        uint256 rating, uint256 limit, uint256 borrowed, uint256 available, bool isActive
    ) {
        CreditLine storage c = familyCreditLines[arbanId];
        return (c.creditRating, c.creditLimit, c.borrowed, c.creditLimit > c.borrowed ? c.creditLimit - c.borrowed : 0, c.isActive);
    }
    
    function getOrgCreditLine(uint256 arbanId) external view returns (
        uint256 rating, uint256 limit, uint256 borrowed, uint256 available, bool isActive
    ) {
        CreditLine storage c = orgCreditLines[arbanId];
        return (c.creditRating, c.creditLimit, c.borrowed, c.creditLimit > c.borrowed ? c.creditLimit - c.borrowed : 0, c.isActive);
    }
    
    /* ==================== OWNERSHIP ==================== */
    
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnerChanged(owner, newOwner);
        owner = newOwner;
    }
}
