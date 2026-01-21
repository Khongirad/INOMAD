// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./NationRegistry.sol";
import "./RegionRegistry.sol";
import "./CitizenDocument.sol";

/**
 * @title CitizenOnboarding
 * @notice Интерактивный процесс регистрации гражданина Сибирской Конфедерации
 *
 * ═══════════════════════════════════════════════════════════════
 *     ДОБРО ПОЖАЛОВАТЬ В СИБИРСКУЮ КОНФЕДЕРАЦИЮ
 *     Союз свободных народов от Урала до Тихого океана
 * ═══════════════════════════════════════════════════════════════
 *
 * Процесс регистрации (как в EVE Online / World of Warcraft):
 *
 * ШАГ 1: ВЫБОР НАРОДА (НАЦИИ)
 *        - Просмотр всех народов с описаниями
 *        - История, культура, приветствие на родном языке
 *        - Группировка по языковым семьям
 *
 * ШАГ 2: ВЫБОР ТЕРРИТОРИИ РОЖДЕНИЯ
 *        - Просмотр союзов и республик
 *        - Описание территории и коренных народов
 *        - Проверка совместимости народа и территории
 *
 * ШАГ 3: ЛИЧНЫЕ ДАННЫЕ
 *        - ФИО на русском и родном языке
 *        - Дата рождения
 *        - Основание (коренной / право рождения / натурализация)
 *
 * ШАГ 4: ПОЛУЧЕНИЕ ДОКУМЕНТА
 *        - Выдача Soul Bound Token (SBT)
 *        - Формат: [Союз]-[Республика]
 *        - Например: Сибирь-Буряад-Монголия
 *
 * "Каждый народ — хозяин своей земли.
 *  Каждый гражданин — под защитой Конфедерации."
 */
contract CitizenOnboarding is AccessControl, ReentrancyGuard {
    /*//////////////////////////////////////////////////////////////
                                ROLES
    //////////////////////////////////////////////////////////////*/

    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    bytes32 public constant KHURAL_ROLE = keccak256("KHURAL_ROLE");

    /*//////////////////////////////////////////////////////////////
                                ENUMS
    //////////////////////////////////////////////////////////////*/

    /// @notice Этапы регистрации
    enum OnboardingStep {
        NOT_STARTED,        // 0 - Не начато
        NATION_SELECTED,    // 1 - Народ выбран
        TERRITORY_SELECTED, // 2 - Территория выбрана
        DATA_SUBMITTED,     // 3 - Данные заполнены
        COMPLETED           // 4 - Документ выдан
    }

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error ZeroAddress();
    error InvalidStep();
    error AlreadyRegistered();
    error NationNotFound();
    error TerritoryNotFound();
    error InvalidInput();
    error RegistrationNotStarted();
    error RegistrationAlreadyComplete();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event OnboardingStarted(address indexed applicant, uint64 timestamp);
    event NationSelected(address indexed applicant, bytes32 indexed nationId, string nationName);
    event TerritorySelected(address indexed applicant, bytes32 indexed republicId, string republicName);
    event DataSubmitted(address indexed applicant, string fullName);
    event CitizenRegistered(
        address indexed citizen,
        uint256 indexed documentId,
        bytes32 nationId,
        bytes32 republicId
    );

    /*//////////////////////////////////////////////////////////////
                            DATA STRUCTURES
    //////////////////////////////////////////////////////////////*/

    /// @notice Заявка на регистрацию
    struct Application {
        address applicant;
        OnboardingStep step;

        // Шаг 1: Народ
        bytes32 nationId;

        // Шаг 2: Территория
        bytes32 republicId;
        bytes32 birthRepublicId;

        // Шаг 3: Личные данные
        string fullName;
        string fullNameNative;
        uint64 birthDate;
        CitizenDocument.BasisType basis;

        // Метаданные
        uint64 startedAt;
        uint64 completedAt;
        uint256 documentId;

        bool exists;
    }

    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    NationRegistry public immutable nationRegistry;
    RegionRegistry public immutable regionRegistry;
    CitizenDocument public immutable citizenDocument;

    mapping(address => Application) public applications;

    uint256 public totalApplications;
    uint256 public completedRegistrations;

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _nationRegistry,
        address _regionRegistry,
        address _citizenDocument,
        address _khural
    ) {
        if (_nationRegistry == address(0)) revert ZeroAddress();
        if (_regionRegistry == address(0)) revert ZeroAddress();
        if (_citizenDocument == address(0)) revert ZeroAddress();
        if (_khural == address(0)) revert ZeroAddress();

        nationRegistry = NationRegistry(_nationRegistry);
        regionRegistry = RegionRegistry(_regionRegistry);
        citizenDocument = CitizenDocument(_citizenDocument);

        _grantRole(DEFAULT_ADMIN_ROLE, _khural);
        _grantRole(KHURAL_ROLE, _khural);
        _grantRole(REGISTRAR_ROLE, _khural);
    }

    /*//////////////////////////////////////////////////////////////
                    ШАГ 0: НАЧАЛО РЕГИСТРАЦИИ
    //////////////////////////////////////////////////////////////*/

    /// @notice Начать процесс регистрации
    function startOnboarding() external returns (string memory welcomeMessage) {
        if (applications[msg.sender].exists) {
            if (applications[msg.sender].step == OnboardingStep.COMPLETED) {
                revert AlreadyRegistered();
            }
            // Можно продолжить незавершённую регистрацию
            return _getStepInstructions(applications[msg.sender].step);
        }

        applications[msg.sender] = Application({
            applicant: msg.sender,
            step: OnboardingStep.NOT_STARTED,
            nationId: bytes32(0),
            republicId: bytes32(0),
            birthRepublicId: bytes32(0),
            fullName: "",
            fullNameNative: "",
            birthDate: 0,
            basis: CitizenDocument.BasisType.INDIGENOUS,
            startedAt: uint64(block.timestamp),
            completedAt: 0,
            documentId: 0,
            exists: true
        });

        totalApplications++;

        emit OnboardingStarted(msg.sender, uint64(block.timestamp));

        return nationRegistry.getWelcomeMessage();
    }

    /*//////////////////////////////////////////////////////////////
                    ШАГ 1: ВЫБОР НАРОДА
    //////////////////////////////////////////////////////////////*/

    /// @notice Выбрать свой народ
    function selectNation(bytes32 nationId) external {
        Application storage app = applications[msg.sender];
        if (!app.exists) revert RegistrationNotStarted();
        if (app.step == OnboardingStep.COMPLETED) revert RegistrationAlreadyComplete();

        // Проверяем существование народа
        NationRegistry.Nation memory nation = nationRegistry.getNation(nationId);
        if (!nation.exists) revert NationNotFound();

        app.nationId = nationId;
        app.step = OnboardingStep.NATION_SELECTED;

        emit NationSelected(msg.sender, nationId, nation.name);
    }

    /// @notice Выбрать народ по имени
    function selectNationByName(string calldata nationName) external {
        bytes32 nationId = nationRegistry.getNationId(nationName);

        Application storage app = applications[msg.sender];
        if (!app.exists) revert RegistrationNotStarted();
        if (app.step == OnboardingStep.COMPLETED) revert RegistrationAlreadyComplete();

        NationRegistry.Nation memory nation = nationRegistry.getNation(nationId);
        if (!nation.exists) revert NationNotFound();

        app.nationId = nationId;
        app.step = OnboardingStep.NATION_SELECTED;

        emit NationSelected(msg.sender, nationId, nation.name);
    }

    /*//////////////////////////////////////////////////////////////
                    ШАГ 2: ВЫБОР ТЕРРИТОРИИ
    //////////////////////////////////////////////////////////////*/

    /// @notice Выбрать территорию рождения и проживания
    function selectTerritory(
        bytes32 republicId,
        bytes32 birthRepublicId
    ) external {
        Application storage app = applications[msg.sender];
        if (!app.exists) revert RegistrationNotStarted();
        if (app.step == OnboardingStep.COMPLETED) revert RegistrationAlreadyComplete();
        if (app.step < OnboardingStep.NATION_SELECTED) revert InvalidStep();

        // Проверяем существование республик
        if (!regionRegistry.isRepublicActive(republicId)) revert TerritoryNotFound();
        if (birthRepublicId != bytes32(0) && !regionRegistry.isRepublicActive(birthRepublicId)) {
            revert TerritoryNotFound();
        }

        app.republicId = republicId;
        app.birthRepublicId = birthRepublicId != bytes32(0) ? birthRepublicId : republicId;
        app.step = OnboardingStep.TERRITORY_SELECTED;

        string memory prefix = regionRegistry.getDocumentPrefix(republicId);
        emit TerritorySelected(msg.sender, republicId, prefix);
    }

    /*//////////////////////////////////////////////////////////////
                    ШАГ 3: ЛИЧНЫЕ ДАННЫЕ
    //////////////////////////////////////////////////////////////*/

    /// @notice Заполнить личные данные
    function submitPersonalData(
        string calldata fullName,
        string calldata fullNameNative,
        uint64 birthDate,
        CitizenDocument.BasisType basis
    ) external {
        Application storage app = applications[msg.sender];
        if (!app.exists) revert RegistrationNotStarted();
        if (app.step == OnboardingStep.COMPLETED) revert RegistrationAlreadyComplete();
        if (app.step < OnboardingStep.TERRITORY_SELECTED) revert InvalidStep();

        if (bytes(fullName).length == 0) revert InvalidInput();
        if (birthDate == 0 || birthDate > block.timestamp) revert InvalidInput();

        app.fullName = fullName;
        app.fullNameNative = fullNameNative;
        app.birthDate = birthDate;
        app.basis = basis;
        app.step = OnboardingStep.DATA_SUBMITTED;

        emit DataSubmitted(msg.sender, fullName);
    }

    /*//////////////////////////////////////////////////////////////
                    ШАГ 4: ВЫДАЧА ДОКУМЕНТА
    //////////////////////////////////////////////////////////////*/

    /// @notice Завершить регистрацию и получить документ
    /// @dev Может вызвать сам заявитель или регистратор
    function completeRegistration() external nonReentrant {
        _completeRegistration(msg.sender);
    }

    /// @notice Завершить регистрацию для заявителя (регистратор)
    function completeRegistrationFor(address applicant) external onlyRole(REGISTRAR_ROLE) nonReentrant {
        _completeRegistration(applicant);
    }

    function _completeRegistration(address applicant) internal {
        Application storage app = applications[applicant];
        if (!app.exists) revert RegistrationNotStarted();
        if (app.step == OnboardingStep.COMPLETED) revert RegistrationAlreadyComplete();
        if (app.step < OnboardingStep.DATA_SUBMITTED) revert InvalidStep();

        // Получаем этничность из NationRegistry
        NationRegistry.Nation memory nation = nationRegistry.getNation(app.nationId);

        // Выдаём документ
        uint256 documentId = citizenDocument.issueDocument(
            applicant,
            app.republicId,
            app.birthRepublicId,
            app.fullName,
            app.fullNameNative,
            nation.name,  // этничность = название народа
            app.birthDate,
            app.basis
        );

        app.documentId = documentId;
        app.step = OnboardingStep.COMPLETED;
        app.completedAt = uint64(block.timestamp);
        completedRegistrations++;

        emit CitizenRegistered(applicant, documentId, app.nationId, app.republicId);
    }

    /*//////////////////////////////////////////////////////////////
                    ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ОНБОРДИНГА
    //////////////////////////////////////////////////////////////*/

    /// @notice Получить текущий статус регистрации
    function getApplicationStatus(address applicant) external view returns (
        OnboardingStep step,
        string memory stepName,
        string memory nextStepInstructions
    ) {
        Application storage app = applications[applicant];
        if (!app.exists) {
            return (OnboardingStep.NOT_STARTED, unicode"Не начато", unicode"Вызовите startOnboarding() для начала");
        }

        step = app.step;
        stepName = _getStepName(step);
        nextStepInstructions = _getStepInstructions(step);
    }

    /// @notice Получить полную заявку
    function getApplication(address applicant) external view returns (Application memory) {
        return applications[applicant];
    }

    function _getStepName(OnboardingStep step) internal pure returns (string memory) {
        if (step == OnboardingStep.NOT_STARTED) return unicode"Начало";
        if (step == OnboardingStep.NATION_SELECTED) return unicode"Народ выбран";
        if (step == OnboardingStep.TERRITORY_SELECTED) return unicode"Территория выбрана";
        if (step == OnboardingStep.DATA_SUBMITTED) return unicode"Данные заполнены";
        if (step == OnboardingStep.COMPLETED) return unicode"Регистрация завершена";
        return unicode"Неизвестно";
    }

    function _getStepInstructions(OnboardingStep step) internal pure returns (string memory) {
        if (step == OnboardingStep.NOT_STARTED) {
            return unicode"Шаг 1: Выберите свой народ с помощью selectNation() или selectNationByName()";
        }
        if (step == OnboardingStep.NATION_SELECTED) {
            return unicode"Шаг 2: Выберите территорию рождения с помощью selectTerritory()";
        }
        if (step == OnboardingStep.TERRITORY_SELECTED) {
            return unicode"Шаг 3: Заполните личные данные с помощью submitPersonalData()";
        }
        if (step == OnboardingStep.DATA_SUBMITTED) {
            return unicode"Шаг 4: Завершите регистрацию с помощью completeRegistration()";
        }
        if (step == OnboardingStep.COMPLETED) {
            return unicode"Поздравляем! Вы — гражданин Сибирской Конфедерации!";
        }
        return "";
    }

    /*//////////////////////////////////////////////////////////////
                    ФУНКЦИИ ПРОСМОТРА (ДЛЯ UI)
    //////////////////////////////////////////////////////////////*/

    /// @notice Получить приветственное сообщение
    function getWelcomeMessage() external view returns (string memory) {
        return nationRegistry.getWelcomeMessage();
    }

    /// @notice Получить количество народов
    function getNationCount() external view returns (uint256) {
        return nationRegistry.getNationCount();
    }

    /// @notice Получить все ID народов
    function getAllNationIds() external view returns (bytes32[] memory) {
        return nationRegistry.getAllNationIds();
    }

    /// @notice Получить информацию о народе
    function getNation(bytes32 nationId) external view returns (NationRegistry.Nation memory) {
        return nationRegistry.getNation(nationId);
    }

    /// @notice Получить народы по языковой семье
    function getNationsByFamily(NationRegistry.LanguageFamily family) external view returns (bytes32[] memory) {
        return nationRegistry.getNationsByFamily(family);
    }

    /// @notice Получить название языковой семьи
    function getFamilyName(NationRegistry.LanguageFamily family) external view returns (string memory) {
        return nationRegistry.getFamilyName(family);
    }

    /// @notice Получить все союзы
    function getAllUnions() external view returns (RegionRegistry.Union[] memory) {
        return regionRegistry.getAllUnions();
    }

    /// @notice Получить республики союза
    function getRepublicsByUnion(bytes32 unionId) external view returns (RegionRegistry.Republic[] memory) {
        return regionRegistry.getRepublicsByUnion(unionId);
    }

    /// @notice Получить название документа для республики
    function getDocumentPrefix(bytes32 republicId) external view returns (string memory) {
        return regionRegistry.getDocumentPrefix(republicId);
    }

    /// @notice Получить ID союза по названию
    function getUnionId(string calldata name) external view returns (bytes32) {
        return regionRegistry.getUnionId(name);
    }

    /// @notice Получить ID республики
    function getRepublicId(bytes32 unionId, string calldata name) external view returns (bytes32) {
        return regionRegistry.getRepublicId(unionId, name);
    }

    /*//////////////////////////////////////////////////////////////
                            СТАТИСТИКА
    //////////////////////////////////////////////////////////////*/

    /// @notice Получить статистику регистраций
    function getStats() external view returns (
        uint256 _totalApplications,
        uint256 _completedRegistrations,
        uint256 _pendingApplications
    ) {
        return (
            totalApplications,
            completedRegistrations,
            totalApplications - completedRegistrations
        );
    }

    /*//////////////////////////////////////////////////////////////
                    ИНТЕРАКТИВНЫЕ ПОДСКАЗКИ
    //////////////////////////////////////////////////////////////*/

    /// @notice Получить краткую инструкцию по регистрации
    function getQuickGuide() external pure returns (string memory) {
        return unicode"═══════════════════════════════════════════════════════════════\n"
               unicode"        КРАТКОЕ РУКОВОДСТВО ПО РЕГИСТРАЦИИ\n"
               unicode"═══════════════════════════════════════════════════════════════\n\n"
               unicode"1. startOnboarding()           - Начать регистрацию\n"
               unicode"2. selectNationByName('...')   - Выбрать народ\n"
               unicode"3. selectTerritory(repId, birthRepId) - Выбрать территорию\n"
               unicode"4. submitPersonalData(...)     - Заполнить данные\n"
               unicode"5. completeRegistration()      - Получить документ\n\n"
               unicode"После регистрации вы получите Soul Bound Token (SBT)\n"
               unicode"с вашим документом гражданина Конфедерации.\n\n"
               unicode"Формат документа: [Союз]-[Республика]\n"
               unicode"Например: Сибирь-Буряад-Монголия\n\n"
               unicode"═══════════════════════════════════════════════════════════════\n"
               unicode"  Каждый народ — хозяин своей земли.\n"
               unicode"  Каждый гражданин — под защитой Конфедерации.\n"
               unicode"═══════════════════════════════════════════════════════════════";
    }

    /// @notice Получить список языковых семей
    function getLanguageFamilies() external pure returns (string memory) {
        return unicode"═══════════════════════════════════════════════════════════════\n"
               unicode"              ЯЗЫКОВЫЕ СЕМЬИ НАРОДОВ\n"
               unicode"═══════════════════════════════════════════════════════════════\n\n"
               unicode"0 - MONGOLIC      Монгольские народы\n"
               unicode"                  (Буряад-Монголы, Калмыки)\n\n"
               unicode"1 - TURKIC        Тюркские народы\n"
               unicode"                  (Якуты, Татары, Башкиры, Тувинцы...)\n\n"
               unicode"2 - TUNGUSIC      Тунгусо-маньчжурские народы\n"
               unicode"                  (Эвенки, Эвены, Нанайцы...)\n\n"
               unicode"3 - UGRIC         Финно-угорские народы\n"
               unicode"                  (Ханты, Манси, Коми, Удмурты...)\n\n"
               unicode"4 - PALEOSIBERIAN Палеоазиатские народы\n"
               unicode"                  (Чукчи, Коряки, Нивхи, Кеты...)\n\n"
               unicode"5 - SLAVIC        Славянские народы\n"
               unicode"                  (Русские)\n\n"
               unicode"6 - CAUCASIAN     Кавказские народы\n"
               unicode"                  (Чеченцы, Аварцы, Даргинцы...)\n\n"
               unicode"7 - SAMOYEDIC     Самодийские народы\n"
               unicode"                  (Ненцы, Селькупы, Нганасаны)\n"
               unicode"═══════════════════════════════════════════════════════════════";
    }

    /// @notice Получить список союзов
    function getUnionsList() external pure returns (string memory) {
        return unicode"═══════════════════════════════════════════════════════════════\n"
               unicode"           СОЮЗЫ СИБИРСКОЙ КОНФЕДЕРАЦИИ\n"
               unicode"═══════════════════════════════════════════════════════════════\n\n"
               unicode"1. СИБИРЬ\n"
               unicode"   От Урала до Тихого океана\n"
               unicode"   Буряад-Монголия, Саха, Чукотка, Алтай, Тыва, Хакасия\n\n"
               unicode"2. СЕВЕРНЫЙ КАВКАЗ\n"
               unicode"   Горы свободы и чести\n"
               unicode"   Дагестан, Чечня, Ингушетия, КБР, КЧР, Осетия, Адыгея\n\n"
               unicode"3. ПОВОЛЖЬЕ (Идел-Урал)\n"
               unicode"   Великая река и её народы\n"
               unicode"   Татарстан, Башкортостан, Чувашия, Марий Эл, Мордовия, Удмуртия\n\n"
               unicode"4. СЕВЕР\n"
               unicode"   Земли северных лесов\n"
               unicode"   Коми, Карелия\n\n"
               unicode"5. ЗОЛОТОЕ КОЛЬЦО\n"
               unicode"   Историческое ядро\n"
               unicode"   Московская Республика\n\n"
               unicode"6. УРАЛ\n"
               unicode"   Хребет двух континентов\n"
               unicode"   Ханты-Мансийск, Ямал\n"
               unicode"═══════════════════════════════════════════════════════════════";
    }
}
