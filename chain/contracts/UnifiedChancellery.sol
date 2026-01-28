// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title UnifiedChancellery (Единая Канцелярия)
 * @notice Централизованный архив всех документов по стандартам СНГ
 * 
 * Функции:
 * 1. Государственные и частные документы
 * 2. Стандартные бланки (СНГ форматы)
 * 3. Категории и жизненный путь документов
 * 4. Quest система (заказы на работу)
 * 5. Гильдии профессий
 * 6. Биржа работ/товаров
 * 
 * Стандарты СНГ:
 * - Договор, Акт, Накладная, Счёт-фактура
 * - ГОСТ Р, ТР ТС, ЕврАзЭС
 */
contract UnifiedChancellery {
    
    /* ==================== ERRORS ==================== */
    error NotOwner();
    error NotAuthorized();
    error DocumentNotFound();
    error TemplateNotFound();
    error QuestNotFound();
    error GuildNotFound();
    error InvalidStatus();
    
    /* ==================== DOCUMENT CATEGORIES (СНГ) ==================== */
    
    enum DocCategory {
        // Государственные
        LAW,                    // Закон
        DECREE,                 // Указ
        RESOLUTION,             // Постановление
        ORDER,                  // Приказ
        LICENSE,                // Лицензия
        CERTIFICATE,            // Сертификат
        
        // Хозяйственные (СНГ стандарт)
        DOGOVOR,                // Договор
        AKT,                    // Акт выполненных работ
        NAKLADNAYA,             // Товарная накладная (ТОРГ-12)
        SCHET_FAKTURA,          // Счёт-фактура
        UPD,                    // Универсальный передаточный документ
        TTN,                    // Товарно-транспортная накладная
        INVOICE,                // Инвойс (экспорт)
        
        // Кадровые
        TRUDOVOY_DOGOVOR,       // Трудовой договор
        PRIKAZ_KADRY,           // Приказ по кадрам
        SPRAVKA,                // Справка
        
        // Технические
        TECH_ZADANIE,           // Техническое задание (ТЗ)
        TECH_USLOVIYA,          // Технические условия (ТУ)
        SERTIFIKAT_GOST,        // Сертификат ГОСТ
        PASPORT_IZDELIYA,       // Паспорт изделия
        
        // Quest (Заказы)
        QUEST_ORDER,            // Заказ на работу
        QUEST_RESULT,           // Результат выполнения
        
        OTHER
    }
    
    enum DocStatus {
        DRAFT,          // Черновик
        PENDING,        // На согласовании
        SIGNED,         // Подписан
        ACTIVE,         // Действует
        EXECUTED,       // Исполнен
        ARCHIVED,       // В архиве
        CANCELLED       // Аннулирован
    }
    
    enum AccessLevel {
        PUBLIC,         // Общедоступный
        INTERNAL,       // Внутренний
        CONFIDENTIAL,   // Конфиденциальный
        SECRET          // Секретный
    }
    
    /* ==================== DOCUMENT STRUCTURE (СНГ) ==================== */
    
    struct Document {
        bytes32 docId;
        uint256 regNumber;          // Регистрационный номер
        DocCategory category;
        DocStatus status;
        AccessLevel access;
        
        // Реквизиты
        string title;               // Название документа
        bytes32 contentHash;        // Хэш содержимого
        bytes32 templateId;         // ID шаблона
        
        // Стороны
        address creator;            // Создатель
        address[] signers;          // Подписанты
        uint256 signedCount;        // Сколько подписали
        
        // Связи
        bytes32 parentDocId;        // Основание (родительский документ)
        bytes32[] attachments;      // Приложения
        
        // Даты
        uint256 createdAt;
        uint256 signedAt;
        uint256 expiresAt;
        uint256 archivedAt;
    }
    
    /* ==================== TEMPLATES (Бланки) ==================== */
    
    struct DocTemplate {
        bytes32 templateId;
        DocCategory category;
        string name;                // "Договор поставки"
        string code;                // "ДП-001"
        bytes32 blankHash;          // Хэш бланка
        string[] requiredFields;    // Обязательные поля
        bool isActive;
    }
    
    /* ==================== QUEST SYSTEM ==================== */
    
    enum QuestStatus {
        OPEN,           // Открыт
        IN_PROGRESS,    // Выполняется
        REVIEW,         // На проверке
        COMPLETED,      // Завершён
        DISPUTED,       // Спор
        CANCELLED       // Отменён
    }
    
    struct Quest {
        bytes32 questId;
        bytes32 contractDocId;      // Связанный договор
        
        address customer;           // Заказчик
        address executor;           // Исполнитель (0 = открыт)
        bytes32 guildId;            // Гильдия (0 = любая)
        
        string title;
        bytes32 specHash;           // Хэш ТЗ
        uint256 reward;             // Награда в ALTAN
        uint256 deadline;
        
        QuestStatus status;
        uint256 createdAt;
        uint256 startedAt;
        uint256 completedAt;
        
        bytes32 resultDocId;        // Акт выполненных работ
    }
    
    /* ==================== GUILDS (Гильдии) ==================== */
    
    struct Guild {
        bytes32 guildId;
        string name;                // "Гильдия Строителей"
        string code;                // "GUILD-BUILD"
        address master;             // Глава гильдии
        uint256 memberCount;
        uint256 completedQuests;
        uint256 totalEarned;
        bool isActive;
    }
    
    struct GuildMember {
        address member;
        bytes32 guildId;
        string rank;                // "Подмастерье", "Мастер", "Гроссмейстер"
        uint256 completedQuests;
        uint256 reputation;         // 0-1000
        uint256 joinedAt;
    }
    
    /* ==================== STATE ==================== */
    
    address public owner;
    
    // Documents
    uint256 public nextRegNumber = 1;
    mapping(bytes32 => Document) public documents;
    mapping(uint256 => bytes32) public regNumberToDocId;
    mapping(address => bytes32[]) public userDocuments;
    
    // Templates
    mapping(bytes32 => DocTemplate) public templates;
    mapping(DocCategory => bytes32[]) public categoryTemplates;
    
    // Quests
    uint256 public nextQuestId = 1;
    mapping(bytes32 => Quest) public quests;
    bytes32[] public openQuests;                    // Биржа работ
    mapping(address => bytes32[]) public userQuests;
    
    // Guilds
    mapping(bytes32 => Guild) public guilds;
    mapping(address => GuildMember) public guildMembers;
    mapping(bytes32 => address[]) public guildMemberList;
    bytes32[] public allGuilds;
    
    // Access
    mapping(address => bool) public isNotary;       // Нотариусы
    mapping(address => bool) public isRegistrar;    // Регистраторы
    
    /* ==================== EVENTS ==================== */
    
    event DocumentCreated(
        bytes32 indexed docId, 
        uint256 regNumber, 
        DocCategory category,
        address indexed creator
    );
    
    event DocumentSigned(
        bytes32 indexed docId, 
        address indexed signer, 
        uint256 signedCount
    );
    
    event DocumentStatusChanged(
        bytes32 indexed docId, 
        DocStatus oldStatus, 
        DocStatus newStatus
    );
    
    event QuestCreated(
        bytes32 indexed questId, 
        address indexed customer, 
        uint256 reward,
        bytes32 guildId
    );
    
    event QuestAccepted(
        bytes32 indexed questId, 
        address indexed executor
    );
    
    event QuestCompleted(
        bytes32 indexed questId, 
        bytes32 resultDocId
    );
    
    event GuildCreated(
        bytes32 indexed guildId, 
        string name, 
        address indexed master
    );
    
    event MemberJoinedGuild(
        address indexed member, 
        bytes32 indexed guildId
    );
    
    /* ==================== MODIFIERS ==================== */
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    
    modifier onlyNotary() {
        if (!isNotary[msg.sender] && msg.sender != owner) revert NotAuthorized();
        _;
    }
    
    /* ==================== CONSTRUCTOR ==================== */
    
    constructor() {
        owner = msg.sender;
        isNotary[msg.sender] = true;
        isRegistrar[msg.sender] = true;
        
        _createDefaultTemplates();
    }
    
    function _createDefaultTemplates() internal {
        // Договор поставки
        _addTemplate(DocCategory.DOGOVOR, "Dogovor Postavki", "DP-001");
        _addTemplate(DocCategory.DOGOVOR, "Dogovor Podryada", "DPR-001");
        _addTemplate(DocCategory.DOGOVOR, "Dogovor Uslugi", "DU-001");
        
        // Акты
        _addTemplate(DocCategory.AKT, "Akt Vypolnennykh Rabot", "AVR-001");
        _addTemplate(DocCategory.AKT, "Akt Priema-Peredachi", "APP-001");
        
        // Накладные
        _addTemplate(DocCategory.NAKLADNAYA, "TORG-12", "T12-001");
        _addTemplate(DocCategory.TTN, "TTN-1", "TTN-001");
        
        // Счета
        _addTemplate(DocCategory.SCHET_FAKTURA, "Schet-Faktura", "SF-001");
        _addTemplate(DocCategory.UPD, "UPD", "UPD-001");
        
        // Quest
        _addTemplate(DocCategory.QUEST_ORDER, "Quest Zakaz", "QZ-001");
        _addTemplate(DocCategory.QUEST_RESULT, "Quest Result", "QR-001");
        
        // Технические
        _addTemplate(DocCategory.TECH_ZADANIE, "Tekhnicheskoe Zadanie", "TZ-001");
    }
    
    function _addTemplate(
        DocCategory category, 
        string memory name, 
        string memory code
    ) internal {
        bytes32 templateId = keccak256(abi.encodePacked(code, block.timestamp));
        
        string[] memory fields = new string[](0);
        
        templates[templateId] = DocTemplate({
            templateId: templateId,
            category: category,
            name: name,
            code: code,
            blankHash: bytes32(0),
            requiredFields: fields,
            isActive: true
        });
        
        categoryTemplates[category].push(templateId);
    }
    
    /* ==================== DOCUMENT CREATION ==================== */
    
    /**
     * @notice Создать документ по шаблону
     */
    function createDocument(
        bytes32 templateId,
        string calldata title,
        bytes32 contentHash,
        address[] calldata signers,
        bytes32 parentDocId,
        AccessLevel access,
        uint256 expiresAt
    ) external returns (bytes32 docId, uint256 regNumber) {
        DocTemplate storage tpl = templates[templateId];
        if (!tpl.isActive) revert TemplateNotFound();
        
        regNumber = nextRegNumber++;
        docId = keccak256(abi.encodePacked(regNumber, block.timestamp, msg.sender));
        
        documents[docId] = Document({
            docId: docId,
            regNumber: regNumber,
            category: tpl.category,
            status: DocStatus.DRAFT,
            access: access,
            title: title,
            contentHash: contentHash,
            templateId: templateId,
            creator: msg.sender,
            signers: signers,
            signedCount: 0,
            parentDocId: parentDocId,
            attachments: new bytes32[](0),
            createdAt: block.timestamp,
            signedAt: 0,
            expiresAt: expiresAt,
            archivedAt: 0
        });
        
        regNumberToDocId[regNumber] = docId;
        userDocuments[msg.sender].push(docId);
        
        emit DocumentCreated(docId, regNumber, tpl.category, msg.sender);
    }
    
    /**
     * @notice Подписать документ
     */
    function signDocument(bytes32 docId) external {
        Document storage doc = documents[docId];
        if (doc.docId == bytes32(0)) revert DocumentNotFound();
        
        bool isSigner = false;
        for (uint i = 0; i < doc.signers.length; i++) {
            if (doc.signers[i] == msg.sender) {
                isSigner = true;
                break;
            }
        }
        require(isSigner, "Not a signer");
        
        doc.signedCount++;
        
        emit DocumentSigned(docId, msg.sender, doc.signedCount);
        
        // Все подписали
        if (doc.signedCount >= doc.signers.length) {
            _changeStatus(docId, DocStatus.SIGNED);
            doc.signedAt = block.timestamp;
        }
    }
    
    function _changeStatus(bytes32 docId, DocStatus newStatus) internal {
        Document storage doc = documents[docId];
        DocStatus old = doc.status;
        doc.status = newStatus;
        emit DocumentStatusChanged(docId, old, newStatus);
    }
    
    /**
     * @notice Активировать документ (после подписания)
     */
    function activateDocument(bytes32 docId) external onlyNotary {
        Document storage doc = documents[docId];
        require(doc.status == DocStatus.SIGNED, "Not signed");
        _changeStatus(docId, DocStatus.ACTIVE);
    }
    
    /**
     * @notice Архивировать документ
     */
    function archiveDocument(bytes32 docId) external {
        Document storage doc = documents[docId];
        require(msg.sender == doc.creator || isNotary[msg.sender], "Not authorized");
        _changeStatus(docId, DocStatus.ARCHIVED);
        doc.archivedAt = block.timestamp;
    }
    
    /* ==================== QUEST SYSTEM ==================== */
    
    /**
     * @notice Создать Quest (заказ на работу)
     */
    function createQuest(
        string calldata title,
        bytes32 specHash,
        uint256 reward,
        uint256 deadline,
        bytes32 guildId
    ) external returns (bytes32 questId) {
        questId = keccak256(abi.encodePacked(nextQuestId++, msg.sender, block.timestamp));
        
        quests[questId] = Quest({
            questId: questId,
            contractDocId: bytes32(0),
            customer: msg.sender,
            executor: address(0),
            guildId: guildId,
            title: title,
            specHash: specHash,
            reward: reward,
            deadline: deadline,
            status: QuestStatus.OPEN,
            createdAt: block.timestamp,
            startedAt: 0,
            completedAt: 0,
            resultDocId: bytes32(0)
        });
        
        openQuests.push(questId);
        userQuests[msg.sender].push(questId);
        
        emit QuestCreated(questId, msg.sender, reward, guildId);
    }
    
    /**
     * @notice Принять Quest
     */
    function acceptQuest(bytes32 questId) external {
        Quest storage q = quests[questId];
        if (q.questId == bytes32(0)) revert QuestNotFound();
        require(q.status == QuestStatus.OPEN, "Not open");
        require(q.executor == address(0), "Already taken");
        
        // Check guild membership if required
        if (q.guildId != bytes32(0)) {
            require(guildMembers[msg.sender].guildId == q.guildId, "Not in guild");
        }
        
        q.executor = msg.sender;
        q.status = QuestStatus.IN_PROGRESS;
        q.startedAt = block.timestamp;
        
        // Remove from open quests
        _removeFromOpenQuests(questId);
        
        userQuests[msg.sender].push(questId);
        
        emit QuestAccepted(questId, msg.sender);
    }
    
    function _removeFromOpenQuests(bytes32 questId) internal {
        for (uint i = 0; i < openQuests.length; i++) {
            if (openQuests[i] == questId) {
                openQuests[i] = openQuests[openQuests.length - 1];
                openQuests.pop();
                break;
            }
        }
    }
    
    /**
     * @notice Сдать работу
     */
    function submitQuestResult(bytes32 questId, bytes32 resultDocId) external {
        Quest storage q = quests[questId];
        require(q.executor == msg.sender, "Not executor");
        require(q.status == QuestStatus.IN_PROGRESS, "Wrong status");
        
        q.resultDocId = resultDocId;
        q.status = QuestStatus.REVIEW;
    }
    
    /**
     * @notice Подтвердить выполнение (заказчик)
     */
    function confirmQuestCompletion(bytes32 questId) external {
        Quest storage q = quests[questId];
        require(q.customer == msg.sender, "Not customer");
        require(q.status == QuestStatus.REVIEW, "Not in review");
        
        q.status = QuestStatus.COMPLETED;
        q.completedAt = block.timestamp;
        
        // Update guild stats
        if (guildMembers[q.executor].guildId != bytes32(0)) {
            guildMembers[q.executor].completedQuests++;
            guildMembers[q.executor].reputation += 10;
            guilds[guildMembers[q.executor].guildId].completedQuests++;
            guilds[guildMembers[q.executor].guildId].totalEarned += q.reward;
        }
        
        emit QuestCompleted(questId, q.resultDocId);
    }
    
    /* ==================== GUILDS ==================== */
    
    /**
     * @notice Создать гильдию
     */
    function createGuild(
        string calldata name, 
        string calldata code
    ) external returns (bytes32 guildId) {
        guildId = keccak256(abi.encodePacked(code, msg.sender, block.timestamp));
        
        guilds[guildId] = Guild({
            guildId: guildId,
            name: name,
            code: code,
            master: msg.sender,
            memberCount: 1,
            completedQuests: 0,
            totalEarned: 0,
            isActive: true
        });
        
        guildMembers[msg.sender] = GuildMember({
            member: msg.sender,
            guildId: guildId,
            rank: "Guildmaster",
            completedQuests: 0,
            reputation: 1000,
            joinedAt: block.timestamp
        });
        
        guildMemberList[guildId].push(msg.sender);
        allGuilds.push(guildId);
        
        emit GuildCreated(guildId, name, msg.sender);
    }
    
    /**
     * @notice Вступить в гильдию
     */
    function joinGuild(bytes32 guildId) external {
        Guild storage g = guilds[guildId];
        if (!g.isActive) revert GuildNotFound();
        require(guildMembers[msg.sender].guildId == bytes32(0), "Already in guild");
        
        guildMembers[msg.sender] = GuildMember({
            member: msg.sender,
            guildId: guildId,
            rank: "Apprentice",
            completedQuests: 0,
            reputation: 100,
            joinedAt: block.timestamp
        });
        
        g.memberCount++;
        guildMemberList[guildId].push(msg.sender);
        
        emit MemberJoinedGuild(msg.sender, guildId);
    }
    
    /* ==================== VIEW FUNCTIONS ==================== */
    
    function getDocument(bytes32 docId) external view returns (Document memory) {
        return documents[docId];
    }
    
    function getQuest(bytes32 questId) external view returns (Quest memory) {
        return quests[questId];
    }
    
    function getGuild(bytes32 guildId) external view returns (Guild memory) {
        return guilds[guildId];
    }
    
    function getMember(address member) external view returns (GuildMember memory) {
        return guildMembers[member];
    }
    
    function getOpenQuests() external view returns (bytes32[] memory) {
        return openQuests;
    }
    
    function getAllGuilds() external view returns (bytes32[] memory) {
        return allGuilds;
    }
    
    function getUserDocuments(address user) external view returns (bytes32[] memory) {
        return userDocuments[user];
    }
    
    function getTemplatesForCategory(DocCategory category) 
        external view returns (bytes32[] memory) 
    {
        return categoryTemplates[category];
    }
    
    /* ==================== ADMIN ==================== */
    
    function setNotary(address notary, bool auth) external onlyOwner {
        isNotary[notary] = auth;
    }
    
    function setRegistrar(address reg, bool auth) external onlyOwner {
        isRegistrar[reg] = auth;
    }
    
    function addTemplate(
        DocCategory category,
        string calldata name,
        string calldata code,
        bytes32 blankHash,
        string[] calldata requiredFields
    ) external onlyOwner returns (bytes32 templateId) {
        templateId = keccak256(abi.encodePacked(code, block.timestamp));
        
        templates[templateId] = DocTemplate({
            templateId: templateId,
            category: category,
            name: name,
            code: code,
            blankHash: blankHash,
            requiredFields: requiredFields,
            isActive: true
        });
        
        categoryTemplates[category].push(templateId);
    }
}
