// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title NationRegistry
 * @notice Реестр Народов Сибирской Конфедерации
 *
 * "Сибирь — колыбель кочевой цивилизации"
 *
 * Данный контракт содержит неизменяемый список коренных народов,
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
 */
contract NationRegistry {
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
        OTHER           // Другие
    }

    /// @notice Информация о народе
    struct Nation {
        bytes32 id;
        string name;                // Название на русском
        string nameNative;          // Название на родном языке
        string description;         // Краткое описание (история, культура)
        string greeting;            // Приветствие на родном языке
        LanguageFamily family;
        bytes32[] homelands;        // Исконные территории (republicIds)
        uint256 population;         // Примерная численность
        bool exists;
    }

    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    mapping(bytes32 => Nation) public nations;
    bytes32[] public nationIds;

    /// @notice Дата создания реестра
    uint256 public immutable createdAt;

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor() {
        createdAt = block.timestamp;
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
            homelands: emptyHomelands,
            population: population,
            exists: true
        });

        nationIds.push(id);
    }

    /*//////////////////////////////////////////////////////////////
                        ФУНКЦИИ ЧТЕНИЯ
    //////////////////////////////////////////////////////////////*/

    /// @notice Получить информацию о народе
    function getNation(bytes32 nationId) external view returns (Nation memory) {
        require(nations[nationId].exists, "Nation not found");
        return nations[nationId];
    }

    /// @notice Получить народ по имени
    function getNationByName(string calldata name) external view returns (Nation memory) {
        bytes32 id = keccak256(abi.encodePacked("NATION:", name));
        require(nations[id].exists, "Nation not found");
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

    /// @notice Получить все ID народов
    function getAllNationIds() external view returns (bytes32[] memory) {
        return nationIds;
    }

    /// @notice Получить все народы определённой языковой семьи
    function getNationsByFamily(LanguageFamily family) external view returns (bytes32[] memory) {
        // Считаем количество
        uint256 count = 0;
        for (uint256 i = 0; i < nationIds.length; i++) {
            if (nations[nationIds[i]].family == family) {
                count++;
            }
        }

        // Заполняем массив
        bytes32[] memory result = new bytes32[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < nationIds.length; i++) {
            if (nations[nationIds[i]].family == family) {
                result[index] = nationIds[i];
                index++;
            }
        }

        return result;
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
        return unicode"Другие народы";
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
}
