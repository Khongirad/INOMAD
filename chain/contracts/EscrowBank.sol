// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./Altan.sol";

/**
 * @title EscrowBank
 * @notice Банк Сибирской Конфедерации — эскроу-сервис для сделок
 *
 * Банк предоставляет:
 * - Счета для участников сделок
 * - Эскроу-счета для безопасного хранения средств
 * - Автоматическое исполнение условий сделки
 * - Распределение средств по этапам
 *
 * Банк является нейтральной стороной, которая:
 * - Хранит средства до выполнения условий
 * - Выполняет распределение при подтверждении сторон
 * - Возвращает средства при отмене сделки
 */
contract EscrowBank is AccessControl, ReentrancyGuard {
    /*//////////////////////////////////////////////////////////////
                                ROLES
    //////////////////////////////////////////////////////////////*/

    bytes32 public constant KHURAL_ROLE = keccak256("KHURAL_ROLE");
    bytes32 public constant BANK_OPERATOR_ROLE = keccak256("BANK_OPERATOR_ROLE");
    bytes32 public constant AGREEMENT_ROLE = keccak256("AGREEMENT_ROLE");  // Для контрактов сделок

    /*//////////////////////////////////////////////////////////////
                                ENUMS
    //////////////////////////////////////////////////////////////*/

    /// @notice Статус эскроу-счёта
    enum EscrowStatus {
        CREATED,        // Создан, ожидает пополнения
        FUNDED,         // Пополнен, средства заблокированы
        PARTIAL_RELEASE,// Частично выплачено (поэтапно)
        COMPLETED,      // Полностью выплачено
        REFUNDED,       // Возврат средств
        DISPUTED        // Спор, требует арбитража
    }

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error ZeroAddress();
    error ZeroAmount();
    error InsufficientBalance();
    error EscrowNotFound();
    error InvalidStatus();
    error NotAuthorized();
    error AlreadyFunded();
    error TransferFailed();
    error InvalidPercentage();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event AccountCreated(address indexed holder, uint256 indexed accountId);
    event Deposit(address indexed holder, uint256 amount);
    event Withdrawal(address indexed holder, uint256 amount);

    event EscrowCreated(
        uint256 indexed escrowId,
        address indexed depositor,
        address indexed beneficiary,
        uint256 amount
    );
    event EscrowFunded(uint256 indexed escrowId, uint256 amount);
    event EscrowReleased(uint256 indexed escrowId, address indexed to, uint256 amount);
    event EscrowRefunded(uint256 indexed escrowId, address indexed to, uint256 amount);
    event EscrowDisputed(uint256 indexed escrowId, address indexed initiator, string reason);
    event DisputeResolved(uint256 indexed escrowId, address indexed resolver, bool releaseToBeneficiary);

    /*//////////////////////////////////////////////////////////////
                            DATA STRUCTURES
    //////////////////////////////////////////////////////////////*/

    /// @notice Банковский счёт
    struct Account {
        uint256 id;
        address holder;
        uint256 balance;
        uint256 lockedBalance;      // Заблокировано в эскроу
        uint256 totalDeposited;
        uint256 totalWithdrawn;
        uint64 createdAt;
        bool active;
        bool exists;
    }

    /// @notice Эскроу-счёт
    struct Escrow {
        uint256 id;
        address depositor;          // Кто внёс средства (покупатель)
        address beneficiary;        // Кому выплачиваются (продавец)
        address agreementContract;  // Связанный контракт сделки
        uint256 totalAmount;        // Общая сумма эскроу
        uint256 releasedAmount;     // Уже выплачено
        uint256 refundedAmount;     // Возвращено
        EscrowStatus status;
        string description;
        uint64 createdAt;
        uint64 fundedAt;
        uint64 completedAt;
        bool exists;
    }

    /// @notice Этап выплаты
    struct PaymentMilestone {
        uint256 escrowId;
        uint256 percentage;         // Процент от общей суммы (100 = 1%)
        string description;
        bool released;
        uint64 releasedAt;
    }

    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    Altan public immutable altan;

    uint256 public nextAccountId;
    uint256 public nextEscrowId;

    mapping(uint256 => Account) public accounts;
    mapping(address => uint256) public accountIdByHolder;

    mapping(uint256 => Escrow) public escrows;
    mapping(uint256 => PaymentMilestone[]) public escrowMilestones;

    // Статистика
    uint256 public totalDeposits;
    uint256 public totalEscrowVolume;
    uint256 public activeEscrowCount;

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _altan, address _khural) {
        if (_altan == address(0)) revert ZeroAddress();
        if (_khural == address(0)) revert ZeroAddress();

        altan = Altan(_altan);

        _grantRole(DEFAULT_ADMIN_ROLE, _khural);
        _grantRole(KHURAL_ROLE, _khural);
        _grantRole(BANK_OPERATOR_ROLE, _khural);
    }

    /*//////////////////////////////////////////////////////////////
                        УПРАВЛЕНИЕ СЧЕТАМИ
    //////////////////////////////////////////////////////////////*/

    /// @notice Открыть банковский счёт
    function openAccount() external returns (uint256 accountId) {
        if (accountIdByHolder[msg.sender] != 0) {
            return accountIdByHolder[msg.sender];
        }

        accountId = ++nextAccountId;

        accounts[accountId] = Account({
            id: accountId,
            holder: msg.sender,
            balance: 0,
            lockedBalance: 0,
            totalDeposited: 0,
            totalWithdrawn: 0,
            createdAt: uint64(block.timestamp),
            active: true,
            exists: true
        });

        accountIdByHolder[msg.sender] = accountId;

        emit AccountCreated(msg.sender, accountId);
    }

    /// @notice Внести средства на счёт
    function deposit(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();

        uint256 accountId = accountIdByHolder[msg.sender];
        if (accountId == 0) {
            accountId = _createAccount(msg.sender);
        }

        // Перевод токенов на контракт банка
        bool success = altan.transferFrom(msg.sender, address(this), amount);
        if (!success) revert TransferFailed();

        Account storage acc = accounts[accountId];
        acc.balance += amount;
        acc.totalDeposited += amount;
        totalDeposits += amount;

        emit Deposit(msg.sender, amount);
    }

    /// @notice Снять средства со счёта
    function withdraw(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();

        uint256 accountId = accountIdByHolder[msg.sender];
        if (accountId == 0) revert InsufficientBalance();

        Account storage acc = accounts[accountId];
        uint256 available = acc.balance - acc.lockedBalance;

        if (amount > available) revert InsufficientBalance();

        acc.balance -= amount;
        acc.totalWithdrawn += amount;

        bool success = altan.transfer(msg.sender, amount);
        if (!success) revert TransferFailed();

        emit Withdrawal(msg.sender, amount);
    }

    /// @notice Получить доступный баланс
    function getAvailableBalance(address holder) external view returns (uint256) {
        uint256 accountId = accountIdByHolder[holder];
        if (accountId == 0) return 0;

        Account storage acc = accounts[accountId];
        return acc.balance - acc.lockedBalance;
    }

    /*//////////////////////////////////////////////////////////////
                        СОЗДАНИЕ ЭСКРОУ
    //////////////////////////////////////////////////////////////*/

    /// @notice Создать эскроу-счёт для сделки
    function createEscrow(
        address depositor,
        address beneficiary,
        uint256 amount,
        string calldata description,
        uint256[] calldata milestonePercentages,
        string[] calldata milestoneDescriptions
    ) external onlyRole(AGREEMENT_ROLE) returns (uint256 escrowId) {
        if (depositor == address(0) || beneficiary == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (milestonePercentages.length != milestoneDescriptions.length) revert InvalidPercentage();

        // Проверка, что проценты суммируются до 10000 (100%)
        uint256 totalPercentage;
        for (uint256 i = 0; i < milestonePercentages.length; i++) {
            totalPercentage += milestonePercentages[i];
        }
        if (totalPercentage != 10000) revert InvalidPercentage();

        escrowId = ++nextEscrowId;

        escrows[escrowId] = Escrow({
            id: escrowId,
            depositor: depositor,
            beneficiary: beneficiary,
            agreementContract: msg.sender,
            totalAmount: amount,
            releasedAmount: 0,
            refundedAmount: 0,
            status: EscrowStatus.CREATED,
            description: description,
            createdAt: uint64(block.timestamp),
            fundedAt: 0,
            completedAt: 0,
            exists: true
        });

        // Создаём этапы выплаты
        for (uint256 i = 0; i < milestonePercentages.length; i++) {
            escrowMilestones[escrowId].push(PaymentMilestone({
                escrowId: escrowId,
                percentage: milestonePercentages[i],
                description: milestoneDescriptions[i],
                released: false,
                releasedAt: 0
            }));
        }

        activeEscrowCount++;

        emit EscrowCreated(escrowId, depositor, beneficiary, amount);
    }

    /// @notice Пополнить эскроу-счёт
    function fundEscrow(uint256 escrowId) external nonReentrant {
        Escrow storage e = escrows[escrowId];
        if (!e.exists) revert EscrowNotFound();
        if (e.status != EscrowStatus.CREATED) revert InvalidStatus();

        uint256 accountId = accountIdByHolder[e.depositor];
        if (accountId == 0) revert InsufficientBalance();

        Account storage acc = accounts[accountId];
        uint256 available = acc.balance - acc.lockedBalance;

        if (available < e.totalAmount) revert InsufficientBalance();

        // Блокируем средства
        acc.lockedBalance += e.totalAmount;

        e.status = EscrowStatus.FUNDED;
        e.fundedAt = uint64(block.timestamp);
        totalEscrowVolume += e.totalAmount;

        emit EscrowFunded(escrowId, e.totalAmount);
    }

    /*//////////////////////////////////////////////////////////////
                    ВЫПЛАТА ИЗ ЭСКРОУ (ПО ЭТАПАМ)
    //////////////////////////////////////////////////////////////*/

    /// @notice Выплатить этап эскроу
    function releaseMilestone(
        uint256 escrowId,
        uint256 milestoneIndex
    ) external onlyRole(AGREEMENT_ROLE) nonReentrant {
        Escrow storage e = escrows[escrowId];
        if (!e.exists) revert EscrowNotFound();
        if (e.status != EscrowStatus.FUNDED && e.status != EscrowStatus.PARTIAL_RELEASE) {
            revert InvalidStatus();
        }

        PaymentMilestone[] storage milestones = escrowMilestones[escrowId];
        if (milestoneIndex >= milestones.length) revert InvalidPercentage();

        PaymentMilestone storage m = milestones[milestoneIndex];
        if (m.released) revert InvalidStatus();

        uint256 releaseAmount = (e.totalAmount * m.percentage) / 10000;

        // Снимаем блокировку и переводим
        uint256 depositorAccountId = accountIdByHolder[e.depositor];
        Account storage depositorAcc = accounts[depositorAccountId];
        depositorAcc.lockedBalance -= releaseAmount;
        depositorAcc.balance -= releaseAmount;

        // Зачисляем бенефициару
        uint256 beneficiaryAccountId = accountIdByHolder[e.beneficiary];
        if (beneficiaryAccountId == 0) {
            beneficiaryAccountId = _createAccount(e.beneficiary);
        }
        Account storage beneficiaryAcc = accounts[beneficiaryAccountId];
        beneficiaryAcc.balance += releaseAmount;

        m.released = true;
        m.releasedAt = uint64(block.timestamp);
        e.releasedAmount += releaseAmount;

        // Проверяем, все ли этапы выплачены
        bool allReleased = true;
        for (uint256 i = 0; i < milestones.length; i++) {
            if (!milestones[i].released) {
                allReleased = false;
                break;
            }
        }

        if (allReleased) {
            e.status = EscrowStatus.COMPLETED;
            e.completedAt = uint64(block.timestamp);
            activeEscrowCount--;
        } else {
            e.status = EscrowStatus.PARTIAL_RELEASE;
        }

        emit EscrowReleased(escrowId, e.beneficiary, releaseAmount);
    }

    /// @notice Выплатить всю оставшуюся сумму эскроу
    function releaseAll(uint256 escrowId) external onlyRole(AGREEMENT_ROLE) nonReentrant {
        Escrow storage e = escrows[escrowId];
        if (!e.exists) revert EscrowNotFound();
        if (e.status != EscrowStatus.FUNDED && e.status != EscrowStatus.PARTIAL_RELEASE) {
            revert InvalidStatus();
        }

        uint256 remaining = e.totalAmount - e.releasedAmount - e.refundedAmount;
        if (remaining == 0) revert ZeroAmount();

        // Снимаем блокировку
        uint256 depositorAccountId = accountIdByHolder[e.depositor];
        Account storage depositorAcc = accounts[depositorAccountId];
        depositorAcc.lockedBalance -= remaining;
        depositorAcc.balance -= remaining;

        // Зачисляем бенефициару
        uint256 beneficiaryAccountId = accountIdByHolder[e.beneficiary];
        if (beneficiaryAccountId == 0) {
            beneficiaryAccountId = _createAccount(e.beneficiary);
        }
        Account storage beneficiaryAcc = accounts[beneficiaryAccountId];
        beneficiaryAcc.balance += remaining;

        // Отмечаем все этапы как выплаченные
        PaymentMilestone[] storage milestones = escrowMilestones[escrowId];
        for (uint256 i = 0; i < milestones.length; i++) {
            if (!milestones[i].released) {
                milestones[i].released = true;
                milestones[i].releasedAt = uint64(block.timestamp);
            }
        }

        e.releasedAmount = e.totalAmount - e.refundedAmount;
        e.status = EscrowStatus.COMPLETED;
        e.completedAt = uint64(block.timestamp);
        activeEscrowCount--;

        emit EscrowReleased(escrowId, e.beneficiary, remaining);
    }

    /*//////////////////////////////////////////////////////////////
                        ВОЗВРАТ СРЕДСТВ
    //////////////////////////////////////////////////////////////*/

    /// @notice Вернуть средства депозитору (при отмене сделки)
    function refundEscrow(uint256 escrowId) external onlyRole(AGREEMENT_ROLE) nonReentrant {
        Escrow storage e = escrows[escrowId];
        if (!e.exists) revert EscrowNotFound();
        if (e.status != EscrowStatus.FUNDED && e.status != EscrowStatus.PARTIAL_RELEASE) {
            revert InvalidStatus();
        }

        uint256 remaining = e.totalAmount - e.releasedAmount - e.refundedAmount;
        if (remaining == 0) revert ZeroAmount();

        // Снимаем блокировку (средства остаются на счёте депозитора)
        uint256 depositorAccountId = accountIdByHolder[e.depositor];
        Account storage depositorAcc = accounts[depositorAccountId];
        depositorAcc.lockedBalance -= remaining;

        e.refundedAmount += remaining;
        e.status = EscrowStatus.REFUNDED;
        e.completedAt = uint64(block.timestamp);
        activeEscrowCount--;

        emit EscrowRefunded(escrowId, e.depositor, remaining);
    }

    /*//////////////////////////////////////////////////////////////
                            СПОРЫ
    //////////////////////////////////////////////////////////////*/

    /// @notice Открыть спор по эскроу
    function openDispute(uint256 escrowId, string calldata reason) external {
        Escrow storage e = escrows[escrowId];
        if (!e.exists) revert EscrowNotFound();
        if (msg.sender != e.depositor && msg.sender != e.beneficiary) revert NotAuthorized();
        if (e.status != EscrowStatus.FUNDED && e.status != EscrowStatus.PARTIAL_RELEASE) {
            revert InvalidStatus();
        }

        e.status = EscrowStatus.DISPUTED;

        emit EscrowDisputed(escrowId, msg.sender, reason);
    }

    /// @notice Разрешить спор (только Хурал/арбитраж)
    function resolveDispute(
        uint256 escrowId,
        bool releaseToBeneficiary,
        uint256 beneficiaryPercentage  // 0-10000 (0-100%)
    ) external onlyRole(KHURAL_ROLE) nonReentrant {
        Escrow storage e = escrows[escrowId];
        if (!e.exists) revert EscrowNotFound();
        if (e.status != EscrowStatus.DISPUTED) revert InvalidStatus();
        if (beneficiaryPercentage > 10000) revert InvalidPercentage();

        uint256 remaining = e.totalAmount - e.releasedAmount - e.refundedAmount;
        uint256 depositorAccountId = accountIdByHolder[e.depositor];
        Account storage depositorAcc = accounts[depositorAccountId];

        if (releaseToBeneficiary) {
            uint256 toBeneficiary = (remaining * beneficiaryPercentage) / 10000;
            uint256 toDepositor = remaining - toBeneficiary;

            // Снимаем блокировку
            depositorAcc.lockedBalance -= remaining;
            depositorAcc.balance -= toBeneficiary;

            if (toBeneficiary > 0) {
                uint256 beneficiaryAccountId = accountIdByHolder[e.beneficiary];
                if (beneficiaryAccountId == 0) {
                    beneficiaryAccountId = _createAccount(e.beneficiary);
                }
                Account storage beneficiaryAcc = accounts[beneficiaryAccountId];
                beneficiaryAcc.balance += toBeneficiary;

                e.releasedAmount += toBeneficiary;
            }

            if (toDepositor > 0) {
                e.refundedAmount += toDepositor;
            }
        } else {
            // Полный возврат депозитору
            depositorAcc.lockedBalance -= remaining;
            e.refundedAmount += remaining;
        }

        e.status = EscrowStatus.COMPLETED;
        e.completedAt = uint64(block.timestamp);
        activeEscrowCount--;

        emit DisputeResolved(escrowId, msg.sender, releaseToBeneficiary);
    }

    /*//////////////////////////////////////////////////////////////
                        ВНУТРЕННИЕ ФУНКЦИИ
    //////////////////////////////////////////////////////////////*/

    function _createAccount(address holder) internal returns (uint256 accountId) {
        accountId = ++nextAccountId;

        accounts[accountId] = Account({
            id: accountId,
            holder: holder,
            balance: 0,
            lockedBalance: 0,
            totalDeposited: 0,
            totalWithdrawn: 0,
            createdAt: uint64(block.timestamp),
            active: true,
            exists: true
        });

        accountIdByHolder[holder] = accountId;

        emit AccountCreated(holder, accountId);
    }

    /*//////////////////////////////////////////////////////////////
                        ФУНКЦИИ ЧТЕНИЯ
    //////////////////////////////////////////////////////////////*/

    /// @notice Получить информацию о счёте
    function getAccount(address holder) external view returns (Account memory) {
        uint256 accountId = accountIdByHolder[holder];
        if (accountId == 0) revert InsufficientBalance();
        return accounts[accountId];
    }

    /// @notice Получить информацию об эскроу
    function getEscrow(uint256 escrowId) external view returns (Escrow memory) {
        if (!escrows[escrowId].exists) revert EscrowNotFound();
        return escrows[escrowId];
    }

    /// @notice Получить этапы эскроу
    function getEscrowMilestones(uint256 escrowId) external view returns (PaymentMilestone[] memory) {
        if (!escrows[escrowId].exists) revert EscrowNotFound();
        return escrowMilestones[escrowId];
    }

    /// @notice Получить статистику банка
    function getStats() external view returns (
        uint256 _totalAccounts,
        uint256 _totalDeposits,
        uint256 _totalEscrowVolume,
        uint256 _activeEscrows
    ) {
        return (nextAccountId, totalDeposits, totalEscrowVolume, activeEscrowCount);
    }
}
