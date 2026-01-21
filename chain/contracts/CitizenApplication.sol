// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CitizenApplication
 * @notice Анкета гражданина Сибирской Конфедерации
 *
 * ═══════════════════════════════════════════════════════════════
 *         АНКЕТА ГРАЖДАНИНА СИБИРСКОЙ КОНФЕДЕРАЦИИ
 *              ФОРМА СК-1 (Siberian Confederation Form 1)
 * ═══════════════════════════════════════════════════════════════
 *
 * Аналог иммиграционной анкеты (Green Card), но для всех
 * рождённых на земле Конфедерации. Никто не должен быть
 * оставлен позади — каждый житель становится хранителем
 * своей земли.
 *
 * ПРИНЦИП: Кто родился на этой земле — навсегда связан с ней
 * и даёт клятву защищать её, её народы, культуру и свободу.
 *
 * Разделы анкеты:
 * I.   Личные данные (Personal Information)
 * II.  Данные о рождении (Birth Information)
 * III. Семейное положение (Family Status)
 * IV.  Этническая принадлежность (Ethnic Background)
 * V.   Место жительства (Residence)
 * VI.  Образование и профессия (Education & Occupation)
 * VII. Языки (Languages)
 * VIII.Контактные данные (Contact Information)
 * IX.  Клятва гражданина (Citizen's Oath)
 */
contract CitizenApplication is AccessControl, ReentrancyGuard {
    /*//////////////////////////////////////////////////////////////
                                ROLES
    //////////////////////////////////////////////////////////////*/

    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant KHURAL_ROLE = keccak256("KHURAL_ROLE");

    /*//////////////////////////////////////////////////////////////
                                ENUMS
    //////////////////////////////////////////////////////////////*/

    /// @notice Пол
    enum Gender {
        NOT_SPECIFIED,
        MALE,
        FEMALE
    }

    /// @notice Семейное положение
    enum MaritalStatus {
        SINGLE,             // Холост/Не замужем
        MARRIED,            // В браке
        DIVORCED,           // В разводе
        WIDOWED,            // Вдовец/Вдова
        CIVIL_UNION         // Гражданский брак
    }

    /// @notice Основание для гражданства
    enum CitizenshipBasis {
        BIRTHRIGHT,         // Право рождения на территории
        INDIGENOUS,         // Коренной народ
        DESCENT,            // По происхождению (родители граждане)
        NATURALIZATION,     // Натурализация (5 лет проживания)
        MARRIAGE,           // Брак с гражданином
        SPECIAL_MERIT       // За особые заслуги (решение Хурала)
    }

    /// @notice Статус анкеты
    enum ApplicationStatus {
        DRAFT,              // Черновик
        SUBMITTED,          // Подана
        UNDER_REVIEW,       // На рассмотрении
        ADDITIONAL_INFO,    // Требуется доп. информация
        APPROVED,           // Одобрена
        REJECTED,           // Отклонена
        OATH_PENDING,       // Ожидает принятия клятвы
        COMPLETED           // Завершена, документ выдан
    }

    /// @notice Уровень владения языком
    enum LanguageLevel {
        NONE,               // Не владею
        BASIC,              // Базовый
        INTERMEDIATE,       // Средний
        FLUENT,             // Свободный
        NATIVE              // Родной
    }

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error ZeroAddress();
    error ApplicationNotFound();
    error InvalidStatus();
    error NotApplicant();
    error AlreadySubmitted();
    error OathNotTaken();
    error InvalidInput();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event ApplicationCreated(uint256 indexed applicationId, address indexed applicant);
    event ApplicationSubmitted(uint256 indexed applicationId);
    event ApplicationStatusChanged(uint256 indexed applicationId, ApplicationStatus oldStatus, ApplicationStatus newStatus);
    event OathTaken(uint256 indexed applicationId, address indexed citizen, uint64 timestamp);
    event ApplicationApproved(uint256 indexed applicationId, address indexed verifier);
    event ApplicationRejected(uint256 indexed applicationId, address indexed verifier, string reason);

    /*//////////////////////////////////////////////////////////////
                            DATA STRUCTURES
    //////////////////////////////////////////////////////////////*/

    /// @notice Раздел I: Личные данные
    struct PersonalInfo {
        string surname;              // Фамилия
        string givenNames;           // Имя и отчество
        string surnameNative;        // Фамилия на родном языке
        string givenNamesNative;     // Имя на родном языке
        string previousNames;        // Предыдущие имена (если менялись)
        Gender gender;
        uint64 birthDate;            // Дата рождения (unix timestamp)
    }

    /// @notice Раздел II: Данные о рождении
    struct BirthInfo {
        bytes32 birthRepublicId;     // Республика рождения
        string birthCity;            // Город/село рождения
        string birthRegion;          // Район/область
        bool bornInConfederation;    // Рождён на территории Конфедерации
        string birthCertificateNumber; // Номер свидетельства о рождении
    }

    /// @notice Раздел III: Семейное положение
    struct FamilyInfo {
        MaritalStatus maritalStatus;
        string spouseName;           // ФИО супруга/супруги
        bytes32 spouseNationId;      // Национальность супруга
        uint8 numberOfChildren;      // Количество детей
        string fatherName;           // ФИО отца
        bytes32 fatherNationId;      // Национальность отца
        string motherName;           // ФИО матери
        bytes32 motherNationId;      // Национальность матери
        bool parentsAreCitizens;     // Родители — граждане Конфедерации
    }

    /// @notice Раздел IV: Этническая принадлежность
    struct EthnicInfo {
        bytes32 primaryNationId;     // Основная национальность
        bytes32 secondaryNationId;   // Вторая национальность (если смешанная)
        string tribe;                // Род/клан (если применимо)
        string ancestralVillage;     // Родовое село/улус
        bool knowsTraditionalCulture; // Знает традиционную культуру
        bool practicesTraditionalReligion; // Практикует традиционную религию
    }

    /// @notice Раздел V: Место жительства
    struct ResidenceInfo {
        bytes32 currentRepublicId;   // Республика проживания
        string currentCity;          // Город проживания
        string currentAddress;       // Адрес
        uint64 residenceSince;       // Проживает с (дата)
        bytes32 previousRepublicId;  // Предыдущая республика (если переезжал)
        uint16 yearsInConfederation; // Лет прожито в Конфедерации
    }

    /// @notice Раздел VI: Образование и профессия
    struct EducationInfo {
        string highestEducation;     // Высшее образование
        string university;           // Название учебного заведения
        string profession;           // Профессия
        string currentOccupation;    // Текущая должность
        string employer;             // Работодатель
        string skills;               // Особые навыки
    }

    /// @notice Раздел VII: Языки
    struct LanguageInfo {
        LanguageLevel russianLevel;      // Русский язык
        LanguageLevel nativeLanguageLevel; // Родной язык
        string nativeLanguageName;       // Название родного языка
        LanguageLevel englishLevel;      // Английский (опционально)
        string otherLanguages;           // Другие языки
    }

    /// @notice Раздел VIII: Контактные данные
    struct ContactInfo {
        string phoneNumber;          // Телефон
        string email;                // Email
        string telegramHandle;       // Telegram (опционально)
        address walletAddress;       // Адрес кошелька
    }

    /// @notice Раздел IX: Клятва гражданина
    struct OathInfo {
        bool oathTaken;              // Клятва принята
        uint64 oathTimestamp;        // Время принятия клятвы
        bytes32 oathHash;            // Хеш подписанной клятвы
        string oathWitness;          // Свидетель (если есть)
    }

    /// @notice Полная анкета
    struct Application {
        uint256 id;
        address applicant;
        ApplicationStatus status;
        CitizenshipBasis basis;

        // Все разделы
        PersonalInfo personal;
        BirthInfo birth;
        FamilyInfo family;
        EthnicInfo ethnic;
        ResidenceInfo residence;
        EducationInfo education;
        LanguageInfo language;
        ContactInfo contact;
        OathInfo oath;

        // Метаданные
        uint64 createdAt;
        uint64 submittedAt;
        uint64 reviewedAt;
        uint64 completedAt;
        address reviewedBy;
        string rejectionReason;
        uint256 documentId;          // ID выданного документа

        bool exists;
    }

    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    uint256 public nextApplicationId;

    mapping(uint256 => Application) public applications;
    mapping(address => uint256) public applicationByApplicant;

    // Статистика
    uint256 public totalApplications;
    uint256 public approvedApplications;
    uint256 public pendingApplications;

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _khural) {
        if (_khural == address(0)) revert ZeroAddress();

        _grantRole(DEFAULT_ADMIN_ROLE, _khural);
        _grantRole(KHURAL_ROLE, _khural);
        _grantRole(REGISTRAR_ROLE, _khural);
        _grantRole(VERIFIER_ROLE, _khural);
    }

    /*//////////////////////////////////////////////////////////////
                    СОЗДАНИЕ И ЗАПОЛНЕНИЕ АНКЕТЫ
    //////////////////////////////////////////////////////////////*/

    /// @notice Создать новую анкету
    function createApplication() external returns (uint256 applicationId) {
        if (applicationByApplicant[msg.sender] != 0) {
            // Возвращаем существующую незавершённую анкету
            uint256 existingId = applicationByApplicant[msg.sender];
            if (applications[existingId].status != ApplicationStatus.COMPLETED &&
                applications[existingId].status != ApplicationStatus.REJECTED) {
                return existingId;
            }
        }

        applicationId = ++nextApplicationId;

        applications[applicationId].id = applicationId;
        applications[applicationId].applicant = msg.sender;
        applications[applicationId].status = ApplicationStatus.DRAFT;
        applications[applicationId].createdAt = uint64(block.timestamp);
        applications[applicationId].contact.walletAddress = msg.sender;
        applications[applicationId].exists = true;

        applicationByApplicant[msg.sender] = applicationId;
        totalApplications++;
        pendingApplications++;

        emit ApplicationCreated(applicationId, msg.sender);
    }

    /// @notice Заполнить раздел I: Личные данные
    function fillPersonalInfo(
        uint256 applicationId,
        string calldata surname,
        string calldata givenNames,
        string calldata surnameNative,
        string calldata givenNamesNative,
        string calldata previousNames,
        Gender gender,
        uint64 birthDate
    ) external {
        Application storage app = applications[applicationId];
        _validateApplication(app);
        _requireApplicant(app);
        _requireDraftOrAdditionalInfo(app);

        if (bytes(surname).length == 0 || bytes(givenNames).length == 0) revert InvalidInput();
        if (birthDate == 0 || birthDate > block.timestamp) revert InvalidInput();

        app.personal = PersonalInfo({
            surname: surname,
            givenNames: givenNames,
            surnameNative: surnameNative,
            givenNamesNative: givenNamesNative,
            previousNames: previousNames,
            gender: gender,
            birthDate: birthDate
        });
    }

    /// @notice Заполнить раздел II: Данные о рождении
    function fillBirthInfo(
        uint256 applicationId,
        bytes32 birthRepublicId,
        string calldata birthCity,
        string calldata birthRegion,
        bool bornInConfederation,
        string calldata birthCertificateNumber
    ) external {
        Application storage app = applications[applicationId];
        _validateApplication(app);
        _requireApplicant(app);
        _requireDraftOrAdditionalInfo(app);

        app.birth = BirthInfo({
            birthRepublicId: birthRepublicId,
            birthCity: birthCity,
            birthRegion: birthRegion,
            bornInConfederation: bornInConfederation,
            birthCertificateNumber: birthCertificateNumber
        });

        // Автоматически определяем основание
        if (bornInConfederation) {
            app.basis = CitizenshipBasis.BIRTHRIGHT;
        }
    }

    /// @notice Заполнить раздел III: Семейное положение
    function fillFamilyInfo(
        uint256 applicationId,
        MaritalStatus maritalStatus,
        string calldata spouseName,
        bytes32 spouseNationId,
        uint8 numberOfChildren,
        string calldata fatherName,
        bytes32 fatherNationId,
        string calldata motherName,
        bytes32 motherNationId,
        bool parentsAreCitizens
    ) external {
        Application storage app = applications[applicationId];
        _validateApplication(app);
        _requireApplicant(app);
        _requireDraftOrAdditionalInfo(app);

        app.family = FamilyInfo({
            maritalStatus: maritalStatus,
            spouseName: spouseName,
            spouseNationId: spouseNationId,
            numberOfChildren: numberOfChildren,
            fatherName: fatherName,
            fatherNationId: fatherNationId,
            motherName: motherName,
            motherNationId: motherNationId,
            parentsAreCitizens: parentsAreCitizens
        });

        // Если родители — граждане, основание по происхождению
        if (parentsAreCitizens && app.basis == CitizenshipBasis.BIRTHRIGHT) {
            app.basis = CitizenshipBasis.DESCENT;
        }
    }

    /// @notice Заполнить раздел IV: Этническая принадлежность
    function fillEthnicInfo(
        uint256 applicationId,
        bytes32 primaryNationId,
        bytes32 secondaryNationId,
        string calldata tribe,
        string calldata ancestralVillage,
        bool knowsTraditionalCulture,
        bool practicesTraditionalReligion
    ) external {
        Application storage app = applications[applicationId];
        _validateApplication(app);
        _requireApplicant(app);
        _requireDraftOrAdditionalInfo(app);

        app.ethnic = EthnicInfo({
            primaryNationId: primaryNationId,
            secondaryNationId: secondaryNationId,
            tribe: tribe,
            ancestralVillage: ancestralVillage,
            knowsTraditionalCulture: knowsTraditionalCulture,
            practicesTraditionalReligion: practicesTraditionalReligion
        });

        // Если указана национальность — возможно коренной
        if (primaryNationId != bytes32(0)) {
            app.basis = CitizenshipBasis.INDIGENOUS;
        }
    }

    /// @notice Заполнить раздел V: Место жительства
    function fillResidenceInfo(
        uint256 applicationId,
        bytes32 currentRepublicId,
        string calldata currentCity,
        string calldata currentAddress,
        uint64 residenceSince,
        bytes32 previousRepublicId,
        uint16 yearsInConfederation
    ) external {
        Application storage app = applications[applicationId];
        _validateApplication(app);
        _requireApplicant(app);
        _requireDraftOrAdditionalInfo(app);

        app.residence = ResidenceInfo({
            currentRepublicId: currentRepublicId,
            currentCity: currentCity,
            currentAddress: currentAddress,
            residenceSince: residenceSince,
            previousRepublicId: previousRepublicId,
            yearsInConfederation: yearsInConfederation
        });

        // Если прожил 5+ лет — может претендовать на натурализацию
        if (yearsInConfederation >= 5 && app.basis == CitizenshipBasis.BIRTHRIGHT) {
            app.basis = CitizenshipBasis.NATURALIZATION;
        }
    }

    /// @notice Заполнить раздел VI: Образование и профессия
    function fillEducationInfo(
        uint256 applicationId,
        string calldata highestEducation,
        string calldata university,
        string calldata profession,
        string calldata currentOccupation,
        string calldata employer,
        string calldata skills
    ) external {
        Application storage app = applications[applicationId];
        _validateApplication(app);
        _requireApplicant(app);
        _requireDraftOrAdditionalInfo(app);

        app.education = EducationInfo({
            highestEducation: highestEducation,
            university: university,
            profession: profession,
            currentOccupation: currentOccupation,
            employer: employer,
            skills: skills
        });
    }

    /// @notice Заполнить раздел VII: Языки
    function fillLanguageInfo(
        uint256 applicationId,
        LanguageLevel russianLevel,
        LanguageLevel nativeLanguageLevel,
        string calldata nativeLanguageName,
        LanguageLevel englishLevel,
        string calldata otherLanguages
    ) external {
        Application storage app = applications[applicationId];
        _validateApplication(app);
        _requireApplicant(app);
        _requireDraftOrAdditionalInfo(app);

        app.language = LanguageInfo({
            russianLevel: russianLevel,
            nativeLanguageLevel: nativeLanguageLevel,
            nativeLanguageName: nativeLanguageName,
            englishLevel: englishLevel,
            otherLanguages: otherLanguages
        });
    }

    /// @notice Заполнить раздел VIII: Контактные данные
    function fillContactInfo(
        uint256 applicationId,
        string calldata phoneNumber,
        string calldata email,
        string calldata telegramHandle
    ) external {
        Application storage app = applications[applicationId];
        _validateApplication(app);
        _requireApplicant(app);
        _requireDraftOrAdditionalInfo(app);

        app.contact.phoneNumber = phoneNumber;
        app.contact.email = email;
        app.contact.telegramHandle = telegramHandle;
    }

    /*//////////////////////////////////////////////////////////////
                        ПОДАЧА И РАССМОТРЕНИЕ
    //////////////////////////////////////////////////////////////*/

    /// @notice Подать анкету на рассмотрение
    function submitApplication(uint256 applicationId) external {
        Application storage app = applications[applicationId];
        _validateApplication(app);
        _requireApplicant(app);

        if (app.status != ApplicationStatus.DRAFT &&
            app.status != ApplicationStatus.ADDITIONAL_INFO) {
            revert AlreadySubmitted();
        }

        // Проверяем обязательные поля
        if (bytes(app.personal.surname).length == 0) revert InvalidInput();
        if (app.personal.birthDate == 0) revert InvalidInput();

        app.status = ApplicationStatus.SUBMITTED;
        app.submittedAt = uint64(block.timestamp);

        emit ApplicationSubmitted(applicationId);
    }

    /// @notice Начать рассмотрение (верификатор)
    function startReview(uint256 applicationId) external onlyRole(VERIFIER_ROLE) {
        Application storage app = applications[applicationId];
        _validateApplication(app);

        if (app.status != ApplicationStatus.SUBMITTED) revert InvalidStatus();

        _changeStatus(applicationId, ApplicationStatus.UNDER_REVIEW);
    }

    /// @notice Запросить дополнительную информацию
    function requestAdditionalInfo(uint256 applicationId, string calldata reason) external onlyRole(VERIFIER_ROLE) {
        Application storage app = applications[applicationId];
        _validateApplication(app);

        if (app.status != ApplicationStatus.UNDER_REVIEW) revert InvalidStatus();

        app.rejectionReason = reason;  // Используем как поле для заметок
        _changeStatus(applicationId, ApplicationStatus.ADDITIONAL_INFO);
    }

    /// @notice Одобрить анкету
    function approveApplication(uint256 applicationId) external onlyRole(VERIFIER_ROLE) {
        Application storage app = applications[applicationId];
        _validateApplication(app);

        if (app.status != ApplicationStatus.UNDER_REVIEW) revert InvalidStatus();

        app.reviewedAt = uint64(block.timestamp);
        app.reviewedBy = msg.sender;

        _changeStatus(applicationId, ApplicationStatus.OATH_PENDING);

        emit ApplicationApproved(applicationId, msg.sender);
    }

    /// @notice Отклонить анкету
    function rejectApplication(uint256 applicationId, string calldata reason) external onlyRole(VERIFIER_ROLE) {
        Application storage app = applications[applicationId];
        _validateApplication(app);

        if (app.status != ApplicationStatus.UNDER_REVIEW) revert InvalidStatus();

        app.reviewedAt = uint64(block.timestamp);
        app.reviewedBy = msg.sender;
        app.rejectionReason = reason;
        pendingApplications--;

        _changeStatus(applicationId, ApplicationStatus.REJECTED);

        emit ApplicationRejected(applicationId, msg.sender, reason);
    }

    /*//////////////////////////////////////////////////////////////
                        КЛЯТВА ГРАЖДАНИНА
    //////////////////////////////////////////////////////////////*/

    /// @notice Принять клятву гражданина
    /// @dev Клятва — священный акт связи с землёй и народом
    function takeOath(uint256 applicationId) external {
        Application storage app = applications[applicationId];
        _validateApplication(app);
        _requireApplicant(app);

        if (app.status != ApplicationStatus.OATH_PENDING) revert InvalidStatus();

        // Генерируем хеш клятвы
        bytes32 oathHash = keccak256(abi.encodePacked(
            msg.sender,
            applicationId,
            block.timestamp,
            getOathText()
        ));

        app.oath = OathInfo({
            oathTaken: true,
            oathTimestamp: uint64(block.timestamp),
            oathHash: oathHash,
            oathWitness: ""
        });

        app.completedAt = uint64(block.timestamp);
        approvedApplications++;
        pendingApplications--;

        _changeStatus(applicationId, ApplicationStatus.COMPLETED);

        emit OathTaken(applicationId, msg.sender, uint64(block.timestamp));
    }

    /// @notice Получить текст клятвы
    function getOathText() public pure returns (string memory) {
        return unicode"═══════════════════════════════════════════════════════════════\n"
               unicode"           КЛЯТВА ГРАЖДАНИНА СИБИРСКОЙ КОНФЕДЕРАЦИИ\n"
               unicode"═══════════════════════════════════════════════════════════════\n\n"
               unicode"Я, вступая в ряды граждан Сибирской Конфедерации,\n"
               unicode"торжественно клянусь:\n\n"
               unicode"• ЗАЩИЩАТЬ землю своих предков и землю, которая меня приняла,\n"
               unicode"  от любых посягательств и угроз;\n\n"
               unicode"• УВАЖАТЬ и ОБЕРЕГАТЬ коренные народы Конфедерации,\n"
               unicode"  их культуру, язык, традиции и веру;\n\n"
               unicode"• ЗАЩИЩАТЬ свободу и достоинство каждого гражданина,\n"
               unicode"  независимо от происхождения и вероисповедания;\n\n"
               unicode"• СОБЛЮДАТЬ Аксиомы и Конституцию Конфедерации,\n"
               unicode"  законы своей Республики и решения Хурала;\n\n"
               unicode"• СВЯЗАТЬ свою судьбу с судьбой Конфедерации,\n"
               unicode"  быть верным ей в мирное время и в час испытаний;\n\n"
               unicode"• ПЕРЕДАТЬ детям и внукам любовь к родной земле,\n"
               unicode"  знание истории и уважение к предкам;\n\n"
               unicode"• НЕ ПРЕДАВАТЬ доверие народа и не использовать\n"
               unicode"  своё положение во вред Конфедерации.\n\n"
               unicode"Принимая эту клятву, я становлюсь ХРАНИТЕЛЕМ этой земли\n"
               unicode"и ЗАЩИТНИКОМ её народов — ныне и навеки.\n\n"
               unicode"Да будет Вечное Синее Небо свидетелем моей клятвы!\n\n"
               unicode"═══════════════════════════════════════════════════════════════\n"
               unicode"           Хүхэ Мүнхэ Тэнгэри / Вечное Синее Небо\n"
               unicode"═══════════════════════════════════════════════════════════════";
    }

    /*//////////////////////////////////////////////////////////////
                        ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
    //////////////////////////////////////////////////////////////*/

    function _validateApplication(Application storage app) internal view {
        if (!app.exists) revert ApplicationNotFound();
    }

    function _requireApplicant(Application storage app) internal view {
        if (msg.sender != app.applicant) revert NotApplicant();
    }

    function _requireDraftOrAdditionalInfo(Application storage app) internal view {
        if (app.status != ApplicationStatus.DRAFT &&
            app.status != ApplicationStatus.ADDITIONAL_INFO) {
            revert InvalidStatus();
        }
    }

    function _changeStatus(uint256 applicationId, ApplicationStatus newStatus) internal {
        Application storage app = applications[applicationId];
        ApplicationStatus oldStatus = app.status;
        app.status = newStatus;

        emit ApplicationStatusChanged(applicationId, oldStatus, newStatus);
    }

    /*//////////////////////////////////////////////////////////////
                        ФУНКЦИИ ЧТЕНИЯ
    //////////////////////////////////////////////////////////////*/

    /// @notice Получить анкету
    function getApplication(uint256 applicationId) external view returns (Application memory) {
        if (!applications[applicationId].exists) revert ApplicationNotFound();
        return applications[applicationId];
    }

    /// @notice Получить анкету заявителя
    function getMyApplication() external view returns (Application memory) {
        uint256 appId = applicationByApplicant[msg.sender];
        if (appId == 0) revert ApplicationNotFound();
        return applications[appId];
    }

    /// @notice Получить статус анкеты
    function getApplicationStatus(uint256 applicationId) external view returns (
        ApplicationStatus status,
        string memory statusName
    ) {
        if (!applications[applicationId].exists) revert ApplicationNotFound();

        status = applications[applicationId].status;
        statusName = _getStatusName(status);
    }

    function _getStatusName(ApplicationStatus status) internal pure returns (string memory) {
        if (status == ApplicationStatus.DRAFT) return unicode"Черновик";
        if (status == ApplicationStatus.SUBMITTED) return unicode"Подана";
        if (status == ApplicationStatus.UNDER_REVIEW) return unicode"На рассмотрении";
        if (status == ApplicationStatus.ADDITIONAL_INFO) return unicode"Требуется доп. информация";
        if (status == ApplicationStatus.APPROVED) return unicode"Одобрена";
        if (status == ApplicationStatus.REJECTED) return unicode"Отклонена";
        if (status == ApplicationStatus.OATH_PENDING) return unicode"Ожидает принятия клятвы";
        if (status == ApplicationStatus.COMPLETED) return unicode"Завершена";
        return unicode"Неизвестно";
    }

    /// @notice Получить название основания
    function getBasisName(CitizenshipBasis basis) external pure returns (string memory) {
        if (basis == CitizenshipBasis.BIRTHRIGHT) return unicode"Право рождения";
        if (basis == CitizenshipBasis.INDIGENOUS) return unicode"Коренной народ";
        if (basis == CitizenshipBasis.DESCENT) return unicode"По происхождению";
        if (basis == CitizenshipBasis.NATURALIZATION) return unicode"Натурализация";
        if (basis == CitizenshipBasis.MARRIAGE) return unicode"Брак с гражданином";
        if (basis == CitizenshipBasis.SPECIAL_MERIT) return unicode"За особые заслуги";
        return unicode"Не определено";
    }

    /// @notice Получить статистику
    function getStats() external view returns (
        uint256 _totalApplications,
        uint256 _approvedApplications,
        uint256 _pendingApplications
    ) {
        return (totalApplications, approvedApplications, pendingApplications);
    }

    /// @notice Получить инструкцию по заполнению
    function getInstructions() external pure returns (string memory) {
        return unicode"═══════════════════════════════════════════════════════════════\n"
               unicode"      ИНСТРУКЦИЯ ПО ЗАПОЛНЕНИЮ АНКЕТЫ ФОРМЫ СК-1\n"
               unicode"═══════════════════════════════════════════════════════════════\n\n"
               unicode"1. createApplication()      - Создать анкету\n\n"
               unicode"2. Заполните все разделы:\n"
               unicode"   • fillPersonalInfo()     - Личные данные\n"
               unicode"   • fillBirthInfo()        - Данные о рождении\n"
               unicode"   • fillFamilyInfo()       - Семейное положение\n"
               unicode"   • fillEthnicInfo()       - Этническая принадлежность\n"
               unicode"   • fillResidenceInfo()    - Место жительства\n"
               unicode"   • fillEducationInfo()    - Образование и профессия\n"
               unicode"   • fillLanguageInfo()     - Владение языками\n"
               unicode"   • fillContactInfo()      - Контактные данные\n\n"
               unicode"3. submitApplication()      - Подать анкету\n\n"
               unicode"4. Дождитесь рассмотрения верификатором\n\n"
               unicode"5. takeOath()               - Принять клятву гражданина\n\n"
               unicode"После принятия клятвы вы получите Документ Гражданина\n"
               unicode"и станете полноправным ХРАНИТЕЛЕМ земли Конфедерации.\n\n"
               unicode"═══════════════════════════════════════════════════════════════\n"
               unicode"  Никто не будет оставлен позади.\n"
               unicode"  Каждый рождённый на этой земле — её хранитель.\n"
               unicode"═══════════════════════════════════════════════════════════════";
    }
}
