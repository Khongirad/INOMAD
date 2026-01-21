// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title NationRegistry
 * @notice Реестр Народов Сибирской Конфедерации
 *
 * "Сибирь — колыбель кочевой цивилизации"
 *
 * Данный контракт содержит расширяемый список коренных народов,
 * их историю, культуру и связь с землёй предков.
 *
 * При регистрации гражданин выбирает:
 * 1. Свой народ (нацию) — с описанием истории и культуры
 * 2. Территорию рождения — республику/регион
 *
 * Это создаёт документ принадлежности: [Союз]-[Республика]
 * Например: Сибирь-Буряад-Монголия
 *
 * ═══════════════════════════════════════════════════════════════
 * ДОБРО ПОЖАЛОВАТЬ В СИБИРСКУЮ КОНФЕДЕРАЦИЮ
 * Союз свободных народов от Урала до Тихого океана
 * ═══════════════════════════════════════════════════════════════
 *
 * РАСШИРЯЕМОСТЬ:
 * - Хурал может добавлять новые народы (новые континенты, миграции)
 * - Куратор может обновлять информацию о существующих народах
 * - Народы могут быть связаны с территориями (homelands)
 */
contract NationRegistry is AccessControl {
    /*//////////////////////////////////////////////////////////////
                                ROLES
    //////////////////////////////////////////////////////////////*/

    /// @notice Роль Хурала - высший орган управления
    bytes32 public constant KHURAL_ROLE = keccak256("KHURAL_ROLE");

    /// @notice Роль куратора народов - может обновлять информацию
    bytes32 public constant CURATOR_ROLE = keccak256("CURATOR_ROLE");

    /*//////////////////////////////////////////////////////////////
                            DATA STRUCTURES
    //////////////////////////////////////////////////////////////*/

    /// @notice Категория народа по языковой семье
    enum LanguageFamily {
        MONGOLIC,       // Монгольские народы
        TURKIC,         // Тюркские народы
        TUNGUSIC,       // Тунгусо-маньчжурские
        UGRIC,          // Угорские (финно-угорские)
        PALEOSIBERIAN,  // Палеоазиатские
        SLAVIC,         // Славянские
        CAUCASIAN,      // Кавказские
        SAMOYEDIC,      // Самодийские
        AMERINDIAN,     // Индейские народы (Америка)
        AFRICAN,        // Африканские народы
        AUSTRONESIAN,   // Австронезийские (Океания, ЮВА)
        DRAVIDIAN,      // Дравидийские (Индия)
        SINOTIBETAN,    // Сино-тибетские (Китай, Тибет)
        SEMITIC,        // Семитские (Ближний Восток)
        OTHER           // Другие
    }

    /// @notice Континент/регион происхождения
    enum Continent {
        SIBERIA,        // Сибирь (по умолчанию)
        CAUCASUS,       // Кавказ
        VOLGA_URAL,     // Поволжье и Урал
        EUROPE,         // Европа
        CENTRAL_ASIA,   // Центральная Азия
        EAST_ASIA,      // Восточная Азия
        SOUTH_ASIA,     // Южная Азия
        MIDDLE_EAST,    // Ближний Восток
        AFRICA,         // Африка
        NORTH_AMERICA,  // Северная Америка
        SOUTH_AMERICA,  // Южная Америка
        OCEANIA         // Океания
    }

    /// @notice Информация о народе
    struct Nation {
        bytes32 id;
        string name;                // Название на русском
        string nameNative;          // Название на родном языке
        string description;         // Краткое описание (история, культура)
        string greeting;            // Приветствие на родном языке
        LanguageFamily family;
        Continent continent;        // Континент происхождения
        bytes32[] homelands;        // Исконные территории (republicIds)
        uint256 population;         // Примерная численность
        bool active;                // Активен ли народ в системе
        bool exists;
        uint64 createdAt;           // Дата добавления
        uint64 updatedAt;           // Дата последнего обновления
    }

    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    mapping(bytes32 => Nation) public nations;
    bytes32[] public nationIds;

    /// @notice Народы по континентам
    mapping(Continent => bytes32[]) public nationsByContinent;

    /// @notice Народы по языковым семьям
    mapping(LanguageFamily => bytes32[]) public nationsByFamily;

    /// @notice Дата создания реестра
    uint256 public immutable createdAt;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event NationCreated(
        bytes32 indexed nationId,
        string name,
        string nameNative,
        LanguageFamily family,
        Continent continent
    );

    event NationUpdated(
        bytes32 indexed nationId,
        string name,
        address indexed updatedBy
    );

    event NationStatusChanged(
        bytes32 indexed nationId,
        bool active
    );

    event HomelandAdded(
        bytes32 indexed nationId,
        bytes32 indexed territoryId
    );

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error ZeroAddress();
    error NationNotFound(bytes32 nationId);
    error NationAlreadyExists(bytes32 nationId);
    error EmptyName();

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _khural) {
        if (_khural == address(0)) revert ZeroAddress();

        createdAt = block.timestamp;

        _grantRole(DEFAULT_ADMIN_ROLE, _khural);
        _grantRole(KHURAL_ROLE, _khural);
        _grantRole(CURATOR_ROLE, _khural);

        _initializeNations();
    }

    /*//////////////////////////////////////////////////////////////
                    ИНИЦИАЛИЗАЦИЯ НАРОДОВ
    //////////////////////////////////////////////////////////////*/

    function _initializeNations() internal {
        // ═══════════════════════════════════════════════════════════════
        // МОНГОЛЬСКИЕ НАРОДЫ (MONGOLIC)
        // ═══════════════════════════════════════════════════════════════

        _createNation(
            unicode"Буряад-Монголы",
            unicode"Буряад-Монгол",
            unicode"Древний народ великой степи, потомки воинов Чингисхана. "
            unicode"Хранители традиций кочевой цивилизации, буддизма и шаманизма. "
            unicode"Наша земля — от Байкала до Тихого океана. "
            unicode"Мы — дети Вечного Синего Неба (Хухэ Мунхэ Тэнгри). "
            unicode"Наши предки создали величайшую империю в истории человечества.",
            unicode"Сайн байна уу! (Здравствуйте!)",
            LanguageFamily.MONGOLIC,
            3_000_000
        );

        _createNation(
            unicode"Калмыки",
            unicode"Хальмгуд",
            unicode"Западные монголы, ойраты. Единственный буддийский народ Европы. "
            unicode"Прошли великий путь от Джунгарии до берегов Волги. "
            unicode"Хранители эпоса 'Джангар' — величайшего памятника монгольской литературы.",
            unicode"Менд! (Привет!)",
            LanguageFamily.MONGOLIC,
            180_000
        );

        // ═══════════════════════════════════════════════════════════════
        // ТЮРКСКИЕ НАРОДЫ (TURKIC)
        // ═══════════════════════════════════════════════════════════════

        _createNation(
            unicode"Якуты (Саха)",
            unicode"Саха",
            unicode"Самый северный тюркский народ мира. "
            unicode"Хозяева алмазной республики и вечной мерзлоты. "
            unicode"Создатели уникальной культуры в условиях экстремального холода. "
            unicode"Наш эпос Олонхо — шедевр мирового наследия.",
            unicode"Эҕэрдэ! (Добро пожаловать!)",
            LanguageFamily.TURKIC,
            500_000
        );

        _createNation(
            unicode"Татары",
            unicode"Татарлар",
            unicode"Великий народ Поволжья, наследники Золотой Орды и Казанского ханства. "
            unicode"Создатели первого мусульманского государства в Восточной Европе. "
            unicode"Народ учёных, поэтов и купцов. Казань — жемчужина Востока.",
            unicode"Исәнмесез! (Здравствуйте!)",
            LanguageFamily.TURKIC,
            7_000_000
        );

        _createNation(
            unicode"Башкиры",
            unicode"Башҡорттар",
            unicode"Древний народ Южного Урала, хранители горных богатств. "
            unicode"Славные воины и искусные кузнецы. "
            unicode"Наш мёд и кумыс известны на весь мир. "
            unicode"Земля курганов и древних святилищ.",
            unicode"Һаумыһығыҙ! (Здравствуйте!)",
            LanguageFamily.TURKIC,
            2_000_000
        );

        _createNation(
            unicode"Тувинцы",
            unicode"Тывалар",
            unicode"Народ в сердце Азии, у истоков Енисея. "
            unicode"Мастера горлового пения хоомей — голоса степи и гор. "
            unicode"Хранители скифских курганов и древних петроглифов. "
            unicode"Последние настоящие кочевники.",
            unicode"Экии! (Привет!)",
            LanguageFamily.TURKIC,
            300_000
        );

        _createNation(
            unicode"Алтайцы",
            unicode"Алтай-кижи",
            unicode"Народ священных гор Алтая — пупа Земли. "
            unicode"Хранители тенгрианства и шаманских традиций. "
            unicode"Наша земля — перекрёсток цивилизаций Востока и Запада. "
            unicode"Здесь родился великий Ак-Бурхан.",
            unicode"Jакшы ба! (Как дела!)",
            LanguageFamily.TURKIC,
            80_000
        );

        _createNation(
            unicode"Хакасы",
            unicode"Тадарлар",
            unicode"Потомки древних енисейских кыргызов. "
            unicode"Народ богатырей, воспетых в героическом эпосе. "
            unicode"Хранители степных курганов и каменных изваяний. "
            unicode"Наша земля — Минусинская котловина, житница Сибири.",
            unicode"Изеннер! (Здравствуйте!)",
            LanguageFamily.TURKIC,
            75_000
        );

        _createNation(
            unicode"Чуваши",
            unicode"Чӑвашсем",
            unicode"Единственные потомки волжских булгар. "
            unicode"Народ с уникальным языком — мостом между тюрками и монголами. "
            unicode"Мастера вышивки и деревянного зодчества. "
            unicode"Хранители древней письменности руноподобных знаков.",
            unicode"Салам! (Привет!)",
            LanguageFamily.TURKIC,
            1_500_000
        );

        _createNation(
            unicode"Карачаевцы",
            unicode"Къарачайлыла",
            unicode"Горцы Северного Кавказа, потомки алан. "
            unicode"Хозяева Эльбруса — высочайшей вершины Европы. "
            unicode"Народ коневодов и горных пастухов.",
            unicode"Салам алейкум!",
            LanguageFamily.TURKIC,
            250_000
        );

        _createNation(
            unicode"Балкарцы",
            unicode"Таулула",
            unicode"Горный народ Кабардино-Балкарии. "
            unicode"Братья карачаевцев, хранители горных ущелий. "
            unicode"Искусные строители боевых башен.",
            unicode"Салам алейкум!",
            LanguageFamily.TURKIC,
            120_000
        );

        _createNation(
            unicode"Кумыки",
            unicode"Къумукълар",
            unicode"Древний тюркский народ Дагестана. "
            unicode"Наследники Хазарского каганата. "
            unicode"Народ торговцев и ремесленников прикаспийских степей.",
            unicode"Салам алейкум!",
            LanguageFamily.TURKIC,
            500_000
        );

        _createNation(
            unicode"Ногайцы",
            unicode"Ногъайлар",
            unicode"Потомки Ногайской орды, степной народ. "
            unicode"Хранители традиций кочевой культуры на Кавказе. "
            unicode"Мастера коневодства и степного быта.",
            unicode"Салам!",
            LanguageFamily.TURKIC,
            110_000
        );

        // ═══════════════════════════════════════════════════════════════
        // ТУНГУСО-МАНЬЧЖУРСКИЕ НАРОДЫ (TUNGUSIC)
        // ═══════════════════════════════════════════════════════════════

        _createNation(
            unicode"Эвенки",
            unicode"Эвэнкил",
            unicode"Великие охотники и оленеводы тайги. "
            unicode"Самый многочисленный народ Сибири по территории расселения. "
            unicode"От Енисея до Тихого океана — наш дом. "
            unicode"Хранители духа тайги и северного сияния.",
            unicode"Дорово! (Здравствуй!)",
            LanguageFamily.TUNGUSIC,
            80_000
        );

        _createNation(
            unicode"Эвены",
            unicode"Эвэсэл",
            unicode"Оленеводы северо-востока Сибири. "
            unicode"Братья эвенков, хозяева Колымы и Охотского побережья. "
            unicode"Народ, живущий в гармонии с суровой природой.",
            unicode"Дорова!",
            LanguageFamily.TUNGUSIC,
            22_000
        );

        _createNation(
            unicode"Нанайцы",
            unicode"Нанай",
            unicode"Рыбаки великого Амура. "
            unicode"Мастера резьбы по кости и искусства орнамента. "
            unicode"Наш Амур-батюшка — кормилец и защитник.",
            unicode"Бачигоапу! (Здравствуйте!)",
            LanguageFamily.TUNGUSIC,
            17_000
        );

        _createNation(
            unicode"Удэгейцы",
            unicode"Удээ",
            unicode"Охотники Уссурийской тайги. "
            unicode"Хозяева земли тигра и женьшеня. "
            unicode"Прототипы героев Арсеньева и Куросавы.",
            unicode"Багдифи!",
            LanguageFamily.TUNGUSIC,
            2_000
        );

        // ═══════════════════════════════════════════════════════════════
        // ПАЛЕОАЗИАТСКИЕ НАРОДЫ (PALEOSIBERIAN)
        // ═══════════════════════════════════════════════════════════════

        _createNation(
            unicode"Чукчи",
            unicode"Луораветланы",
            unicode"'Настоящие люди' — так называют себя чукчи. "
            unicode"Хозяева самого сурового края земли. "
            unicode"Оленеводы и морские охотники, победившие вечную мерзлоту. "
            unicode"Народ, который не покорился никому.",
            unicode"Етти! (Привет!)",
            LanguageFamily.PALEOSIBERIAN,
            16_000
        );

        _createNation(
            unicode"Коряки",
            unicode"Нымыланы",
            unicode"Оленеводы и рыбаки Камчатки. "
            unicode"Хранители огненной земли вулканов. "
            unicode"Мастера резьбы по кости и моржовому клыку.",
            unicode"Мэй!",
            LanguageFamily.PALEOSIBERIAN,
            9_000
        );

        _createNation(
            unicode"Ительмены",
            unicode"Итэнмэн",
            unicode"Древнейший народ Камчатки. "
            unicode"Рыбаки и охотники огненного полуострова. "
            unicode"Хранители уникальной культуры Тихоокеанского кольца.",
            unicode"Ась!",
            LanguageFamily.PALEOSIBERIAN,
            3_000
        );

        _createNation(
            unicode"Нивхи",
            unicode"Нивхгу",
            unicode"Рыбаки Сахалина и устья Амура. "
            unicode"Один из древнейших народов Дальнего Востока. "
            unicode"Хранители медвежьего праздника и духов моря.",
            unicode"Ань дёрф!",
            LanguageFamily.PALEOSIBERIAN,
            5_000
        );

        _createNation(
            unicode"Эскимосы (Юпик)",
            unicode"Юпигыт",
            unicode"Морские охотники Берингова пролива. "
            unicode"Народ, живущий между двух континентов. "
            unicode"Мастера охоты на китов и моржей.",
            unicode"Ваа!",
            LanguageFamily.PALEOSIBERIAN,
            2_000
        );

        _createNation(
            unicode"Кеты",
            unicode"Кетъ",
            unicode"Последний народ енисейской языковой семьи. "
            unicode"Таинственные рыбаки среднего Енисея. "
            unicode"Хранители уникального языка, связанного с языками индейцев Америки.",
            unicode"Ба'сь!",
            LanguageFamily.PALEOSIBERIAN,
            1_500
        );

        // ═══════════════════════════════════════════════════════════════
        // УГОРСКИЕ И САМОДИЙСКИЕ НАРОДЫ
        // ═══════════════════════════════════════════════════════════════

        _createNation(
            unicode"Ханты",
            unicode"Хантэ",
            unicode"Рыбаки и охотники Оби. "
            unicode"Хранители священных мест и духов тайги. "
            unicode"Народ, живущий над океаном нефти и газа.",
            unicode"Вула!",
            LanguageFamily.UGRIC,
            31_000
        );

        _createNation(
            unicode"Манси",
            unicode"Маньси",
            unicode"Лесной народ Северного Урала. "
            unicode"Братья хантов, хранители перевала Дятлова. "
            unicode"Искусные охотники и рыбаки.",
            unicode"Пася олэн!",
            LanguageFamily.UGRIC,
            12_000
        );

        _createNation(
            unicode"Ненцы",
            unicode"Ненэй ненэць",
            unicode"Самый большой оленеводческий народ мира. "
            unicode"Хозяева тундры от Кольского до Таймыра. "
            unicode"Хранители традиций кочевой жизни за Полярным кругом.",
            unicode"Ань дорова!",
            LanguageFamily.SAMOYEDIC,
            45_000
        );

        _createNation(
            unicode"Селькупы",
            unicode"Сёльӄуп",
            unicode"Таёжные рыбаки и охотники Западной Сибири. "
            unicode"Древний самодийский народ Томской земли. "
            unicode"Хранители шаманских традиций и духов реки.",
            unicode"Чумэльчук!",
            LanguageFamily.SAMOYEDIC,
            4_000
        );

        _createNation(
            unicode"Нганасаны",
            unicode"Ня",
            unicode"Самый северный народ Евразии. "
            unicode"Охотники на дикого оленя Таймыра. "
            unicode"Хранители древнейших шаманских традиций Сибири.",
            unicode"Дяхарду!",
            LanguageFamily.SAMOYEDIC,
            900
        );

        // ═══════════════════════════════════════════════════════════════
        // ФИННО-УГОРСКИЕ НАРОДЫ ЕВРОПЕЙСКОЙ ЧАСТИ
        // ═══════════════════════════════════════════════════════════════

        _createNation(
            unicode"Коми",
            unicode"Коми войтыр",
            unicode"Лесной народ Северного Приуралья. "
            unicode"Охотники и оленеводы европейской тайги. "
            unicode"Народ, создавший древнюю письменность.",
            unicode"Видза олан!",
            LanguageFamily.UGRIC,
            230_000
        );

        _createNation(
            unicode"Удмурты",
            unicode"Удморт калык",
            unicode"Древний народ Прикамья. "
            unicode"Хранители священных рощ и культа Великой Матери. "
            unicode"Народ мастеров-оружейников.",
            unicode"Ӟеч буресь!",
            LanguageFamily.UGRIC,
            600_000
        );

        _createNation(
            unicode"Марийцы",
            unicode"Марий калык",
            unicode"Народ священных рощ Поволжья. "
            unicode"Единственный народ Европы, сохранивший языческую веру. "
            unicode"Хранители культа Великого Белого Бога.",
            unicode"Салам лийже!",
            LanguageFamily.UGRIC,
            550_000
        );

        _createNation(
            unicode"Мордва",
            unicode"Мокшэрзят",
            unicode"Два братских народа — мокша и эрзя. "
            unicode"Древние жители Поволжья, соседи славян. "
            unicode"Хранители эпоса о богатырях и героях.",
            unicode"Шумбрат!",
            LanguageFamily.UGRIC,
            750_000
        );

        _createNation(
            unicode"Карелы",
            unicode"Karjalazet",
            unicode"Лесной народ между двух озёр. "
            unicode"Создатели Калевалы — великого эпоса Севера. "
            unicode"Мастера рунического пения и деревянного зодчества.",
            unicode"Terveh!",
            LanguageFamily.UGRIC,
            90_000
        );

        // ═══════════════════════════════════════════════════════════════
        // КАВКАЗСКИЕ НАРОДЫ
        // ═══════════════════════════════════════════════════════════════

        _createNation(
            unicode"Чеченцы",
            unicode"Нохчий",
            unicode"Гордый народ Кавказа, хранители чести и свободы. "
            unicode"Воины, не покорившиеся никому. "
            unicode"Народ боевых башен и древних адатов.",
            unicode"Маршалла ду хьоьга!",
            LanguageFamily.CAUCASIAN,
            2_000_000
        );

        _createNation(
            unicode"Ингуши",
            unicode"ГIалгIай",
            unicode"Братья чеченцев, строители башен. "
            unicode"Народ древних святилищ и горных аулов. "
            unicode"Хранители вайнахской культуры.",
            unicode"Ассалам алейкум!",
            LanguageFamily.CAUCASIAN,
            500_000
        );

        _createNation(
            unicode"Аварцы",
            unicode"Маарулал",
            unicode"Самый многочисленный народ Дагестана. "
            unicode"Горцы-воины, наследники Имама Шамиля. "
            unicode"Народ поэтов и мастеров серебряного дела.",
            unicode"Ворчами!",
            LanguageFamily.CAUCASIAN,
            1_000_000
        );

        _createNation(
            unicode"Даргинцы",
            unicode"Дарган",
            unicode"Древний народ горного Дагестана. "
            unicode"Мастера-оружейники и златокузнецы. "
            unicode"Хранители уникальных горных аулов.",
            unicode"Салам!",
            LanguageFamily.CAUCASIAN,
            600_000
        );

        _createNation(
            unicode"Лезгины",
            unicode"Лезгияр",
            unicode"Народ Южного Дагестана и Северного Азербайджана. "
            unicode"Создатели знаменитой лезгинки. "
            unicode"Мастера ковроткачества.",
            unicode"Салам алейкум!",
            LanguageFamily.CAUCASIAN,
            800_000
        );

        _createNation(
            unicode"Лакцы",
            unicode"Лак",
            unicode"Горцы центрального Дагестана. "
            unicode"Народ ювелиров и мастеров. "
            unicode"Хранители древнего аула Кумух.",
            unicode"Аьссаламу аьлайкум!",
            LanguageFamily.CAUCASIAN,
            180_000
        );

        _createNation(
            unicode"Кабардинцы",
            unicode"Адыгэ",
            unicode"Князья Кавказа, создатели адыгского этикета. "
            unicode"Народ наездников и воинов. "
            unicode"Хранители рыцарской культуры Кавказа.",
            unicode"Уимафэ фIыуэ!",
            LanguageFamily.CAUCASIAN,
            600_000
        );

        _createNation(
            unicode"Черкесы",
            unicode"Адыгэ",
            unicode"Западные адыги, народ воинов и всадников. "
            unicode"Хранители черкесской культуры. "
            unicode"Народ, рассеянный по всему миру.",
            unicode"Уипщы!",
            LanguageFamily.CAUCASIAN,
            80_000
        );

        _createNation(
            unicode"Адыгейцы",
            unicode"Адыгэ",
            unicode"Западные адыги Причерноморья. "
            unicode"Хранители древних нартских сказаний. "
            unicode"Народ гостеприимства и чести.",
            unicode"УиIоф дэгъу!",
            LanguageFamily.CAUCASIAN,
            130_000
        );

        _createNation(
            unicode"Осетины",
            unicode"Ирон адæм",
            unicode"Потомки легендарных алан и скифов. "
            unicode"Единственный иранский народ Кавказа. "
            unicode"Хранители нартского эпоса — древнейшего на Кавказе.",
            unicode"Салам!",
            LanguageFamily.CAUCASIAN,
            700_000
        );

        // ═══════════════════════════════════════════════════════════════
        // СЛАВЯНСКИЕ НАРОДЫ
        // ═══════════════════════════════════════════════════════════════

        _createNation(
            unicode"Русские",
            unicode"Русские",
            unicode"Великий народ, объединивший земли от Балтики до Тихого океана. "
            unicode"Создатели уникальной культуры на стыке Европы и Азии. "
            unicode"Народ Пушкина, Толстого и Достоевского. "
            unicode"В Сибирской Конфедерации — равноправные граждане новой страны.",
            unicode"Здравствуйте!",
            LanguageFamily.SLAVIC,
            110_000_000
        );
    }

    /*//////////////////////////////////////////////////////////////
                        ВНУТРЕННИЕ ФУНКЦИИ
    //////////////////////////////////////////////////////////////*/

    function _createNation(
        string memory name,
        string memory nameNative,
        string memory description,
        string memory greeting,
        LanguageFamily family,
        uint256 population
    ) internal {
        _createNationFull(name, nameNative, description, greeting, family, Continent.SIBERIA, population);
    }

    function _createNationFull(
        string memory name,
        string memory nameNative,
        string memory description,
        string memory greeting,
        LanguageFamily family,
        Continent continent,
        uint256 population
    ) internal {
        bytes32 id = keccak256(abi.encodePacked("NATION:", name));

        // Пустой массив для homelands (будет заполнен позже)
        bytes32[] memory emptyHomelands = new bytes32[](0);

        nations[id] = Nation({
            id: id,
            name: name,
            nameNative: nameNative,
            description: description,
            greeting: greeting,
            family: family,
            continent: continent,
            homelands: emptyHomelands,
            population: population,
            active: true,
            exists: true,
            createdAt: uint64(block.timestamp),
            updatedAt: uint64(block.timestamp)
        });

        nationIds.push(id);
        nationsByContinent[continent].push(id);
        nationsByFamily[family].push(id);

        emit NationCreated(id, name, nameNative, family, continent);
    }

    /*//////////////////////////////////////////////////////////////
                    УПРАВЛЕНИЕ НАРОДАМИ (ХУРАЛ)
    //////////////////////////////////////////////////////////////*/

    /// @notice Добавить новый народ (только Хурал)
    /// @dev Используется для расширения на новые континенты
    function addNation(
        string calldata name,
        string calldata nameNative,
        string calldata description,
        string calldata greeting,
        LanguageFamily family,
        Continent continent,
        uint256 population
    ) external onlyRole(KHURAL_ROLE) returns (bytes32 id) {
        if (bytes(name).length == 0) revert EmptyName();

        id = keccak256(abi.encodePacked("NATION:", name));
        if (nations[id].exists) revert NationAlreadyExists(id);

        bytes32[] memory emptyHomelands = new bytes32[](0);

        nations[id] = Nation({
            id: id,
            name: name,
            nameNative: nameNative,
            description: description,
            greeting: greeting,
            family: family,
            continent: continent,
            homelands: emptyHomelands,
            population: population,
            active: true,
            exists: true,
            createdAt: uint64(block.timestamp),
            updatedAt: uint64(block.timestamp)
        });

        nationIds.push(id);
        nationsByContinent[continent].push(id);
        nationsByFamily[family].push(id);

        emit NationCreated(id, name, nameNative, family, continent);
    }

    /// @notice Обновить информацию о народе (Куратор)
    function updateNationInfo(
        bytes32 nationId,
        string calldata description,
        string calldata greeting,
        uint256 population
    ) external onlyRole(CURATOR_ROLE) {
        if (!nations[nationId].exists) revert NationNotFound(nationId);

        Nation storage nation = nations[nationId];
        nation.description = description;
        nation.greeting = greeting;
        nation.population = population;
        nation.updatedAt = uint64(block.timestamp);

        emit NationUpdated(nationId, nation.name, msg.sender);
    }

    /// @notice Активировать/деактивировать народ
    function setNationActive(bytes32 nationId, bool active) external onlyRole(KHURAL_ROLE) {
        if (!nations[nationId].exists) revert NationNotFound(nationId);

        nations[nationId].active = active;
        nations[nationId].updatedAt = uint64(block.timestamp);

        emit NationStatusChanged(nationId, active);
    }

    /// @notice Добавить исконную территорию народу
    function addHomeland(bytes32 nationId, bytes32 territoryId) external onlyRole(CURATOR_ROLE) {
        if (!nations[nationId].exists) revert NationNotFound(nationId);

        nations[nationId].homelands.push(territoryId);
        nations[nationId].updatedAt = uint64(block.timestamp);

        emit HomelandAdded(nationId, territoryId);
    }

    /// @notice Массовое добавление народов (для миграции данных)
    function addNationsBatch(
        string[] calldata names,
        string[] calldata namesNative,
        string[] calldata descriptions,
        string[] calldata greetings,
        LanguageFamily[] calldata families,
        Continent[] calldata continents,
        uint256[] calldata populations
    ) external onlyRole(KHURAL_ROLE) {
        require(
            names.length == namesNative.length &&
            names.length == descriptions.length &&
            names.length == greetings.length &&
            names.length == families.length &&
            names.length == continents.length &&
            names.length == populations.length,
            "Arrays length mismatch"
        );

        for (uint256 i = 0; i < names.length; i++) {
            bytes32 id = keccak256(abi.encodePacked("NATION:", names[i]));
            if (nations[id].exists) continue; // Пропускаем существующие

            bytes32[] memory emptyHomelands = new bytes32[](0);

            nations[id] = Nation({
                id: id,
                name: names[i],
                nameNative: namesNative[i],
                description: descriptions[i],
                greeting: greetings[i],
                family: families[i],
                continent: continents[i],
                homelands: emptyHomelands,
                population: populations[i],
                active: true,
                exists: true,
                createdAt: uint64(block.timestamp),
                updatedAt: uint64(block.timestamp)
            });

            nationIds.push(id);
            nationsByContinent[continents[i]].push(id);
            nationsByFamily[families[i]].push(id);

            emit NationCreated(id, names[i], namesNative[i], families[i], continents[i]);
        }
    }

    /*//////////////////////////////////////////////////////////////
                        ФУНКЦИИ ЧТЕНИЯ
    //////////////////////////////////////////////////////////////*/

    /// @notice Получить информацию о народе
    function getNation(bytes32 nationId) external view returns (Nation memory) {
        if (!nations[nationId].exists) revert NationNotFound(nationId);
        return nations[nationId];
    }

    /// @notice Получить народ по имени
    function getNationByName(string calldata name) external view returns (Nation memory) {
        bytes32 id = keccak256(abi.encodePacked("NATION:", name));
        if (!nations[id].exists) revert NationNotFound(id);
        return nations[id];
    }

    /// @notice Получить ID народа по имени
    function getNationId(string calldata name) external pure returns (bytes32) {
        return keccak256(abi.encodePacked("NATION:", name));
    }

    /// @notice Получить количество народов
    function getNationCount() external view returns (uint256) {
        return nationIds.length;
    }

    /// @notice Получить количество активных народов
    function getActiveNationCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < nationIds.length; i++) {
            if (nations[nationIds[i]].active) {
                count++;
            }
        }
        return count;
    }

    /// @notice Получить все ID народов
    function getAllNationIds() external view returns (bytes32[] memory) {
        return nationIds;
    }

    /// @notice Получить народы по континенту
    function getNationsByContinent(Continent continent) external view returns (bytes32[] memory) {
        return nationsByContinent[continent];
    }

    /// @notice Получить все народы определённой языковой семьи (из индекса)
    function getNationsByLanguageFamily(LanguageFamily family) external view returns (bytes32[] memory) {
        return nationsByFamily[family];
    }

    /// @notice Проверить, активен ли народ
    function isNationActive(bytes32 nationId) external view returns (bool) {
        return nations[nationId].exists && nations[nationId].active;
    }

    /// @notice Получить название языковой семьи
    function getFamilyName(LanguageFamily family) external pure returns (string memory) {
        if (family == LanguageFamily.MONGOLIC) return unicode"Монгольские народы";
        if (family == LanguageFamily.TURKIC) return unicode"Тюркские народы";
        if (family == LanguageFamily.TUNGUSIC) return unicode"Тунгусо-маньчжурские народы";
        if (family == LanguageFamily.UGRIC) return unicode"Финно-угорские народы";
        if (family == LanguageFamily.PALEOSIBERIAN) return unicode"Палеоазиатские народы";
        if (family == LanguageFamily.SLAVIC) return unicode"Славянские народы";
        if (family == LanguageFamily.CAUCASIAN) return unicode"Кавказские народы";
        if (family == LanguageFamily.SAMOYEDIC) return unicode"Самодийские народы";
        if (family == LanguageFamily.AMERINDIAN) return unicode"Индейские народы";
        if (family == LanguageFamily.AFRICAN) return unicode"Африканские народы";
        if (family == LanguageFamily.AUSTRONESIAN) return unicode"Австронезийские народы";
        if (family == LanguageFamily.DRAVIDIAN) return unicode"Дравидийские народы";
        if (family == LanguageFamily.SINOTIBETAN) return unicode"Сино-тибетские народы";
        if (family == LanguageFamily.SEMITIC) return unicode"Семитские народы";
        return unicode"Другие народы";
    }

    /// @notice Получить название континента
    function getContinentName(Continent continent) external pure returns (string memory) {
        if (continent == Continent.SIBERIA) return unicode"Сибирь";
        if (continent == Continent.CAUCASUS) return unicode"Кавказ";
        if (continent == Continent.VOLGA_URAL) return unicode"Поволжье и Урал";
        if (continent == Continent.EUROPE) return unicode"Европа";
        if (continent == Continent.CENTRAL_ASIA) return unicode"Центральная Азия";
        if (continent == Continent.EAST_ASIA) return unicode"Восточная Азия";
        if (continent == Continent.SOUTH_ASIA) return unicode"Южная Азия";
        if (continent == Continent.MIDDLE_EAST) return unicode"Ближний Восток";
        if (continent == Continent.AFRICA) return unicode"Африка";
        if (continent == Continent.NORTH_AMERICA) return unicode"Северная Америка";
        if (continent == Continent.SOUTH_AMERICA) return unicode"Южная Америка";
        if (continent == Continent.OCEANIA) return unicode"Океания";
        return unicode"Неизвестный регион";
    }

    /// @notice Получить исконные территории народа
    function getNationHomelands(bytes32 nationId) external view returns (bytes32[] memory) {
        if (!nations[nationId].exists) revert NationNotFound(nationId);
        return nations[nationId].homelands;
    }

    /// @notice Приветствие для onboarding
    function getWelcomeMessage() external pure returns (string memory) {
        return unicode"═══════════════════════════════════════════════════════════════\n"
               unicode"     ДОБРО ПОЖАЛОВАТЬ В СИБИРСКУЮ КОНФЕДЕРАЦИЮ\n"
               unicode"     Союз свободных народов от Урала до Тихого океана\n"
               unicode"═══════════════════════════════════════════════════════════════\n\n"
               unicode"Сибирь — колыбель кочевой цивилизации.\n"
               unicode"Мы храним память предков и строим будущее для потомков.\n\n"
               unicode"Выберите свой народ и землю рождения,\n"
               unicode"чтобы получить Документ Гражданина Конфедерации.\n\n"
               unicode"Каждый народ — хозяин своей земли.\n"
               unicode"Каждый гражданин — под защитой Конфедерации.";
    }

    /// @notice Статистика реестра
    function getStats() external view returns (
        uint256 totalNations,
        uint256 activeNations,
        uint256 totalLanguageFamilies,
        uint256 totalContinents
    ) {
        totalNations = nationIds.length;

        for (uint256 i = 0; i < nationIds.length; i++) {
            if (nations[nationIds[i]].active) {
                activeNations++;
            }
        }

        // Подсчёт уникальных языковых семей и континентов
        bool[15] memory familiesUsed;
        bool[12] memory continentsUsed;

        for (uint256 i = 0; i < nationIds.length; i++) {
            familiesUsed[uint256(nations[nationIds[i]].family)] = true;
            continentsUsed[uint256(nations[nationIds[i]].continent)] = true;
        }

        for (uint256 i = 0; i < 15; i++) {
            if (familiesUsed[i]) totalLanguageFamilies++;
        }
        for (uint256 i = 0; i < 12; i++) {
            if (continentsUsed[i]) totalContinents++;
        }
    }
}
