// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./CitizenDocument.sol";

/**
 * @title OfficialOath
 * @notice Система клятв для государственных организаций Сибирской Конфедерации
 *
 * ═══════════════════════════════════════════════════════════════
 *     КЛЯТВА СЛУЖИТЕЛЯ НАРОДА
 *     "Без клятвы нет государства"
 * ═══════════════════════════════════════════════════════════════
 *
 * Каждая государственная организация и каждый чиновник
 * обязаны принести клятву служить народу и защищать его
 * от внешних и внутренних врагов.
 *
 * ТИПЫ КЛЯТВ:
 * 1. КЛЯТВА ЧИНОВНИКА - для государственных служащих
 * 2. КЛЯТВА ОРГАНИЗАЦИИ - для государственных органов
 * 3. КЛЯТВА ЗАЩИТНИКА - для армии и правоохранительных органов
 * 4. КЛЯТВА СУДЬИ - для судебной системы
 * 5. КЛЯТВА ДЕПУТАТА - для членов Хурала
 *
 * "Власть — это служение народу, а не привилегия."
 */
contract OfficialOath is AccessControl {
    /*//////////////////////////////////////////////////////////////
                                ROLES
    //////////////////////////////////////////////////////////////*/

    bytes32 public constant KHURAL_ROLE = keccak256("KHURAL_ROLE");
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    bytes32 public constant OATH_WITNESS_ROLE = keccak256("OATH_WITNESS_ROLE");

    /*//////////////////////////////////////////////////////////////
                                ENUMS
    //////////////////////////////////////////////////////////////*/

    /// @notice Типы официальных клятв
    enum OathType {
        OFFICIAL,       // 0 - Клятва чиновника
        ORGANIZATION,   // 1 - Клятва организации
        DEFENDER,       // 2 - Клятва защитника (армия, полиция)
        JUDGE,          // 3 - Клятва судьи
        DEPUTY          // 4 - Клятва депутата Хурала
    }

    /// @notice Статус клятвы
    enum OathStatus {
        ACTIVE,         // 0 - Действующая
        SUSPENDED,      // 1 - Приостановлена (расследование)
        REVOKED,        // 2 - Отозвана (нарушение)
        EXPIRED         // 3 - Истекла (конец срока полномочий)
    }

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error ZeroAddress();
    error NotACitizen();
    error OathAlreadyTaken();
    error OathNotFound();
    error InvalidOathType();
    error CannotRevokeOwnOath();
    error OrganizationNotRegistered();
    error InvalidOrganization();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event OfficialOathTaken(
        uint256 indexed oathId,
        address indexed official,
        OathType oathType,
        bytes32 indexed organizationId,
        uint64 timestamp
    );

    event OrganizationOathTaken(
        uint256 indexed oathId,
        bytes32 indexed organizationId,
        string organizationName,
        address representative,
        uint64 timestamp
    );

    event OathStatusChanged(
        uint256 indexed oathId,
        OathStatus oldStatus,
        OathStatus newStatus,
        string reason
    );

    event OrganizationRegistered(
        bytes32 indexed organizationId,
        string name,
        bytes32 indexed republicId
    );

    /*//////////////////////////////////////////////////////////////
                            DATA STRUCTURES
    //////////////////////////////////////////////////////////////*/

    /// @notice Клятва официального лица
    struct Oath {
        uint256 id;
        address official;           // Адрес чиновника
        bytes32 organizationId;     // ID организации (0 = личная клятва)
        OathType oathType;
        OathStatus status;
        bytes32 oathHash;           // Хеш клятвы
        string position;            // Должность
        uint64 takenAt;             // Дата принятия
        uint64 expiresAt;           // Дата истечения (0 = бессрочно)
        address witness;            // Свидетель клятвы
        bool exists;
    }

    /// @notice Государственная организация
    struct Organization {
        bytes32 id;
        string name;                // Название
        string nameLocal;           // Название на местном языке
        bytes32 republicId;         // К какой республике относится (0 = федеральная)
        address representative;     // Официальный представитель
        uint256 oathId;             // ID клятвы организации
        bool active;
        bool exists;
        uint64 registeredAt;
    }

    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    CitizenDocument public immutable citizenDocument;

    uint256 public nextOathId;
    uint256 public nextOrganizationId;

    mapping(uint256 => Oath) public oaths;
    mapping(address => uint256[]) public oathsByOfficial;      // official => oathIds[]
    mapping(bytes32 => Organization) public organizations;
    bytes32[] public organizationIds;

    // Статистика
    uint256 public totalOathsTaken;
    uint256 public activeOaths;
    uint256 public totalOrganizations;

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _citizenDocument,
        address _khural
    ) {
        if (_citizenDocument == address(0)) revert ZeroAddress();
        if (_khural == address(0)) revert ZeroAddress();

        citizenDocument = CitizenDocument(_citizenDocument);

        _grantRole(DEFAULT_ADMIN_ROLE, _khural);
        _grantRole(KHURAL_ROLE, _khural);
        _grantRole(REGISTRAR_ROLE, _khural);
        _grantRole(OATH_WITNESS_ROLE, _khural);
    }

    /*//////////////////////////////////////////////////////////////
                    РЕГИСТРАЦИЯ ОРГАНИЗАЦИЙ
    //////////////////////////////////////////////////////////////*/

    /// @notice Зарегистрировать государственную организацию
    function registerOrganization(
        string calldata name,
        string calldata nameLocal,
        bytes32 republicId,
        address representative
    ) external onlyRole(KHURAL_ROLE) returns (bytes32 orgId) {
        if (bytes(name).length == 0) revert InvalidOrganization();
        if (representative == address(0)) revert ZeroAddress();

        // Представитель должен быть гражданином
        if (!citizenDocument.hasActiveDocument(representative)) revert NotACitizen();

        orgId = keccak256(abi.encodePacked("ORG:", name, republicId));
        if (organizations[orgId].exists) revert OathAlreadyTaken();

        organizations[orgId] = Organization({
            id: orgId,
            name: name,
            nameLocal: nameLocal,
            republicId: republicId,
            representative: representative,
            oathId: 0,
            active: true,
            exists: true,
            registeredAt: uint64(block.timestamp)
        });

        organizationIds.push(orgId);
        totalOrganizations++;

        emit OrganizationRegistered(orgId, name, republicId);
    }

    /*//////////////////////////////////////////////////////////////
                    ПРИНЯТИЕ КЛЯТВ
    //////////////////////////////////////////////////////////////*/

    /// @notice Принять клятву чиновника
    /// @param oathType Тип клятвы
    /// @param organizationId ID организации (0 = независимая должность)
    /// @param position Название должности
    /// @param expiresAt Дата истечения полномочий (0 = бессрочно)
    function takeOfficialOath(
        OathType oathType,
        bytes32 organizationId,
        string calldata position,
        uint64 expiresAt
    ) external returns (uint256 oathId) {
        // Проверяем гражданство
        if (!citizenDocument.hasActiveDocument(msg.sender)) revert NotACitizen();

        // Проверяем организацию (если указана)
        if (organizationId != bytes32(0)) {
            if (!organizations[organizationId].exists) revert OrganizationNotRegistered();
        }

        oathId = ++nextOathId;

        // Генерируем хеш клятвы
        bytes32 oathHash = keccak256(abi.encodePacked(
            msg.sender,
            oathType,
            organizationId,
            position,
            block.timestamp,
            "OFFICIAL_OATH"
        ));

        oaths[oathId] = Oath({
            id: oathId,
            official: msg.sender,
            organizationId: organizationId,
            oathType: oathType,
            status: OathStatus.ACTIVE,
            oathHash: oathHash,
            position: position,
            takenAt: uint64(block.timestamp),
            expiresAt: expiresAt,
            witness: address(0),  // Будет установлен свидетелем
            exists: true
        });

        oathsByOfficial[msg.sender].push(oathId);
        totalOathsTaken++;
        activeOaths++;

        emit OfficialOathTaken(oathId, msg.sender, oathType, organizationId, uint64(block.timestamp));
    }

    /// @notice Свидетель подтверждает клятву
    function witnessOath(uint256 oathId) external onlyRole(OATH_WITNESS_ROLE) {
        Oath storage oath = oaths[oathId];
        if (!oath.exists) revert OathNotFound();

        oath.witness = msg.sender;
    }

    /// @notice Принять клятву от имени организации
    function takeOrganizationOath(
        bytes32 organizationId
    ) external returns (uint256 oathId) {
        Organization storage org = organizations[organizationId];
        if (!org.exists) revert OrganizationNotRegistered();

        // Только представитель может принять клятву от организации
        if (msg.sender != org.representative) revert InvalidOrganization();

        // Организация уже приняла клятву
        if (org.oathId != 0) revert OathAlreadyTaken();

        oathId = ++nextOathId;

        bytes32 oathHash = keccak256(abi.encodePacked(
            organizationId,
            org.name,
            msg.sender,
            block.timestamp,
            "ORGANIZATION_OATH"
        ));

        oaths[oathId] = Oath({
            id: oathId,
            official: msg.sender,
            organizationId: organizationId,
            oathType: OathType.ORGANIZATION,
            status: OathStatus.ACTIVE,
            oathHash: oathHash,
            position: unicode"Представитель организации",
            takenAt: uint64(block.timestamp),
            expiresAt: 0,  // Организационная клятва бессрочна
            witness: address(0),
            exists: true
        });

        org.oathId = oathId;
        totalOathsTaken++;
        activeOaths++;

        emit OrganizationOathTaken(oathId, organizationId, org.name, msg.sender, uint64(block.timestamp));
    }

    /*//////////////////////////////////////////////////////////////
                    УПРАВЛЕНИЕ КЛЯТВАМИ
    //////////////////////////////////////////////////////////////*/

    /// @notice Приостановить клятву (начало расследования)
    function suspendOath(uint256 oathId, string calldata reason) external onlyRole(KHURAL_ROLE) {
        Oath storage oath = oaths[oathId];
        if (!oath.exists) revert OathNotFound();
        if (oath.official == msg.sender) revert CannotRevokeOwnOath();

        OathStatus oldStatus = oath.status;
        oath.status = OathStatus.SUSPENDED;

        emit OathStatusChanged(oathId, oldStatus, OathStatus.SUSPENDED, reason);
    }

    /// @notice Восстановить клятву
    function reinstateOath(uint256 oathId, string calldata reason) external onlyRole(KHURAL_ROLE) {
        Oath storage oath = oaths[oathId];
        if (!oath.exists) revert OathNotFound();
        if (oath.status != OathStatus.SUSPENDED) revert OathNotFound();

        OathStatus oldStatus = oath.status;
        oath.status = OathStatus.ACTIVE;

        emit OathStatusChanged(oathId, oldStatus, OathStatus.ACTIVE, reason);
    }

    /// @notice Отозвать клятву (нарушение обязательств)
    function revokeOath(uint256 oathId, string calldata reason) external onlyRole(KHURAL_ROLE) {
        Oath storage oath = oaths[oathId];
        if (!oath.exists) revert OathNotFound();
        if (oath.official == msg.sender) revert CannotRevokeOwnOath();

        OathStatus oldStatus = oath.status;
        oath.status = OathStatus.REVOKED;
        activeOaths--;

        emit OathStatusChanged(oathId, oldStatus, OathStatus.REVOKED, reason);
    }

    /// @notice Отметить истечение срока полномочий
    function expireOath(uint256 oathId) external onlyRole(REGISTRAR_ROLE) {
        Oath storage oath = oaths[oathId];
        if (!oath.exists) revert OathNotFound();
        if (oath.expiresAt == 0) revert InvalidOathType();  // Бессрочная клятва
        if (oath.expiresAt > block.timestamp) revert InvalidOathType();  // Ещё не истекла

        OathStatus oldStatus = oath.status;
        oath.status = OathStatus.EXPIRED;
        activeOaths--;

        emit OathStatusChanged(oathId, oldStatus, OathStatus.EXPIRED, unicode"Срок полномочий истёк");
    }

    /*//////////////////////////////////////////////////////////////
                        ФУНКЦИИ ЧТЕНИЯ
    //////////////////////////////////////////////////////////////*/

    /// @notice Получить клятву по ID
    function getOath(uint256 oathId) external view returns (Oath memory) {
        if (!oaths[oathId].exists) revert OathNotFound();
        return oaths[oathId];
    }

    /// @notice Получить все клятвы чиновника
    function getOathsByOfficial(address official) external view returns (uint256[] memory) {
        return oathsByOfficial[official];
    }

    /// @notice Проверить, есть ли у чиновника активная клятва
    function hasActiveOath(address official) external view returns (bool) {
        uint256[] memory officialOaths = oathsByOfficial[official];
        for (uint256 i = 0; i < officialOaths.length; i++) {
            if (oaths[officialOaths[i]].status == OathStatus.ACTIVE) {
                return true;
            }
        }
        return false;
    }

    /// @notice Проверить, есть ли у чиновника активная клятва определённого типа
    function hasActiveOathOfType(address official, OathType oathType) external view returns (bool) {
        uint256[] memory officialOaths = oathsByOfficial[official];
        for (uint256 i = 0; i < officialOaths.length; i++) {
            Oath storage oath = oaths[officialOaths[i]];
            if (oath.status == OathStatus.ACTIVE && oath.oathType == oathType) {
                return true;
            }
        }
        return false;
    }

    /// @notice Получить организацию
    function getOrganization(bytes32 orgId) external view returns (Organization memory) {
        if (!organizations[orgId].exists) revert OrganizationNotRegistered();
        return organizations[orgId];
    }

    /// @notice Проверить, приняла ли организация клятву
    function hasOrganizationOath(bytes32 orgId) external view returns (bool) {
        if (!organizations[orgId].exists) return false;
        return organizations[orgId].oathId != 0;
    }

    /// @notice Получить все организации
    function getAllOrganizations() external view returns (Organization[] memory) {
        Organization[] memory result = new Organization[](organizationIds.length);
        for (uint256 i = 0; i < organizationIds.length; i++) {
            result[i] = organizations[organizationIds[i]];
        }
        return result;
    }

    /*//////////////////////////////////////////////////////////////
                        ТЕКСТЫ КЛЯТВ
    //////////////////////////////////////////////////////////////*/

    /// @notice Получить текст клятвы чиновника
    function getOfficialOathText() public pure returns (string memory) {
        return unicode"═══════════════════════════════════════════════════════════════\n"
               unicode"           КЛЯТВА СЛУЖИТЕЛЯ НАРОДА\n"
               unicode"═══════════════════════════════════════════════════════════════\n\n"
               unicode"Я, вступая на государственную службу,\n"
               unicode"торжественно клянусь:\n\n"
               unicode"• СЛУЖИТЬ народу Сибирской Конфедерации честно и беспристрастно,\n"
               unicode"  ставя интересы народа выше личных интересов;\n\n"
               unicode"• ЗАЩИЩАТЬ народ от внешних и внутренних врагов,\n"
               unicode"  от произвола и несправедливости;\n\n"
               unicode"• СОБЛЮДАТЬ Конституцию и законы Конфедерации,\n"
               unicode"  Незыблемые Аксиомы и права народов;\n\n"
               unicode"• БЫТЬ ПРОЗРАЧНЫМ в своих действиях и решениях,\n"
               unicode"  не скрывая ничего от тех, кому служу;\n\n"
               unicode"• ОТВЕЧАТЬ перед народом за свои действия\n"
               unicode"  и принимать последствия своих решений.\n\n"
               unicode"Власть — это служение, а не привилегия.\n"
               unicode"Если я нарушу эту клятву, пусть народ лишит меня доверия.\n\n"
               unicode"═══════════════════════════════════════════════════════════════\n"
               unicode"        БЕЗ КЛЯТВЫ НЕТ ВЛАСТИ\n"
               unicode"═══════════════════════════════════════════════════════════════";
    }

    /// @notice Получить текст клятвы защитника
    function getDefenderOathText() public pure returns (string memory) {
        return unicode"═══════════════════════════════════════════════════════════════\n"
               unicode"           КЛЯТВА ЗАЩИТНИКА НАРОДА\n"
               unicode"═══════════════════════════════════════════════════════════════\n\n"
               unicode"Я, вступая в ряды защитников Конфедерации,\n"
               unicode"торжественно клянусь:\n\n"
               unicode"• ЗАЩИЩАТЬ землю и народ Сибирской Конфедерации\n"
               unicode"  от всех внешних и внутренних угроз;\n\n"
               unicode"• НИКОГДА не применять силу против собственного народа,\n"
               unicode"  отказываясь от преступных приказов;\n\n"
               unicode"• СТОЯТЬ на страже свободы и достоинства каждого гражданина,\n"
               unicode"  не различая народ, веру или происхождение;\n\n"
               unicode"• БЫТЬ ГОТОВЫМ отдать жизнь за защиту народа,\n"
               unicode"  но никогда не отнимать жизнь невинного;\n\n"
               unicode"• ПОМНИТЬ: я служу народу, а не власти.\n"
               unicode"  Моя верность — земле и людям, не чиновникам.\n\n"
               unicode"Если я нарушу эту клятву, пусть духи предков отвернутся от меня.\n\n"
               unicode"═══════════════════════════════════════════════════════════════\n"
               unicode"        ЗАЩИТНИК НАРОДА — ЩИТ СВОБОДЫ\n"
               unicode"═══════════════════════════════════════════════════════════════";
    }

    /// @notice Получить текст клятвы судьи
    function getJudgeOathText() public pure returns (string memory) {
        return unicode"═══════════════════════════════════════════════════════════════\n"
               unicode"           КЛЯТВА СУДЬИ\n"
               unicode"═══════════════════════════════════════════════════════════════\n\n"
               unicode"Я, вступая в должность судьи,\n"
               unicode"торжественно клянусь:\n\n"
               unicode"• СУДИТЬ справедливо и беспристрастно,\n"
               unicode"  невзирая на лица, статус или богатство;\n\n"
               unicode"• ЗАЩИЩАТЬ права каждого гражданина,\n"
               unicode"  особенно тех, кто не может защитить себя сам;\n\n"
               unicode"• СЛЕДОВАТЬ букве и духу закона,\n"
               unicode"  но помнить, что милосердие — часть справедливости;\n\n"
               unicode"• БЫТЬ НЕПОДКУПНЫМ и независимым,\n"
               unicode"  не поддаваясь давлению власти или толпы;\n\n"
               unicode"• ПОМНИТЬ: я служу Справедливости,\n"
               unicode"  а она не имеет хозяев, кроме Истины.\n\n"
               unicode"Если я нарушу эту клятву, пусть сама Справедливость осудит меня.\n\n"
               unicode"═══════════════════════════════════════════════════════════════\n"
               unicode"        СПРАВЕДЛИВОСТЬ — ОСНОВА ГОСУДАРСТВА\n"
               unicode"═══════════════════════════════════════════════════════════════";
    }

    /// @notice Получить текст клятвы депутата Хурала
    function getDeputyOathText() public pure returns (string memory) {
        return unicode"═══════════════════════════════════════════════════════════════\n"
               unicode"           КЛЯТВА ДЕПУТАТА ХУРАЛА\n"
               unicode"═══════════════════════════════════════════════════════════════\n\n"
               unicode"Я, избранный народом в Великий Хурал,\n"
               unicode"торжественно клянусь:\n\n"
               unicode"• ПРЕДСТАВЛЯТЬ волю и интересы избравшего меня народа,\n"
               unicode"  а не свои личные интересы или интересы партий;\n\n"
               unicode"• ЗАЩИЩАТЬ Незыблемые Аксиомы Конфедерации,\n"
               unicode"  которые стоят выше любых законов и решений;\n\n"
               unicode"• УВАЖАТЬ суверенитет каждого народа и каждой республики,\n"
               unicode"  не допуская централизации власти;\n\n"
               unicode"• БЫТЬ ОТКРЫТЫМ перед избирателями,\n"
               unicode"  отчитываясь за каждое решение и голос;\n\n"
               unicode"• ПОМНИТЬ: мой мандат — от народа,\n"
               unicode"  и народ вправе отозвать меня в любой момент.\n\n"
               unicode"Если я нарушу эту клятву, пусть народ отзовёт меня с позором.\n\n"
               unicode"═══════════════════════════════════════════════════════════════\n"
               unicode"        ХУРАЛ — ГОЛОС НАРОДОВ\n"
               unicode"═══════════════════════════════════════════════════════════════";
    }

    /// @notice Получить текст клятвы организации
    function getOrganizationOathText() public pure returns (string memory) {
        return unicode"═══════════════════════════════════════════════════════════════\n"
               unicode"           КЛЯТВА ГОСУДАРСТВЕННОЙ ОРГАНИЗАЦИИ\n"
               unicode"═══════════════════════════════════════════════════════════════\n\n"
               unicode"Мы, от имени [Название организации],\n"
               unicode"торжественно клянёмся:\n\n"
               unicode"• СЛУЖИТЬ народу Сибирской Конфедерации\n"
               unicode"  в рамках наших полномочий и компетенций;\n\n"
               unicode"• ЗАЩИЩАТЬ народ от внешних и внутренних врагов,\n"
               unicode"  используя вверенные нам ресурсы только во благо;\n\n"
               unicode"• БЫТЬ ПРОЗРАЧНЫМИ в нашей деятельности,\n"
               unicode"  публикуя отчёты и отвечая на запросы граждан;\n\n"
               unicode"• НЕ ПРЕВЫШАТЬ наши полномочия\n"
               unicode"  и не посягать на права граждан и других организаций;\n\n"
               unicode"• НЕСТИ ОТВЕТСТВЕННОСТЬ за действия наших сотрудников\n"
               unicode"  и за последствия наших решений.\n\n"
               unicode"Организация, нарушившая эту клятву, подлежит расформированию.\n\n"
               unicode"═══════════════════════════════════════════════════════════════\n"
               unicode"        БЕЗ КЛЯТВЫ НЕТ ГОСУДАРСТВА\n"
               unicode"═══════════════════════════════════════════════════════════════";
    }

    /// @notice Получить текст клятвы по типу
    function getOathTextByType(OathType oathType) external pure returns (string memory) {
        if (oathType == OathType.OFFICIAL) return getOfficialOathText();
        if (oathType == OathType.ORGANIZATION) return getOrganizationOathText();
        if (oathType == OathType.DEFENDER) return getDefenderOathText();
        if (oathType == OathType.JUDGE) return getJudgeOathText();
        if (oathType == OathType.DEPUTY) return getDeputyOathText();
        return "";
    }

    /*//////////////////////////////////////////////////////////////
                            СТАТИСТИКА
    //////////////////////////////////////////////////////////////*/

    /// @notice Получить статистику
    function getStats() external view returns (
        uint256 _totalOathsTaken,
        uint256 _activeOaths,
        uint256 _totalOrganizations
    ) {
        return (totalOathsTaken, activeOaths, totalOrganizations);
    }
}
