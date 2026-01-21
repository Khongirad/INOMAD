// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title NotaryRegistry
 * @notice Реестр нотариусов Сибирской Конфедерации
 *
 * Нотариус — третья сторона в крупных сделках.
 * Три ранга нотариусов в зависимости от опыта и масштаба сделок:
 *
 * Ранг 1 (Junior): До 10,000 ALTAN — начинающий нотариус
 * Ранг 2 (Senior): До 100,000 ALTAN — опытный нотариус
 * Ранг 3 (Master): Без ограничений — мастер-нотариус
 *
 * Для получения следующего ранга нотариус должен:
 * - Провести минимальное количество сделок
 * - Не иметь нареканий
 * - Пройти аттестацию Хуралом
 */
contract NotaryRegistry is AccessControl {
    /*//////////////////////////////////////////////////////////////
                                ROLES
    //////////////////////////////////////////////////////////////*/

    bytes32 public constant KHURAL_ROLE = keccak256("KHURAL_ROLE");
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    /*//////////////////////////////////////////////////////////////
                                ENUMS
    //////////////////////////////////////////////////////////////*/

    /// @notice Ранги нотариусов
    enum NotaryRank {
        NONE,       // 0 - Не нотариус
        JUNIOR,     // 1 - До 10,000 ALTAN
        SENIOR,     // 2 - До 100,000 ALTAN
        MASTER      // 3 - Без ограничений
    }

    /// @notice Статус нотариуса
    enum NotaryStatus {
        INACTIVE,   // Неактивен
        ACTIVE,     // Активен
        SUSPENDED,  // Приостановлен
        REVOKED     // Лицензия отозвана
    }

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error ZeroAddress();
    error NotaryNotFound();
    error NotaryAlreadyExists();
    error InvalidRank();
    error InsufficientRank();
    error NotaryNotActive();
    error InvalidInput();
    error CannotDemote();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event NotaryRegistered(
        address indexed notary,
        uint256 indexed notaryId,
        NotaryRank rank,
        string fullName
    );
    event NotaryRankChanged(address indexed notary, NotaryRank oldRank, NotaryRank newRank);
    event NotaryStatusChanged(address indexed notary, NotaryStatus oldStatus, NotaryStatus newStatus);
    event DealRecorded(address indexed notary, uint256 dealAmount, uint256 totalDeals);
    event ComplaintFiled(address indexed notary, address indexed complainant, string reason);

    /*//////////////////////////////////////////////////////////////
                            DATA STRUCTURES
    //////////////////////////////////////////////////////////////*/

    struct Notary {
        uint256 id;
        address wallet;
        string fullName;
        string licenseNumber;       // Номер лицензии
        bytes32 republicId;         // Республика регистрации
        NotaryRank rank;
        NotaryStatus status;
        uint256 totalDeals;         // Общее количество сделок
        uint256 totalVolume;        // Общий объём сделок в ALTAN
        uint256 complaints;         // Количество жалоб
        uint64 registeredAt;
        uint64 lastDealAt;
        bool exists;
    }

    /*//////////////////////////////////////////////////////////////
                            CONSTANTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Лимиты по рангам (в базовых единицах ALTAN, 6 decimals)
    uint256 public constant JUNIOR_LIMIT = 10_000 * 1e6;    // 10,000 ALTAN
    uint256 public constant SENIOR_LIMIT = 100_000 * 1e6;   // 100,000 ALTAN
    // MASTER - без лимита

    /// @notice Минимум сделок для повышения ранга
    uint256 public constant DEALS_FOR_SENIOR = 50;   // 50 сделок для Senior
    uint256 public constant DEALS_FOR_MASTER = 200;  // 200 сделок для Master

    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    uint256 public nextNotaryId;

    mapping(uint256 => Notary) public notaries;
    mapping(address => uint256) public notaryIdByAddress;
    mapping(bytes32 => uint256[]) public notariesByRepublic;  // republicId => notaryIds[]

    uint256 public totalActiveNotaries;
    uint256 public totalDealsProcessed;

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _khural) {
        if (_khural == address(0)) revert ZeroAddress();

        _grantRole(DEFAULT_ADMIN_ROLE, _khural);
        _grantRole(KHURAL_ROLE, _khural);
        _grantRole(REGISTRAR_ROLE, _khural);
    }

    /*//////////////////////////////////////////////////////////////
                        РЕГИСТРАЦИЯ НОТАРИУСОВ
    //////////////////////////////////////////////////////////////*/

    /// @notice Зарегистрировать нового нотариуса
    function registerNotary(
        address wallet,
        string calldata fullName,
        string calldata licenseNumber,
        bytes32 republicId
    ) external onlyRole(REGISTRAR_ROLE) returns (uint256 notaryId) {
        if (wallet == address(0)) revert ZeroAddress();
        if (bytes(fullName).length == 0) revert InvalidInput();
        if (bytes(licenseNumber).length == 0) revert InvalidInput();
        if (notaryIdByAddress[wallet] != 0) revert NotaryAlreadyExists();

        notaryId = ++nextNotaryId;

        notaries[notaryId] = Notary({
            id: notaryId,
            wallet: wallet,
            fullName: fullName,
            licenseNumber: licenseNumber,
            republicId: republicId,
            rank: NotaryRank.JUNIOR,
            status: NotaryStatus.ACTIVE,
            totalDeals: 0,
            totalVolume: 0,
            complaints: 0,
            registeredAt: uint64(block.timestamp),
            lastDealAt: 0,
            exists: true
        });

        notaryIdByAddress[wallet] = notaryId;
        notariesByRepublic[republicId].push(notaryId);
        totalActiveNotaries++;

        emit NotaryRegistered(wallet, notaryId, NotaryRank.JUNIOR, fullName);
    }

    /*//////////////////////////////////////////////////////////////
                        УПРАВЛЕНИЕ РАНГАМИ
    //////////////////////////////////////////////////////////////*/

    /// @notice Повысить ранг нотариуса (только Хурал после аттестации)
    function promoteNotary(address wallet) external onlyRole(KHURAL_ROLE) {
        uint256 notaryId = notaryIdByAddress[wallet];
        if (notaryId == 0) revert NotaryNotFound();

        Notary storage n = notaries[notaryId];
        if (n.status != NotaryStatus.ACTIVE) revert NotaryNotActive();

        NotaryRank oldRank = n.rank;
        NotaryRank newRank;

        if (oldRank == NotaryRank.JUNIOR && n.totalDeals >= DEALS_FOR_SENIOR) {
            newRank = NotaryRank.SENIOR;
        } else if (oldRank == NotaryRank.SENIOR && n.totalDeals >= DEALS_FOR_MASTER) {
            newRank = NotaryRank.MASTER;
        } else {
            revert InvalidRank();
        }

        n.rank = newRank;

        emit NotaryRankChanged(wallet, oldRank, newRank);
    }

    /// @notice Понизить ранг нотариуса (за нарушения)
    function demoteNotary(address wallet) external onlyRole(KHURAL_ROLE) {
        uint256 notaryId = notaryIdByAddress[wallet];
        if (notaryId == 0) revert NotaryNotFound();

        Notary storage n = notaries[notaryId];
        if (n.rank == NotaryRank.JUNIOR) revert CannotDemote();

        NotaryRank oldRank = n.rank;
        NotaryRank newRank;

        if (oldRank == NotaryRank.MASTER) {
            newRank = NotaryRank.SENIOR;
        } else if (oldRank == NotaryRank.SENIOR) {
            newRank = NotaryRank.JUNIOR;
        } else {
            revert CannotDemote();
        }

        n.rank = newRank;

        emit NotaryRankChanged(wallet, oldRank, newRank);
    }

    /*//////////////////////////////////////////////////////////////
                        УПРАВЛЕНИЕ СТАТУСОМ
    //////////////////////////////////////////////////////////////*/

    /// @notice Приостановить лицензию нотариуса
    function suspendNotary(address wallet) external onlyRole(KHURAL_ROLE) {
        uint256 notaryId = notaryIdByAddress[wallet];
        if (notaryId == 0) revert NotaryNotFound();

        Notary storage n = notaries[notaryId];
        NotaryStatus oldStatus = n.status;

        n.status = NotaryStatus.SUSPENDED;
        if (oldStatus == NotaryStatus.ACTIVE) {
            totalActiveNotaries--;
        }

        emit NotaryStatusChanged(wallet, oldStatus, NotaryStatus.SUSPENDED);
    }

    /// @notice Восстановить лицензию нотариуса
    function reinstateNotary(address wallet) external onlyRole(KHURAL_ROLE) {
        uint256 notaryId = notaryIdByAddress[wallet];
        if (notaryId == 0) revert NotaryNotFound();

        Notary storage n = notaries[notaryId];
        if (n.status == NotaryStatus.REVOKED) revert NotaryNotActive();

        NotaryStatus oldStatus = n.status;
        n.status = NotaryStatus.ACTIVE;

        if (oldStatus != NotaryStatus.ACTIVE) {
            totalActiveNotaries++;
        }

        emit NotaryStatusChanged(wallet, oldStatus, NotaryStatus.ACTIVE);
    }

    /// @notice Отозвать лицензию нотариуса (навсегда)
    function revokeNotary(address wallet) external onlyRole(KHURAL_ROLE) {
        uint256 notaryId = notaryIdByAddress[wallet];
        if (notaryId == 0) revert NotaryNotFound();

        Notary storage n = notaries[notaryId];
        NotaryStatus oldStatus = n.status;

        n.status = NotaryStatus.REVOKED;
        if (oldStatus == NotaryStatus.ACTIVE) {
            totalActiveNotaries--;
        }

        emit NotaryStatusChanged(wallet, oldStatus, NotaryStatus.REVOKED);
    }

    /*//////////////////////////////////////////////////////////////
                        ЗАПИСЬ СДЕЛОК
    //////////////////////////////////////////////////////////////*/

    /// @notice Записать завершённую сделку (вызывается контрактом BusinessAgreement)
    function recordDeal(
        address notaryWallet,
        uint256 dealAmount
    ) external onlyRole(REGISTRAR_ROLE) {
        uint256 notaryId = notaryIdByAddress[notaryWallet];
        if (notaryId == 0) revert NotaryNotFound();

        Notary storage n = notaries[notaryId];
        if (n.status != NotaryStatus.ACTIVE) revert NotaryNotActive();

        n.totalDeals++;
        n.totalVolume += dealAmount;
        n.lastDealAt = uint64(block.timestamp);
        totalDealsProcessed++;

        emit DealRecorded(notaryWallet, dealAmount, n.totalDeals);
    }

    /// @notice Подать жалобу на нотариуса
    function fileComplaint(
        address notaryWallet,
        string calldata reason
    ) external {
        uint256 notaryId = notaryIdByAddress[notaryWallet];
        if (notaryId == 0) revert NotaryNotFound();
        if (bytes(reason).length == 0) revert InvalidInput();

        Notary storage n = notaries[notaryId];
        n.complaints++;

        emit ComplaintFiled(notaryWallet, msg.sender, reason);
    }

    /*//////////////////////////////////////////////////////////////
                        ПРОВЕРКИ И ВАЛИДАЦИЯ
    //////////////////////////////////////////////////////////////*/

    /// @notice Проверить, может ли нотариус заверить сделку на указанную сумму
    function canCertifyDeal(address notaryWallet, uint256 dealAmount) external view returns (bool) {
        uint256 notaryId = notaryIdByAddress[notaryWallet];
        if (notaryId == 0) return false;

        Notary storage n = notaries[notaryId];
        if (n.status != NotaryStatus.ACTIVE) return false;

        return getDealLimit(n.rank) >= dealAmount;
    }

    /// @notice Получить лимит суммы сделки для ранга
    function getDealLimit(NotaryRank rank) public pure returns (uint256) {
        if (rank == NotaryRank.JUNIOR) return JUNIOR_LIMIT;
        if (rank == NotaryRank.SENIOR) return SENIOR_LIMIT;
        if (rank == NotaryRank.MASTER) return type(uint256).max;
        return 0;
    }

    /// @notice Проверить, является ли адрес активным нотариусом
    function isActiveNotary(address wallet) external view returns (bool) {
        uint256 notaryId = notaryIdByAddress[wallet];
        if (notaryId == 0) return false;
        return notaries[notaryId].status == NotaryStatus.ACTIVE;
    }

    /*//////////////////////////////////////////////////////////////
                        ФУНКЦИИ ЧТЕНИЯ
    //////////////////////////////////////////////////////////////*/

    /// @notice Получить информацию о нотариусе
    function getNotary(address wallet) external view returns (Notary memory) {
        uint256 notaryId = notaryIdByAddress[wallet];
        if (notaryId == 0) revert NotaryNotFound();
        return notaries[notaryId];
    }

    /// @notice Получить нотариуса по ID
    function getNotaryById(uint256 notaryId) external view returns (Notary memory) {
        if (!notaries[notaryId].exists) revert NotaryNotFound();
        return notaries[notaryId];
    }

    /// @notice Получить нотариусов республики
    function getNotariesByRepublic(bytes32 republicId) external view returns (Notary[] memory) {
        uint256[] storage ids = notariesByRepublic[republicId];
        Notary[] memory result = new Notary[](ids.length);

        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = notaries[ids[i]];
        }

        return result;
    }

    /// @notice Получить название ранга
    function getRankName(NotaryRank rank) external pure returns (string memory) {
        if (rank == NotaryRank.JUNIOR) return unicode"Младший нотариус";
        if (rank == NotaryRank.SENIOR) return unicode"Старший нотариус";
        if (rank == NotaryRank.MASTER) return unicode"Мастер-нотариус";
        return unicode"Не нотариус";
    }

    /// @notice Получить статистику реестра
    function getStats() external view returns (
        uint256 _totalNotaries,
        uint256 _activeNotaries,
        uint256 _totalDeals
    ) {
        return (nextNotaryId, totalActiveNotaries, totalDealsProcessed);
    }
}
