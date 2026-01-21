// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title RegionRegistry
 * @notice Реестр Союзов и Республик Сибирской Конфедерации
 *
 * Структура:
 * - Союз (Union): Сибирь, Северный Кавказ, Золотое Кольцо, Север, Поволжье, Урал
 * - Республика (Republic): Буряад-Монголия, Саха, Дагестан и т.д.
 * - Регион (Region): области/края, входящие в республики
 *
 * Документ гражданина: [Союз]-[Республика]
 * Например: Сибирь-Буряад-Монголия, Северный Кавказ-Дагестан
 */
contract RegionRegistry is AccessControl {
    /*//////////////////////////////////////////////////////////////
                                ROLES
    //////////////////////////////////////////////////////////////*/

    bytes32 public constant KHURAL_ROLE = keccak256("KHURAL_ROLE");
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error ZeroAddress();
    error InvalidInput();
    error AlreadyExists();
    error NotFound();
    error InvalidParent();
    error CannotModify();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event UnionCreated(bytes32 indexed unionId, string name, string nameLocal);
    event RepublicCreated(bytes32 indexed republicId, bytes32 indexed unionId, string name, string nameLocal);
    event RegionCreated(bytes32 indexed regionId, bytes32 indexed republicId, string name);
    event RepublicStatusChanged(bytes32 indexed republicId, bool active);

    /*//////////////////////////////////////////////////////////////
                            DATA STRUCTURES
    //////////////////////////////////////////////////////////////*/

    /// @notice Союз (группа республик)
    struct Union {
        bytes32 id;
        string name;           // "Сибирь", "Северный Кавказ"
        string nameLocal;      // Название на местном языке
        bool exists;
        uint64 createdAt;
    }

    /// @notice Республика
    struct Republic {
        bytes32 id;
        bytes32 unionId;       // К какому союзу принадлежит
        string name;           // "Буряад-Монголия", "Республика Саха"
        string nameLocal;      // Название на местном языке
        string[] indigenousPeoples;  // Коренные народы
        bool active;
        bool exists;
        uint64 createdAt;
    }

    /// @notice Регион (область/край внутри республики)
    struct Region {
        bytes32 id;
        bytes32 republicId;    // К какой республике принадлежит
        string name;           // "Иркутская область", "Красноярский край"
        bool exists;
        uint64 createdAt;
    }

    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    // Союзы
    mapping(bytes32 => Union) public unions;
    bytes32[] public unionIds;

    // Республики
    mapping(bytes32 => Republic) public republics;
    bytes32[] public republicIds;
    mapping(bytes32 => bytes32[]) public republicsByUnion;  // unionId => republicIds[]

    // Регионы
    mapping(bytes32 => Region) public regions;
    bytes32[] public regionIds;
    mapping(bytes32 => bytes32[]) public regionsByRepublic;  // republicId => regionIds[]

    // Ссылка на ImmutableAxioms
    address public immutable axiomsContract;

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _axiomsContract, address _khural) {
        if (_axiomsContract == address(0)) revert ZeroAddress();
        if (_khural == address(0)) revert ZeroAddress();

        axiomsContract = _axiomsContract;

        _grantRole(DEFAULT_ADMIN_ROLE, _khural);
        _grantRole(KHURAL_ROLE, _khural);
        _grantRole(REGISTRAR_ROLE, _khural);

        // Инициализация базовых союзов и республик
        _initializeUnions();
        _initializeRepublics();
    }

    /*//////////////////////////////////////////////////////////////
                        ИНИЦИАЛИЗАЦИЯ СОЮЗОВ
    //////////////////////////////////////////////////////////////*/

    function _initializeUnions() internal {
        // 1. СИБИРЬ
        _createUnionInternal(
            unicode"Сибирь",
            unicode"Сибирь"
        );

        // 2. СЕВЕРНЫЙ КАВКАЗ
        _createUnionInternal(
            unicode"Северный Кавказ",
            unicode"Кавказ"
        );

        // 3. ЗОЛОТОЕ КОЛЬЦО
        _createUnionInternal(
            unicode"Золотое Кольцо",
            unicode"Российская Республика"
        );

        // 4. СЕВЕР
        _createUnionInternal(
            unicode"Север",
            unicode"Север"
        );

        // 5. ПОВОЛЖЬЕ
        _createUnionInternal(
            unicode"Поволжье",
            unicode"Идел-Урал"
        );

        // 6. УРАЛ
        _createUnionInternal(
            unicode"Урал",
            unicode"Урал"
        );
    }

    function _createUnionInternal(string memory name, string memory nameLocal) internal {
        bytes32 id = keccak256(abi.encodePacked("UNION:", name));

        unions[id] = Union({
            id: id,
            name: name,
            nameLocal: nameLocal,
            exists: true,
            createdAt: uint64(block.timestamp)
        });

        unionIds.push(id);
        emit UnionCreated(id, name, nameLocal);
    }

    /*//////////////////////////////////////////////////////////////
                        ИНИЦИАЛИЗАЦИЯ РЕСПУБЛИК
    //////////////////////////////////////////////////////////////*/

    function _initializeRepublics() internal {
        // Получаем ID союзов
        bytes32 siberiaId = keccak256(abi.encodePacked("UNION:", unicode"Сибирь"));
        bytes32 caucasusId = keccak256(abi.encodePacked("UNION:", unicode"Северный Кавказ"));
        bytes32 goldenRingId = keccak256(abi.encodePacked("UNION:", unicode"Золотое Кольцо"));
        bytes32 northId = keccak256(abi.encodePacked("UNION:", unicode"Север"));
        bytes32 volgaId = keccak256(abi.encodePacked("UNION:", unicode"Поволжье"));
        bytes32 uralId = keccak256(abi.encodePacked("UNION:", unicode"Урал"));

        // ═══════════════════════════════════════════════════════════════
        // СИБИРЬ
        // ═══════════════════════════════════════════════════════════════

        string[] memory buryatPeoples = new string[](2);
        buryatPeoples[0] = unicode"Буряад-Монголы";
        buryatPeoples[1] = unicode"Эвенки";
        _createRepublicInternal(siberiaId, unicode"Буряад-Монголия", unicode"Буряад Монгол Улс", buryatPeoples);

        string[] memory sakhaPeoples = new string[](2);
        sakhaPeoples[0] = unicode"Якуты (Саха)";
        sakhaPeoples[1] = unicode"Эвены";
        _createRepublicInternal(siberiaId, unicode"Республика Саха", unicode"Саха Өрөспүүбүлүкэтэ", sakhaPeoples);

        string[] memory chukotPeoples = new string[](2);
        chukotPeoples[0] = unicode"Чукчи";
        chukotPeoples[1] = unicode"Эскимосы";
        _createRepublicInternal(siberiaId, unicode"Чукотка", unicode"Чукотка", chukotPeoples);

        string[] memory altaiPeoples = new string[](1);
        altaiPeoples[0] = unicode"Алтайцы";
        _createRepublicInternal(siberiaId, unicode"Республика Алтай", unicode"Алтай Республика", altaiPeoples);

        string[] memory tyvaPeoples = new string[](1);
        tyvaPeoples[0] = unicode"Тувинцы";
        _createRepublicInternal(siberiaId, unicode"Республика Тыва", unicode"Тыва Республика", tyvaPeoples);

        string[] memory khakasPeoples = new string[](1);
        khakasPeoples[0] = unicode"Хакасы";
        _createRepublicInternal(siberiaId, unicode"Республика Хакасия", unicode"Хакас Республиказы", khakasPeoples);

        // ═══════════════════════════════════════════════════════════════
        // СЕВЕРНЫЙ КАВКАЗ
        // ═══════════════════════════════════════════════════════════════

        string[] memory dagestanPeoples = new string[](5);
        dagestanPeoples[0] = unicode"Аварцы";
        dagestanPeoples[1] = unicode"Даргинцы";
        dagestanPeoples[2] = unicode"Лезгины";
        dagestanPeoples[3] = unicode"Лакцы";
        dagestanPeoples[4] = unicode"Кумыки";
        _createRepublicInternal(caucasusId, unicode"Республика Дагестан", unicode"Дагъистан", dagestanPeoples);

        string[] memory chechenPeoples = new string[](1);
        chechenPeoples[0] = unicode"Чеченцы";
        _createRepublicInternal(caucasusId, unicode"Чеченская Республика", unicode"Нохчийн Республика", chechenPeoples);

        string[] memory ingushPeoples = new string[](1);
        ingushPeoples[0] = unicode"Ингуши";
        _createRepublicInternal(caucasusId, unicode"Республика Ингушетия", unicode"ГIалгIайче", ingushPeoples);

        string[] memory kbrPeoples = new string[](2);
        kbrPeoples[0] = unicode"Кабардинцы";
        kbrPeoples[1] = unicode"Балкарцы";
        _createRepublicInternal(caucasusId, unicode"Кабардино-Балкария", unicode"Къэбэрдей-Балъкъэр", kbrPeoples);

        string[] memory kcrPeoples = new string[](2);
        kcrPeoples[0] = unicode"Карачаевцы";
        kcrPeoples[1] = unicode"Черкесы";
        _createRepublicInternal(caucasusId, unicode"Карачаево-Черкесия", unicode"Къарачай-Черкес", kcrPeoples);

        string[] memory osetiaPeoples = new string[](1);
        osetiaPeoples[0] = unicode"Осетины";
        _createRepublicInternal(caucasusId, unicode"Северная Осетия", unicode"Цӕгат Ирыстон", osetiaPeoples);

        string[] memory adygeaPeoples = new string[](1);
        adygeaPeoples[0] = unicode"Адыги";
        _createRepublicInternal(caucasusId, unicode"Республика Адыгея", unicode"Адыгэ Республик", adygeaPeoples);

        // ═══════════════════════════════════════════════════════════════
        // ПОВОЛЖЬЕ
        // ═══════════════════════════════════════════════════════════════

        string[] memory tatarPeoples = new string[](1);
        tatarPeoples[0] = unicode"Татары";
        _createRepublicInternal(volgaId, unicode"Республика Татарстан", unicode"Татарстан Республикасы", tatarPeoples);

        string[] memory bashkirPeoples = new string[](1);
        bashkirPeoples[0] = unicode"Башкиры";
        _createRepublicInternal(volgaId, unicode"Республика Башкортостан", unicode"Башҡортостан Республикаһы", bashkirPeoples);

        string[] memory chuvashPeoples = new string[](1);
        chuvashPeoples[0] = unicode"Чуваши";
        _createRepublicInternal(volgaId, unicode"Чувашская Республика", unicode"Чăваш Республики", chuvashPeoples);

        string[] memory mariPeoples = new string[](1);
        mariPeoples[0] = unicode"Марийцы";
        _createRepublicInternal(volgaId, unicode"Республика Марий Эл", unicode"Марий Эл Республик", mariPeoples);

        string[] memory mordovPeoples = new string[](2);
        mordovPeoples[0] = unicode"Мордва-мокша";
        mordovPeoples[1] = unicode"Мордва-эрзя";
        _createRepublicInternal(volgaId, unicode"Республика Мордовия", unicode"Мордовия Республикась", mordovPeoples);

        string[] memory udmurtPeoples = new string[](1);
        udmurtPeoples[0] = unicode"Удмурты";
        _createRepublicInternal(volgaId, unicode"Удмуртская Республика", unicode"Удмурт Элькун", udmurtPeoples);

        // ═══════════════════════════════════════════════════════════════
        // СЕВЕР
        // ═══════════════════════════════════════════════════════════════

        string[] memory komiPeoples = new string[](1);
        komiPeoples[0] = unicode"Коми";
        _createRepublicInternal(northId, unicode"Республика Коми", unicode"Коми Республика", komiPeoples);

        string[] memory karelPeoples = new string[](2);
        karelPeoples[0] = unicode"Карелы";
        karelPeoples[1] = unicode"Вепсы";
        _createRepublicInternal(northId, unicode"Республика Карелия", unicode"Karjalan Tazavalla", karelPeoples);

        // ═══════════════════════════════════════════════════════════════
        // ЗОЛОТОЕ КОЛЬЦО (Российская Республика)
        // ═══════════════════════════════════════════════════════════════

        string[] memory russianPeoples = new string[](1);
        russianPeoples[0] = unicode"Русские";
        _createRepublicInternal(goldenRingId, unicode"Московская Республика", unicode"Московская Республика", russianPeoples);

        // ═══════════════════════════════════════════════════════════════
        // УРАЛ
        // ═══════════════════════════════════════════════════════════════

        string[] memory khantyPeoples = new string[](2);
        khantyPeoples[0] = unicode"Ханты";
        khantyPeoples[1] = unicode"Манси";
        _createRepublicInternal(uralId, unicode"Ханты-Мансийск", unicode"Хӑнты-Мансийск", khantyPeoples);

        string[] memory yamalPeoples = new string[](2);
        yamalPeoples[0] = unicode"Ненцы";
        yamalPeoples[1] = unicode"Селькупы";
        _createRepublicInternal(uralId, unicode"Ямал", unicode"Ямал", yamalPeoples);
    }

    function _createRepublicInternal(
        bytes32 unionId,
        string memory name,
        string memory nameLocal,
        string[] memory indigenousPeoples
    ) internal {
        bytes32 id = keccak256(abi.encodePacked("REPUBLIC:", unionId, name));

        republics[id] = Republic({
            id: id,
            unionId: unionId,
            name: name,
            nameLocal: nameLocal,
            indigenousPeoples: indigenousPeoples,
            active: true,
            exists: true,
            createdAt: uint64(block.timestamp)
        });

        republicIds.push(id);
        republicsByUnion[unionId].push(id);

        emit RepublicCreated(id, unionId, name, nameLocal);
    }

    /*//////////////////////////////////////////////////////////////
                        УПРАВЛЕНИЕ СОЮЗАМИ
    //////////////////////////////////////////////////////////////*/

    /// @notice Создать новый союз (только Хурал)
    function createUnion(
        string calldata name,
        string calldata nameLocal
    ) external onlyRole(KHURAL_ROLE) returns (bytes32 id) {
        if (bytes(name).length == 0) revert InvalidInput();

        id = keccak256(abi.encodePacked("UNION:", name));
        if (unions[id].exists) revert AlreadyExists();

        unions[id] = Union({
            id: id,
            name: name,
            nameLocal: nameLocal,
            exists: true,
            createdAt: uint64(block.timestamp)
        });

        unionIds.push(id);
        emit UnionCreated(id, name, nameLocal);
    }

    /*//////////////////////////////////////////////////////////////
                        УПРАВЛЕНИЕ РЕСПУБЛИКАМИ
    //////////////////////////////////////////////////////////////*/

    /// @notice Создать республику
    function createRepublic(
        bytes32 unionId,
        string calldata name,
        string calldata nameLocal,
        string[] calldata indigenousPeoples
    ) external onlyRole(KHURAL_ROLE) returns (bytes32 id) {
        if (!unions[unionId].exists) revert InvalidParent();
        if (bytes(name).length == 0) revert InvalidInput();

        id = keccak256(abi.encodePacked("REPUBLIC:", unionId, name));
        if (republics[id].exists) revert AlreadyExists();

        republics[id] = Republic({
            id: id,
            unionId: unionId,
            name: name,
            nameLocal: nameLocal,
            indigenousPeoples: indigenousPeoples,
            active: true,
            exists: true,
            createdAt: uint64(block.timestamp)
        });

        republicIds.push(id);
        republicsByUnion[unionId].push(id);

        emit RepublicCreated(id, unionId, name, nameLocal);
    }

    /// @notice Изменить статус республики
    function setRepublicActive(bytes32 republicId, bool active) external onlyRole(KHURAL_ROLE) {
        if (!republics[republicId].exists) revert NotFound();
        republics[republicId].active = active;
        emit RepublicStatusChanged(republicId, active);
    }

    /*//////////////////////////////////////////////////////////////
                        УПРАВЛЕНИЕ РЕГИОНАМИ
    //////////////////////////////////////////////////////////////*/

    /// @notice Добавить регион в республику
    function addRegion(
        bytes32 republicId,
        string calldata name
    ) external onlyRole(REGISTRAR_ROLE) returns (bytes32 id) {
        if (!republics[republicId].exists) revert InvalidParent();
        if (bytes(name).length == 0) revert InvalidInput();

        id = keccak256(abi.encodePacked("REGION:", republicId, name));
        if (regions[id].exists) revert AlreadyExists();

        regions[id] = Region({
            id: id,
            republicId: republicId,
            name: name,
            exists: true,
            createdAt: uint64(block.timestamp)
        });

        regionIds.push(id);
        regionsByRepublic[republicId].push(id);

        emit RegionCreated(id, republicId, name);
    }

    /*//////////////////////////////////////////////////////////////
                        ФУНКЦИИ ЧТЕНИЯ
    //////////////////////////////////////////////////////////////*/

    /// @notice Получить все союзы
    function getAllUnions() external view returns (Union[] memory) {
        Union[] memory result = new Union[](unionIds.length);
        for (uint256 i = 0; i < unionIds.length; i++) {
            result[i] = unions[unionIds[i]];
        }
        return result;
    }

    /// @notice Получить республики союза
    function getRepublicsByUnion(bytes32 unionId) external view returns (Republic[] memory) {
        bytes32[] storage repIds = republicsByUnion[unionId];
        Republic[] memory result = new Republic[](repIds.length);
        for (uint256 i = 0; i < repIds.length; i++) {
            result[i] = republics[repIds[i]];
        }
        return result;
    }

    /// @notice Получить регионы республики
    function getRegionsByRepublic(bytes32 republicId) external view returns (Region[] memory) {
        bytes32[] storage regIds = regionsByRepublic[republicId];
        Region[] memory result = new Region[](regIds.length);
        for (uint256 i = 0; i < regIds.length; i++) {
            result[i] = regions[regIds[i]];
        }
        return result;
    }

    /// @notice Получить полное название для документа: "Союз-Республика"
    function getDocumentPrefix(bytes32 republicId) external view returns (string memory) {
        Republic storage rep = republics[republicId];
        if (!rep.exists) revert NotFound();

        Union storage uni = unions[rep.unionId];

        return string(abi.encodePacked(uni.name, "-", rep.name));
    }

    /// @notice Получить ID союза по названию
    function getUnionId(string calldata name) external pure returns (bytes32) {
        return keccak256(abi.encodePacked("UNION:", name));
    }

    /// @notice Получить ID республики
    function getRepublicId(bytes32 unionId, string calldata name) external pure returns (bytes32) {
        return keccak256(abi.encodePacked("REPUBLIC:", unionId, name));
    }

    /// @notice Количество союзов
    function getUnionCount() external view returns (uint256) {
        return unionIds.length;
    }

    /// @notice Количество республик
    function getRepublicCount() external view returns (uint256) {
        return republicIds.length;
    }

    /// @notice Количество регионов
    function getRegionCount() external view returns (uint256) {
        return regionIds.length;
    }

    /// @notice Проверить, активна ли республика
    function isRepublicActive(bytes32 republicId) external view returns (bool) {
        return republics[republicId].exists && republics[republicId].active;
    }
}
