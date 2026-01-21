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

        // Инициализация базовых союзов
        _initializeUnions();
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
