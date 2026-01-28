// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title KeyRatePolicy
 * @notice Механизм Ключевой Ставки Центрального Банка
 * 
 * Ключевая ставка — главный инструмент денежно-кредитной политики:
 * - Определяет стоимость денег в экономике
 * - Влияет на инфляцию и экономический рост
 * - Устанавливается Советом Директоров ЦБ
 * 
 * Функции:
 * - Установка ключевой ставки
 * - История изменений
 * - Расчёт ставок по различным операциям
 * - Автоматический пересчёт для банков
 */
contract KeyRatePolicy {
    
    /* ==================== ERRORS ==================== */
    error NotGovernor();
    error NotBoardMember();
    error RateTooHigh();
    error RateTooLow();
    error TooFrequentChange();
    error QuorumNotReached();
    error AlreadyVoted();
    
    /* ==================== CONSTANTS ==================== */
    
    /// @notice Максимальная ставка: 50% годовых (5000 bps)
    uint256 public constant MAX_KEY_RATE_BPS = 5000;
    
    /// @notice Минимальная ставка: 0.1% годовых (10 bps)
    uint256 public constant MIN_KEY_RATE_BPS = 10;
    
    /// @notice Минимальный интервал между изменениями: 30 дней
    uint256 public constant MIN_CHANGE_INTERVAL = 30 days;
    
    /// @notice Кворум для решения: 5 из 9 членов совета
    uint256 public constant BOARD_SIZE = 9;
    uint256 public constant QUORUM = 5;
    
    /* ==================== STRUCTS ==================== */
    
    struct RateDecision {
        uint256 decisionId;
        uint256 proposedRateBps;    // Предлагаемая ставка
        string rationale;           // Обоснование
        uint256 createdAt;
        uint256 decidedAt;
        bool executed;
        uint256 votesFor;
        uint256 votesAgainst;
    }
    
    struct RateHistory {
        uint256 rateBps;
        uint256 effectiveFrom;
        uint256 decisionId;
        string reason;
    }
    
    /* ==================== STATE ==================== */
    
    address public governor;
    address public centralBank;
    
    /// @notice Текущая ключевая ставка (базисные пункты, 100 = 1%)
    uint256 public keyRateBps;
    
    /// @notice Когда ставка последний раз менялась
    uint256 public lastRateChangeAt;
    
    /// @notice Совет Директоров (9 членов)
    address[9] public boardMembers;
    mapping(address => uint256) public memberToSeat;  // 1-9
    uint256 public activeBoardCount;
    
    /// @notice Решения по ставке
    uint256 public nextDecisionId = 1;
    mapping(uint256 => RateDecision) public decisions;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    
    /// @notice История ставок
    RateHistory[] public rateHistory;
    
    /// @notice Производные ставки (на основе ключевой)
    uint256 public depositCorridor;     // +/- от ключевой для депозитов
    uint256 public creditCorridor;      // +/- от ключевой для кредитов
    
    /* ==================== EVENTS ==================== */
    
    event KeyRateChanged(
        uint256 oldRateBps,
        uint256 newRateBps,
        uint256 decisionId,
        string reason,
        uint256 timestamp
    );
    
    event RateDecisionProposed(
        uint256 indexed decisionId,
        uint256 proposedRateBps,
        address indexed proposer,
        string rationale,
        uint256 timestamp
    );
    
    event BoardMemberVoted(
        uint256 indexed decisionId,
        address indexed member,
        bool inFavor,
        uint256 timestamp
    );
    
    event BoardMemberAppointed(
        uint256 indexed seat,
        address indexed member,
        uint256 timestamp
    );
    
    event CorridorSet(
        uint256 depositCorridor,
        uint256 creditCorridor,
        uint256 timestamp
    );
    
    /* ==================== MODIFIERS ==================== */
    
    modifier onlyGovernor() {
        if (msg.sender != governor) revert NotGovernor();
        _;
    }
    
    modifier onlyBoardMember() {
        if (memberToSeat[msg.sender] == 0) revert NotBoardMember();
        _;
    }
    
    /* ==================== CONSTRUCTOR ==================== */
    
    constructor(address _centralBank, address _governor, uint256 initialRateBps) {
        require(_centralBank != address(0), "Zero address");
        require(_governor != address(0), "Zero address");
        require(initialRateBps >= MIN_KEY_RATE_BPS && initialRateBps <= MAX_KEY_RATE_BPS, "Invalid rate");
        
        centralBank = _centralBank;
        governor = _governor;
        keyRateBps = initialRateBps;
        lastRateChangeAt = block.timestamp;
        
        // Default corridors: +/- 1% (100 bps)
        depositCorridor = 100;
        creditCorridor = 100;
        
        // Record initial rate
        rateHistory.push(RateHistory({
            rateBps: initialRateBps,
            effectiveFrom: block.timestamp,
            decisionId: 0,
            reason: "Initial rate"
        }));
    }
    
    /* ==================== BOARD MANAGEMENT ==================== */
    
    function appointBoardMember(uint256 seat, address member) external onlyGovernor {
        require(seat >= 1 && seat <= BOARD_SIZE, "Invalid seat");
        require(member != address(0), "Zero address");
        require(memberToSeat[member] == 0, "Already member");
        
        uint256 idx = seat - 1;
        
        if (boardMembers[idx] != address(0)) {
            address prev = boardMembers[idx];
            memberToSeat[prev] = 0;
            activeBoardCount--;
        }
        
        boardMembers[idx] = member;
        memberToSeat[member] = seat;
        activeBoardCount++;
        
        emit BoardMemberAppointed(seat, member, block.timestamp);
    }
    
    /* ==================== RATE DECISIONS ==================== */
    
    /**
     * @notice Предложить изменение ключевой ставки
     */
    function proposeRateChange(
        uint256 newRateBps,
        string calldata rationale
    ) external onlyBoardMember returns (uint256 decisionId) {
        if (newRateBps > MAX_KEY_RATE_BPS) revert RateTooHigh();
        if (newRateBps < MIN_KEY_RATE_BPS) revert RateTooLow();
        if (block.timestamp < lastRateChangeAt + MIN_CHANGE_INTERVAL) revert TooFrequentChange();
        
        decisionId = nextDecisionId++;
        
        decisions[decisionId] = RateDecision({
            decisionId: decisionId,
            proposedRateBps: newRateBps,
            rationale: rationale,
            createdAt: block.timestamp,
            decidedAt: 0,
            executed: false,
            votesFor: 0,
            votesAgainst: 0
        });
        
        emit RateDecisionProposed(decisionId, newRateBps, msg.sender, rationale, block.timestamp);
    }
    
    /**
     * @notice Голосовать по решению
     */
    function voteOnDecision(uint256 decisionId, bool inFavor) external onlyBoardMember {
        RateDecision storage decision = decisions[decisionId];
        require(decision.decisionId != 0, "Not found");
        require(!decision.executed, "Already executed");
        require(!hasVoted[decisionId][msg.sender], "Already voted");
        
        hasVoted[decisionId][msg.sender] = true;
        
        if (inFavor) {
            decision.votesFor++;
        } else {
            decision.votesAgainst++;
        }
        
        emit BoardMemberVoted(decisionId, msg.sender, inFavor, block.timestamp);
        
        // Check if quorum reached FOR
        if (decision.votesFor >= QUORUM) {
            _executeRateChange(decisionId);
        }
    }
    
    function _executeRateChange(uint256 decisionId) internal {
        RateDecision storage decision = decisions[decisionId];
        
        uint256 oldRate = keyRateBps;
        keyRateBps = decision.proposedRateBps;
        lastRateChangeAt = block.timestamp;
        decision.decidedAt = block.timestamp;
        decision.executed = true;
        
        rateHistory.push(RateHistory({
            rateBps: decision.proposedRateBps,
            effectiveFrom: block.timestamp,
            decisionId: decisionId,
            reason: decision.rationale
        }));
        
        emit KeyRateChanged(
            oldRate,
            decision.proposedRateBps,
            decisionId,
            decision.rationale,
            block.timestamp
        );
    }
    
    /* ==================== DERIVED RATES ==================== */
    
    /**
     * @notice Получить ставку по депозитам в ЦБ
     * @dev Ключевая ставка минус коридор
     */
    function getDepositRate() external view returns (uint256) {
        if (keyRateBps <= depositCorridor) return MIN_KEY_RATE_BPS;
        return keyRateBps - depositCorridor;
    }
    
    /**
     * @notice Получить ставку по кредитам от ЦБ
     * @dev Ключевая ставка плюс коридор
     */
    function getCreditRate() external view returns (uint256) {
        return keyRateBps + creditCorridor;
    }
    
    /**
     * @notice Рассчитать проценты за период
     * @param principal Основная сумма
     * @param daysHeld Количество дней
     */
    function calculateInterest(
        uint256 principal,
        uint256 daysHeld
    ) external view returns (uint256 interest) {
        // Simple interest: principal * rate * days / 365 / 10000
        interest = (principal * keyRateBps * daysHeld) / 365 / 10000;
    }
    
    /**
     * @notice Установить коридоры ставок
     */
    function setCorridors(
        uint256 _depositCorridor,
        uint256 _creditCorridor
    ) external onlyGovernor {
        depositCorridor = _depositCorridor;
        creditCorridor = _creditCorridor;
        
        emit CorridorSet(_depositCorridor, _creditCorridor, block.timestamp);
    }
    
    /* ==================== VIEW FUNCTIONS ==================== */
    
    function getCurrentRate() external view returns (uint256 rateBps, uint256 effectiveFrom) {
        return (keyRateBps, lastRateChangeAt);
    }
    
    function getRateHistoryLength() external view returns (uint256) {
        return rateHistory.length;
    }
    
    function getRateAt(uint256 index) external view returns (
        uint256 rateBps,
        uint256 effectiveFrom,
        uint256 decisionId,
        string memory reason
    ) {
        RateHistory storage h = rateHistory[index];
        return (h.rateBps, h.effectiveFrom, h.decisionId, h.reason);
    }
    
    function getDecision(uint256 decisionId) external view returns (
        uint256 proposedRateBps,
        string memory rationale,
        uint256 createdAt,
        uint256 decidedAt,
        bool executed,
        uint256 votesFor,
        uint256 votesAgainst
    ) {
        RateDecision storage d = decisions[decisionId];
        return (
            d.proposedRateBps,
            d.rationale,
            d.createdAt,
            d.decidedAt,
            d.executed,
            d.votesFor,
            d.votesAgainst
        );
    }
    
    function getBoardMembers() external view returns (address[9] memory) {
        return boardMembers;
    }
    
    function isBoardComplete() external view returns (bool) {
        return activeBoardCount == BOARD_SIZE;
    }
    
    /* ==================== ADMIN ==================== */
    
    function setGovernor(address newGovernor) external onlyGovernor {
        require(newGovernor != address(0), "Zero address");
        governor = newGovernor;
    }
}
