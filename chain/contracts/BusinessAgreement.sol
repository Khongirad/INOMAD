// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./Altan.sol";
import "./EscrowBank.sol";
import "./NotaryRegistry.sol";

/**
 * @title BusinessAgreement
 * @notice Контракт-артефакт для бизнес-сделок Сибирской Конфедерации
 *
 * Три стороны сделки:
 * 1. Покупатель (Party A) — заказчик услуг/товаров
 * 2. Продавец (Party B) — исполнитель/поставщик
 * 3. Нотариус (опционально) — заверяет крупные сделки
 *
 * Банк — нейтральная инфраструктура:
 * - Предоставляет счета
 * - Хранит эскроу
 * - Выполняет распределение средств
 *
 * Этапы бизнес-процесса:
 * 1. DRAFT — Черновик договора о сотрудничестве
 * 2. LEGAL_REVIEW — Проверка юристами
 * 3. SIGNING — Подписание договора
 * 4. FUNDED — Эскроу пополнен
 * 5. IN_PROGRESS — Выполнение работ
 * 6. ACCEPTANCE — Акт приёмки и сдачи
 * 7. PAYMENT — Оплата
 * 8. COMPLETED — Завершено
 *
 * Также возможны статусы: CANCELLED, DISPUTED
 */
contract BusinessAgreement is AccessControl, ReentrancyGuard {
    /*//////////////////////////////////////////////////////////////
                                ROLES
    //////////////////////////////////////////////////////////////*/

    bytes32 public constant KHURAL_ROLE = keccak256("KHURAL_ROLE");

    /*//////////////////////////////////////////////////////////////
                                ENUMS
    //////////////////////////////////////////////////////////////*/

    /// @notice Этапы сделки
    enum Stage {
        DRAFT,          // 0 - Черновик
        LEGAL_REVIEW,   // 1 - Юридическая проверка
        SIGNING,        // 2 - Подписание
        FUNDED,         // 3 - Эскроу пополнен
        IN_PROGRESS,    // 4 - Выполнение
        ACCEPTANCE,     // 5 - Приёмка
        PAYMENT,        // 6 - Оплата
        COMPLETED,      // 7 - Завершено
        CANCELLED,      // 8 - Отменено
        DISPUTED        // 9 - Спор
    }

    /// @notice Тип сделки
    enum AgreementType {
        SERVICE,        // Услуги
        GOODS,          // Товары
        CONSTRUCTION,   // Строительство
        LEASE,          // Аренда
        LICENSE,        // Лицензирование
        OTHER           // Иное
    }

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error ZeroAddress();
    error InvalidStage();
    error NotParty();
    error NotNotary();
    error AlreadySigned();
    error NotSigned();
    error NotaryRequired();
    error InsufficientNotaryRank();
    error AlreadyAccepted();
    error MilestoneNotCompleted();
    error AgreementNotFound();
    error InvalidInput();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event AgreementCreated(
        uint256 indexed agreementId,
        address indexed partyA,
        address indexed partyB,
        uint256 totalAmount
    );
    event StageChanged(uint256 indexed agreementId, Stage oldStage, Stage newStage);
    event PartySigned(uint256 indexed agreementId, address indexed party);
    event NotaryAssigned(uint256 indexed agreementId, address indexed notary);
    event NotaryCertified(uint256 indexed agreementId, address indexed notary);
    event MilestoneCompleted(uint256 indexed agreementId, uint256 milestoneIndex);
    event AcceptanceSigned(uint256 indexed agreementId, address indexed party);
    event AgreementCompleted(uint256 indexed agreementId);
    event AgreementCancelled(uint256 indexed agreementId, address indexed cancelledBy, string reason);
    event DisputeOpened(uint256 indexed agreementId, address indexed initiator, string reason);

    /*//////////////////////////////////////////////////////////////
                            DATA STRUCTURES
    //////////////////////////////////////////////////////////////*/

    /// @notice Этап работ
    struct Milestone {
        string description;
        uint256 percentage;     // Процент от суммы (100 = 1%)
        bool completed;
        bool accepted;
        uint64 completedAt;
        uint64 acceptedAt;
    }

    /// @notice Договор
    struct Agreement {
        uint256 id;
        AgreementType agreementType;

        // Стороны
        address partyA;             // Покупатель
        address partyB;             // Продавец
        address notary;             // Нотариус (может быть address(0))

        // Финансы
        uint256 totalAmount;
        uint256 escrowId;           // ID эскроу в банке

        // Документы
        string title;
        bytes32 documentHash;       // Хеш документа договора (IPFS/Arweave)
        string documentUri;

        // Статусы подписей
        bool partyASigned;
        bool partyBSigned;
        bool notaryCertified;

        // Акт приёмки
        bool partyAAccepted;
        bool partyBAccepted;

        // Этап и время
        Stage stage;
        uint64 createdAt;
        uint64 signedAt;
        uint64 completedAt;

        // Требуется ли нотариус
        bool notaryRequired;

        bool exists;
    }

    /*//////////////////////////////////////////////////////////////
                                CONSTANTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Сумма, выше которой требуется нотариус
    uint256 public constant NOTARY_THRESHOLD = 50_000 * 1e6;  // 50,000 ALTAN

    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    Altan public immutable altan;
    EscrowBank public immutable bank;
    NotaryRegistry public immutable notaryRegistry;

    uint256 public nextAgreementId;

    mapping(uint256 => Agreement) public agreements;
    mapping(uint256 => Milestone[]) public agreementMilestones;

    // Сделки по участникам
    mapping(address => uint256[]) public agreementsByParty;

    // Статистика
    uint256 public totalAgreements;
    uint256 public completedAgreements;
    uint256 public totalVolume;

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _altan,
        address _bank,
        address _notaryRegistry,
        address _khural
    ) {
        if (_altan == address(0)) revert ZeroAddress();
        if (_bank == address(0)) revert ZeroAddress();
        if (_notaryRegistry == address(0)) revert ZeroAddress();
        if (_khural == address(0)) revert ZeroAddress();

        altan = Altan(_altan);
        bank = EscrowBank(_bank);
        notaryRegistry = NotaryRegistry(_notaryRegistry);

        _grantRole(DEFAULT_ADMIN_ROLE, _khural);
        _grantRole(KHURAL_ROLE, _khural);
    }

    /*//////////////////////////////////////////////////////////////
                        СОЗДАНИЕ ДОГОВОРА
    //////////////////////////////////////////////////////////////*/

    /// @notice Создать новый договор (черновик)
    function createAgreement(
        address partyB,
        uint256 totalAmount,
        AgreementType agreementType,
        string calldata title,
        bytes32 documentHash,
        string calldata documentUri,
        string[] calldata milestoneDescriptions,
        uint256[] calldata milestonePercentages,
        bool requireNotary
    ) external returns (uint256 agreementId) {
        if (partyB == address(0)) revert ZeroAddress();
        if (partyB == msg.sender) revert InvalidInput();
        if (totalAmount == 0) revert InvalidInput();
        if (bytes(title).length == 0) revert InvalidInput();
        if (milestoneDescriptions.length != milestonePercentages.length) revert InvalidInput();

        // Проверяем проценты
        uint256 totalPercentage;
        for (uint256 i = 0; i < milestonePercentages.length; i++) {
            totalPercentage += milestonePercentages[i];
        }
        if (totalPercentage != 10000) revert InvalidInput();

        // Определяем, нужен ли нотариус
        bool notaryNeeded = requireNotary || totalAmount >= NOTARY_THRESHOLD;

        agreementId = ++nextAgreementId;

        agreements[agreementId] = Agreement({
            id: agreementId,
            agreementType: agreementType,
            partyA: msg.sender,
            partyB: partyB,
            notary: address(0),
            totalAmount: totalAmount,
            escrowId: 0,
            title: title,
            documentHash: documentHash,
            documentUri: documentUri,
            partyASigned: false,
            partyBSigned: false,
            notaryCertified: false,
            partyAAccepted: false,
            partyBAccepted: false,
            stage: Stage.DRAFT,
            createdAt: uint64(block.timestamp),
            signedAt: 0,
            completedAt: 0,
            notaryRequired: notaryNeeded,
            exists: true
        });

        // Создаём этапы работ
        for (uint256 i = 0; i < milestoneDescriptions.length; i++) {
            agreementMilestones[agreementId].push(Milestone({
                description: milestoneDescriptions[i],
                percentage: milestonePercentages[i],
                completed: false,
                accepted: false,
                completedAt: 0,
                acceptedAt: 0
            }));
        }

        agreementsByParty[msg.sender].push(agreementId);
        agreementsByParty[partyB].push(agreementId);
        totalAgreements++;

        emit AgreementCreated(agreementId, msg.sender, partyB, totalAmount);
    }

    /*//////////////////////////////////////////////////////////////
                    ЭТАП 1: ЮРИДИЧЕСКАЯ ПРОВЕРКА
    //////////////////////////////////////////////////////////////*/

    /// @notice Перевести договор на юридическую проверку
    function submitForLegalReview(uint256 agreementId) external {
        Agreement storage a = agreements[agreementId];
        _validateAgreement(a);
        _requireParty(a);
        if (a.stage != Stage.DRAFT) revert InvalidStage();

        _changeStage(agreementId, Stage.LEGAL_REVIEW);
    }

    /// @notice Одобрить юридическую проверку (обе стороны)
    function approveLegalReview(uint256 agreementId) external {
        Agreement storage a = agreements[agreementId];
        _validateAgreement(a);
        _requireParty(a);
        if (a.stage != Stage.LEGAL_REVIEW) revert InvalidStage();

        // Юридическое одобрение засчитывается как готовность к подписанию
        // Для простоты переходим к подписанию автоматически
        _changeStage(agreementId, Stage.SIGNING);
    }

    /*//////////////////////////////////////////////////////////////
                    ЭТАП 2: ПОДПИСАНИЕ
    //////////////////////////////////////////////////////////////*/

    /// @notice Назначить нотариуса (если требуется)
    function assignNotary(uint256 agreementId, address notaryAddress) external {
        Agreement storage a = agreements[agreementId];
        _validateAgreement(a);
        _requireParty(a);
        if (a.stage != Stage.SIGNING && a.stage != Stage.LEGAL_REVIEW) revert InvalidStage();

        if (!a.notaryRequired) revert InvalidInput();

        // Проверяем нотариуса
        if (!notaryRegistry.isActiveNotary(notaryAddress)) revert NotNotary();

        // Проверяем ранг нотариуса
        if (!notaryRegistry.canCertifyDeal(notaryAddress, a.totalAmount)) {
            revert InsufficientNotaryRank();
        }

        a.notary = notaryAddress;
        agreementsByParty[notaryAddress].push(agreementId);

        emit NotaryAssigned(agreementId, notaryAddress);
    }

    /// @notice Подписать договор (сторона)
    function signAgreement(uint256 agreementId) external {
        Agreement storage a = agreements[agreementId];
        _validateAgreement(a);
        if (a.stage != Stage.SIGNING) revert InvalidStage();

        if (msg.sender == a.partyA) {
            if (a.partyASigned) revert AlreadySigned();
            a.partyASigned = true;
        } else if (msg.sender == a.partyB) {
            if (a.partyBSigned) revert AlreadySigned();
            a.partyBSigned = true;
        } else {
            revert NotParty();
        }

        emit PartySigned(agreementId, msg.sender);

        // Проверяем, все ли подписали
        _checkAllSigned(agreementId);
    }

    /// @notice Заверить договор (нотариус)
    function certifyAgreement(uint256 agreementId) external {
        Agreement storage a = agreements[agreementId];
        _validateAgreement(a);
        if (a.stage != Stage.SIGNING) revert InvalidStage();
        if (msg.sender != a.notary) revert NotNotary();
        if (a.notaryCertified) revert AlreadySigned();

        a.notaryCertified = true;

        emit NotaryCertified(agreementId, msg.sender);

        _checkAllSigned(agreementId);
    }

    /// @notice Проверить, все ли стороны подписали
    function _checkAllSigned(uint256 agreementId) internal {
        Agreement storage a = agreements[agreementId];

        bool allSigned = a.partyASigned && a.partyBSigned;

        if (a.notaryRequired) {
            if (a.notary == address(0)) return;  // Нотариус ещё не назначен
            allSigned = allSigned && a.notaryCertified;
        }

        if (allSigned) {
            a.signedAt = uint64(block.timestamp);

            // Создаём эскроу в банке
            string[] memory milestoneDescs = new string[](agreementMilestones[agreementId].length);
            uint256[] memory milestonePercs = new uint256[](agreementMilestones[agreementId].length);

            for (uint256 i = 0; i < agreementMilestones[agreementId].length; i++) {
                milestoneDescs[i] = agreementMilestones[agreementId][i].description;
                milestonePercs[i] = agreementMilestones[agreementId][i].percentage;
            }

            uint256 escrowId = bank.createEscrow(
                a.partyA,
                a.partyB,
                a.totalAmount,
                a.title,
                milestonePercs,
                milestoneDescs
            );

            a.escrowId = escrowId;

            _changeStage(agreementId, Stage.FUNDED);
        }
    }

    /*//////////////////////////////////////////////////////////////
                    ЭТАП 3: ПОПОЛНЕНИЕ ЭСКРОУ
    //////////////////////////////////////////////////////////////*/

    /// @notice Пополнить эскроу (покупатель)
    function fundAgreement(uint256 agreementId) external nonReentrant {
        Agreement storage a = agreements[agreementId];
        _validateAgreement(a);
        if (a.stage != Stage.FUNDED) revert InvalidStage();
        if (msg.sender != a.partyA) revert NotParty();

        bank.fundEscrow(a.escrowId);

        _changeStage(agreementId, Stage.IN_PROGRESS);
    }

    /*//////////////////////////////////////////////////////////////
                    ЭТАП 4: ВЫПОЛНЕНИЕ РАБОТ
    //////////////////////////////////////////////////////////////*/

    /// @notice Отметить этап работ как завершённый (продавец)
    function completeMilestone(uint256 agreementId, uint256 milestoneIndex) external {
        Agreement storage a = agreements[agreementId];
        _validateAgreement(a);
        if (a.stage != Stage.IN_PROGRESS) revert InvalidStage();
        if (msg.sender != a.partyB) revert NotParty();

        Milestone[] storage milestones = agreementMilestones[agreementId];
        if (milestoneIndex >= milestones.length) revert InvalidInput();

        Milestone storage m = milestones[milestoneIndex];
        if (m.completed) revert MilestoneNotCompleted();

        m.completed = true;
        m.completedAt = uint64(block.timestamp);

        emit MilestoneCompleted(agreementId, milestoneIndex);
    }

    /*//////////////////////////////////////////////////////////////
                    ЭТАП 5: ПРИЁМКА
    //////////////////////////////////////////////////////////////*/

    /// @notice Принять выполненный этап (покупатель)
    function acceptMilestone(uint256 agreementId, uint256 milestoneIndex) external {
        Agreement storage a = agreements[agreementId];
        _validateAgreement(a);
        if (a.stage != Stage.IN_PROGRESS && a.stage != Stage.ACCEPTANCE) revert InvalidStage();
        if (msg.sender != a.partyA) revert NotParty();

        Milestone[] storage milestones = agreementMilestones[agreementId];
        if (milestoneIndex >= milestones.length) revert InvalidInput();

        Milestone storage m = milestones[milestoneIndex];
        if (!m.completed) revert MilestoneNotCompleted();
        if (m.accepted) revert AlreadyAccepted();

        m.accepted = true;
        m.acceptedAt = uint64(block.timestamp);

        // Выплачиваем этап из эскроу
        bank.releaseMilestone(a.escrowId, milestoneIndex);

        emit AcceptanceSigned(agreementId, msg.sender);

        // Проверяем, все ли этапы приняты
        _checkAllMilestonesAccepted(agreementId);
    }

    /// @notice Принять все оставшиеся этапы сразу
    function acceptAll(uint256 agreementId) external {
        Agreement storage a = agreements[agreementId];
        _validateAgreement(a);
        if (a.stage != Stage.IN_PROGRESS && a.stage != Stage.ACCEPTANCE) revert InvalidStage();
        if (msg.sender != a.partyA) revert NotParty();

        Milestone[] storage milestones = agreementMilestones[agreementId];

        // Проверяем, что все этапы завершены
        for (uint256 i = 0; i < milestones.length; i++) {
            if (!milestones[i].completed) revert MilestoneNotCompleted();
        }

        // Принимаем все
        for (uint256 i = 0; i < milestones.length; i++) {
            if (!milestones[i].accepted) {
                milestones[i].accepted = true;
                milestones[i].acceptedAt = uint64(block.timestamp);
            }
        }

        // Выплачиваем всё из эскроу
        bank.releaseAll(a.escrowId);

        a.partyAAccepted = true;
        a.partyBAccepted = true;

        _changeStage(agreementId, Stage.PAYMENT);

        // Записываем сделку нотариусу (если есть)
        if (a.notary != address(0)) {
            notaryRegistry.recordDeal(a.notary, a.totalAmount);
        }

        _completeAgreement(agreementId);
    }

    function _checkAllMilestonesAccepted(uint256 agreementId) internal {
        Agreement storage a = agreements[agreementId];
        Milestone[] storage milestones = agreementMilestones[agreementId];

        bool allAccepted = true;
        for (uint256 i = 0; i < milestones.length; i++) {
            if (!milestones[i].accepted) {
                allAccepted = false;
                break;
            }
        }

        if (allAccepted) {
            a.partyAAccepted = true;
            a.partyBAccepted = true;

            _changeStage(agreementId, Stage.PAYMENT);

            // Записываем сделку нотариусу
            if (a.notary != address(0)) {
                notaryRegistry.recordDeal(a.notary, a.totalAmount);
            }

            _completeAgreement(agreementId);
        } else {
            if (a.stage == Stage.IN_PROGRESS) {
                _changeStage(agreementId, Stage.ACCEPTANCE);
            }
        }
    }

    /*//////////////////////////////////////////////////////////////
                    ЗАВЕРШЕНИЕ / ОТМЕНА
    //////////////////////////////////////////////////////////////*/

    function _completeAgreement(uint256 agreementId) internal {
        Agreement storage a = agreements[agreementId];

        a.completedAt = uint64(block.timestamp);
        totalVolume += a.totalAmount;
        completedAgreements++;

        _changeStage(agreementId, Stage.COMPLETED);

        emit AgreementCompleted(agreementId);
    }

    /// @notice Отменить договор (до пополнения эскроу)
    function cancelAgreement(uint256 agreementId, string calldata reason) external {
        Agreement storage a = agreements[agreementId];
        _validateAgreement(a);
        _requireParty(a);

        // Можно отменить только до IN_PROGRESS
        if (uint8(a.stage) >= uint8(Stage.IN_PROGRESS)) revert InvalidStage();

        _changeStage(agreementId, Stage.CANCELLED);

        emit AgreementCancelled(agreementId, msg.sender, reason);
    }

    /// @notice Открыть спор
    function openDispute(uint256 agreementId, string calldata reason) external {
        Agreement storage a = agreements[agreementId];
        _validateAgreement(a);
        _requireParty(a);

        if (a.stage == Stage.COMPLETED || a.stage == Stage.CANCELLED) revert InvalidStage();

        _changeStage(agreementId, Stage.DISPUTED);

        // Открываем спор в банке
        if (a.escrowId != 0) {
            bank.openDispute(a.escrowId, reason);
        }

        emit DisputeOpened(agreementId, msg.sender, reason);
    }

    /*//////////////////////////////////////////////////////////////
                        ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
    //////////////////////////////////////////////////////////////*/

    function _validateAgreement(Agreement storage a) internal view {
        if (!a.exists) revert AgreementNotFound();
    }

    function _requireParty(Agreement storage a) internal view {
        if (msg.sender != a.partyA && msg.sender != a.partyB && msg.sender != a.notary) {
            revert NotParty();
        }
    }

    function _changeStage(uint256 agreementId, Stage newStage) internal {
        Agreement storage a = agreements[agreementId];
        Stage oldStage = a.stage;
        a.stage = newStage;

        emit StageChanged(agreementId, oldStage, newStage);
    }

    /*//////////////////////////////////////////////////////////////
                        ФУНКЦИИ ЧТЕНИЯ
    //////////////////////////////////////////////////////////////*/

    /// @notice Получить договор
    function getAgreement(uint256 agreementId) external view returns (Agreement memory) {
        if (!agreements[agreementId].exists) revert AgreementNotFound();
        return agreements[agreementId];
    }

    /// @notice Получить этапы работ
    function getMilestones(uint256 agreementId) external view returns (Milestone[] memory) {
        if (!agreements[agreementId].exists) revert AgreementNotFound();
        return agreementMilestones[agreementId];
    }

    /// @notice Получить договоры участника
    function getAgreementsByParty(address party) external view returns (uint256[] memory) {
        return agreementsByParty[party];
    }

    /// @notice Получить название этапа
    function getStageName(Stage stage) external pure returns (string memory) {
        if (stage == Stage.DRAFT) return unicode"Черновик";
        if (stage == Stage.LEGAL_REVIEW) return unicode"Юридическая проверка";
        if (stage == Stage.SIGNING) return unicode"Подписание";
        if (stage == Stage.FUNDED) return unicode"Эскроу пополнен";
        if (stage == Stage.IN_PROGRESS) return unicode"Выполнение";
        if (stage == Stage.ACCEPTANCE) return unicode"Приёмка";
        if (stage == Stage.PAYMENT) return unicode"Оплата";
        if (stage == Stage.COMPLETED) return unicode"Завершено";
        if (stage == Stage.CANCELLED) return unicode"Отменено";
        if (stage == Stage.DISPUTED) return unicode"Спор";
        return unicode"Неизвестно";
    }

    /// @notice Получить статистику
    function getStats() external view returns (
        uint256 _totalAgreements,
        uint256 _completedAgreements,
        uint256 _totalVolume
    ) {
        return (totalAgreements, completedAgreements, totalVolume);
    }
}
