// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title CoreLaw
 * @notice ОСНОВНОЙ ЗАКОН И ПРАВО СИБИРСКОЙ КОНФЕДЕРАЦИИ
 * @dev Core Freeze — окончательная редакция
 *
 * Настоящий контракт содержит фундаментальные принципы, которые НЕ МОГУТ быть изменены.
 * Они записаны при создании контракта и остаются неизменными навечно.
 *
 * Статус документа:
 * Core Freeze — ACTIVE
 * Изменения — ЗАПРЕЩЕНЫ
 * Иерархия — выше конституций государств народов
 */
contract CoreLaw {
    /*//////////////////////////////////////////////////////////////
                              ПРЕАМБУЛА
    //////////////////////////////////////////////////////////////*/

    string public constant PREAMBLE =
        unicode"Мы, коренные народы Сибири, Урала, Поволжья и Северного Кавказа, "
        unicode"осознавая историческую ответственность за землю, право и будущее поколений, "
        unicode"утверждаем настоящий Основной Закон и Право Сибирской Конфедерации "
        unicode"как высшее и неизменяемое основание правопорядка, "
        unicode"на котором строятся конституции, институты и союзы суверенных государств народов. "
        unicode"Настоящий Закон ограничивает власть, охраняет право и обеспечивает свободу.";

    /*//////////////////////////////////////////////////////////////
                РАЗДЕЛ I: ИСТОЧНИК И ПРЕДЕЛЫ ВЛАСТИ
    //////////////////////////////////////////////////////////////*/

    string public constant ARTICLE_1_SOURCE_OF_POWER =
        unicode"Статья 1. Источник власти. "
        unicode"Коренной народ является единственным источником власти. "
        unicode"Власть осуществляется через систему Хурал: "
        unicode"Арбан → Зун → Мянган → Тумен → Хурал государства → Ехэ Хурал.";

    string public constant ARTICLE_2_PERSONAL_SOVEREIGNTY =
        unicode"Статья 2. Суверенитет личности. "
        unicode"Человек не является собственностью государства, института или коллектива.";

    string public constant ARTICLE_3_IDENTITY =
        unicode"Статья 3. Необратимость идентичности. "
        unicode"Гражданская идентичность неотчуждаема, непередаваема и не может быть произвольно отозвана.";

    string public constant ARTICLE_4_ACCOUNTABILITY =
        unicode"Статья 4. Ответственность власти. "
        unicode"Любая власть персонально ответственна и подлежит отзыву.";

    string public constant ARTICLE_5_TERM_LIMITS =
        unicode"Статья 5. Временность власти. "
        unicode"Ни одна форма власти не является пожизненной.";

    /*//////////////////////////////////////////////////////////////
                РАЗДЕЛ II: ЗАКОН И ПРАВОПОРЯДОК
    //////////////////////////////////////////////////////////////*/

    string public constant ARTICLE_6_RULE_OF_LAW =
        unicode"Статья 6. Верховенство закона. "
        unicode"Закон стоит выше любой власти, должности и происхождения.";

    string public constant ARTICLE_7_INEVITABILITY =
        unicode"Статья 7. Неотвратимость ответственности. "
        unicode"Нарушение закона неизбежно влечёт ответственность.";

    /*//////////////////////////////////////////////////////////////
                РАЗДЕЛ III: ЗЕМЛЯ И ОБЩЕСТВЕННЫЙ ПОРЯДОК
    //////////////////////////////////////////////////////////////*/

    string public constant ARTICLE_8_LAND_RIGHTS =
        unicode"Статья 8. Право на землю. "
        unicode"Земля является священным и неотчуждаемым наследием коренных народов. "
        unicode"Право на землю принадлежит исключительно коренному народу.";

    string public constant ARTICLE_9_RESIDENCE =
        unicode"Статья 9. Проживание на земле. "
        unicode"Каждый человек имеет право жить на земле при соблюдении законов. "
        unicode"Проживание не создаёт права народного суверенитета.";

    string public constant ARTICLE_10_SOCIAL_STRUCTURE =
        unicode"Статья 10. Семья и структура общества. "
        unicode"Общество организовано по системе: "
        unicode"Арбан → Зун → Мянган → Тумен (10–100–1000–10000).";

    string public constant ARTICLE_11_PRIVATE_PROPERTY =
        unicode"Статья 11. Частная собственность. "
        unicode"Частная собственность охраняется законом. "
        unicode"Лишение возможно только по решению суда.";

    /*//////////////////////////////////////////////////////////////
                РАЗДЕЛ IV: СВОБОДЫ
    //////////////////////////////////////////////////////////////*/

    string public constant ARTICLE_12_FREE_SPEECH =
        unicode"Статья 12. Свобода слова. "
        unicode"Свобода слова гарантирована при личной ответственности за ложь и клевету.";

    /*//////////////////////////////////////////////////////////////
                РАЗДЕЛ V: ГОСУДАРСТВА НАРОДОВ И КОНФЕДЕРАЦИЯ
    //////////////////////////////////////////////////////////////*/

    string public constant ARTICLE_13_PEOPLES_SOVEREIGNTY =
        unicode"Статья 13. Суверенитет народов. "
        unicode"Сибирская Конфедерация — союз суверенных государств коренных народов. "
        unicode"Каждый народ учреждает собственное государство и Конституцию.";

    string public constant ARTICLE_14_INTERNAL_POLICY =
        unicode"Статья 14. Внутренняя политика. "
        unicode"Внутренняя политика каждого государства народа осуществляется самостоятельно "
        unicode"и не подлежит вмешательству Конфедерации.";

    string public constant ARTICLE_15_DIPLOMATIC_RIGHTS =
        unicode"Статья 15. Дипломатическое право. "
        unicode"Каждое государство народа вправе учреждать посольства "
        unicode"и вести самостоятельную дипломатическую деятельность.";

    string public constant ARTICLE_16_JOINT_FOREIGN_POLICY =
        unicode"Статья 16. Совместная внешняя политика. "
        unicode"Вопросы общих интересов решаются совместно через Ехэ Хурал.";

    string public constant ARTICLE_17_YEHE_KHURAL =
        unicode"Статья 17. Ехэ Хурал. "
        unicode"Ехэ Хурал — высший совместный орган, состоящий из верховных лидеров народов. "
        unicode"Решения принимаются путём голосования. Право вето отсутствует.";

    /*//////////////////////////////////////////////////////////////
                РАЗДЕЛ VI: ПРАВО ВЫХОДА
    //////////////////////////////////////////////////////////////*/

    string public constant ARTICLE_18_VOLUNTARY_UNION =
        unicode"Статья 18. Добровольность союза. "
        unicode"Участие на всех уровнях Хурал-структуры основано на добровольности.";

    string public constant ARTICLE_19_COMMUNITY_EXIT =
        unicode"Статья 19. Право выхода общин. "
        unicode"Арбан, Зун, Мянган и Тумен обладают правом выхода из вышестоящего уровня "
        unicode"без утраты базовых прав.";

    string public constant ARTICLE_20_INDIGENOUS_EXIT_RIGHT =
        unicode"Статья 20. Исключительное право коренного народа. "
        unicode"Решение о выходе государства из союза принимает "
        unicode"исключительно коренной народ, как носитель права на землю.";

    string public constant ARTICLE_21_EXIT_PROCEDURE =
        unicode"Статья 21. Процедура выхода государства народа. "
        unicode"Решение принимается высшим органом коренного народа и уведомляет Ехэ Хурал. "
        unicode"Ехэ Хурал не обладает правом блокирования.";

    string public constant ARTICLE_22_EXIT_INVIOLABILITY =
        unicode"Статья 22. Неприкосновенность выхода. "
        unicode"Выход не является враждебным актом и не влечёт санкций, насилия или лишения прав.";

    /*//////////////////////////////////////////////////////////////
                РАЗДЕЛ VII: ТЕРРИТОРИЯ И СТОЛИЦА
    //////////////////////////////////////////////////////////////*/

    string public constant ARTICLE_23_TERRITORIAL_SCOPE =
        unicode"Статья 23. Пространственный предел. "
        unicode"Действие Закона распространяется на территории Российской Федерации "
        unicode"в границах до начала войны с Украиной, "
        unicode"за исключением территорий, присоединённых после 2014 года.";

    string public constant ARTICLE_24_MACROREGIONS =
        unicode"Статья 24. Макрорегионы. "
        unicode"Закон действует в регионах: "
        unicode"1) Сибирь (включая Дальний Восток), "
        unicode"2) Урал, "
        unicode"3) Поволжье, "
        unicode"4) Северный Кавказ, "
        unicode"5) Северо-Запад, "
        unicode"6) Центральная Россия, "
        unicode"7) Юг России (без Крыма).";

    string public constant ARTICLE_25_CAPITAL =
        unicode"Статья 25. Столица. "
        unicode"Столицей Сибирской Конфедерации является город Иркутск.";

    /*//////////////////////////////////////////////////////////////
                РАЗДЕЛ VIII: ЭКОНОМИЧЕСКОЕ ОСНОВАНИЕ
    //////////////////////////////////////////////////////////////*/

    string public constant ARTICLE_26_CURRENCY =
        unicode"Статья 26. Валюта. "
        unicode"Единой валютой является Алтан. Эмиссия — исключительно Центральным Банком.";

    string public constant ARTICLE_27_NETWORK_FEE =
        unicode"Статья 27. Сетевая комиссия. "
        unicode"Единая комиссия — 0,03%. Иные сетевые комиссии запрещены.";

    string public constant ARTICLE_28_TAX =
        unicode"Статья 28. Налог. "
        unicode"Единый налог — 10%: 7% — государству народа, 3% — Конфедерации.";

    /*//////////////////////////////////////////////////////////////
                РАЗДЕЛ IX: РАВЕНСТВО ПРАВ И ПРЕДЕЛЫ СУВЕРЕНИТЕТА
    //////////////////////////////////////////////////////////////*/

    string public constant ARTICLE_29_EQUAL_CIVIL_RIGHTS =
        unicode"Статья 29. Равенство гражданских прав. "
        unicode"Некоренные, рождённые и проживающие на территории, обладают равными гражданскими правами.";

    string public constant ARTICLE_30_EXCLUSIVE_INDIGENOUS_RIGHTS =
        unicode"Статья 30. Исключительные права коренного народа. "
        unicode"Исключительно коренному народу принадлежат: "
        unicode"источник власти, право на землю и ресурсы, право на самоопределение и выход.";

    /*//////////////////////////////////////////////////////////////
                РАЗДЕЛ X: НЕБО, ЗЕМЛЯ, РЕСУРСЫ
    //////////////////////////////////////////////////////////////*/

    string public constant ARTICLE_31_PEOPLES_OWNERSHIP =
        unicode"Статья 31. Народная принадлежность. "
        unicode"Небо, земля и природные ресурсы принадлежат коренному народу и не отчуждаются.";

    string public constant ARTICLE_32_NATURE_RESERVES =
        unicode"Статья 32. Национальные заповедники. "
        unicode"Заповедники охраняются законом и не продаются.";

    string public constant ARTICLE_33_LAND_OWNERSHIP =
        unicode"Статья 33. Собственность на землю. "
        unicode"Покупка, продажа и владение землёй — только гражданами государства народа. "
        unicode"Иностранцам — аренда и концессии по закону.";

    string public constant ARTICLE_34_RESOURCE_EXCHANGE =
        unicode"Статья 34. Земельная и ресурсная биржа. "
        unicode"Биржа открыта для всех для торговли правами пользования, лицензиями и концессиями. "
        unicode"Отчуждение народной собственности запрещено.";

    string public constant ARTICLE_35_NATIONAL_CORPORATIONS =
        unicode"Статья 35. Национальные корпорации. "
        unicode"Частное и иностранное владение — не более 49%. "
        unicode"Контроль (не менее 51%) — у государства народа.";

    string public constant ARTICLE_36_PROFIT_DISTRIBUTION =
        unicode"Статья 36. Прибыль и развитие. "
        unicode"Вся чистая прибыль направляется в казну и на развитие общей инфраструктуры "
        unicode"для достойной жизни каждого гражданина.";

    /*//////////////////////////////////////////////////////////////
                РАЗДЕЛ XI: НЕИЗМЕНЯЕМОСТЬ
    //////////////////////////////////////////////////////////////*/

    string public constant ARTICLE_37_CORE_FREEZE =
        unicode"Статья 37. Core Freeze. "
        unicode"Настоящий Закон: "
        unicode"не подлежит изменению или приостановлению; "
        unicode"не допускает обхода через реформы или чрезвычайные меры; "
        unicode"имеет высшую силу над всеми иными актами.";

    /*//////////////////////////////////////////////////////////////
                ЗАКЛЮЧИТЕЛЬНОЕ ПОЛОЖЕНИЕ
    //////////////////////////////////////////////////////////////*/

    string public constant CONCLUSION =
        unicode"Союз свободен, когда в нём можно остаться по воле и выйти по праву. "
        unicode"Этот Закон существует не для удобства власти, "
        unicode"а для её ограничения и защиты земли, народа и будущего.";

    /*//////////////////////////////////////////////////////////////
                            МЕТАДАННЫЕ
    //////////////////////////////////////////////////////////////*/

    string public constant DOCUMENT_NAME = unicode"Основной Закон и Право Сибирской Конфедерации";
    string public constant VERSION = "1.0.0";
    string public constant STATUS = unicode"Core Freeze — ACTIVE";

    uint256 public immutable adoptedAt;
    bytes32 public immutable lawHash;

    uint8 public constant TOTAL_ARTICLES = 37;
    uint8 public constant TOTAL_SECTIONS = 11;

    /*//////////////////////////////////////////////////////////////
                            КОНСТРУКТОР
    //////////////////////////////////////////////////////////////*/

    constructor() {
        adoptedAt = block.timestamp;
        lawHash = _computeHash();
    }

    function _computeHash() internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(
            PREAMBLE,
            ARTICLE_1_SOURCE_OF_POWER,
            ARTICLE_2_PERSONAL_SOVEREIGNTY,
            ARTICLE_3_IDENTITY,
            ARTICLE_4_ACCOUNTABILITY,
            ARTICLE_5_TERM_LIMITS,
            ARTICLE_6_RULE_OF_LAW,
            ARTICLE_7_INEVITABILITY,
            ARTICLE_8_LAND_RIGHTS,
            ARTICLE_9_RESIDENCE,
            ARTICLE_10_SOCIAL_STRUCTURE,
            ARTICLE_11_PRIVATE_PROPERTY,
            ARTICLE_12_FREE_SPEECH,
            ARTICLE_13_PEOPLES_SOVEREIGNTY,
            ARTICLE_14_INTERNAL_POLICY,
            ARTICLE_15_DIPLOMATIC_RIGHTS,
            ARTICLE_16_JOINT_FOREIGN_POLICY,
            ARTICLE_17_YEHE_KHURAL,
            ARTICLE_18_VOLUNTARY_UNION,
            ARTICLE_19_COMMUNITY_EXIT,
            ARTICLE_20_INDIGENOUS_EXIT_RIGHT,
            ARTICLE_21_EXIT_PROCEDURE,
            ARTICLE_22_EXIT_INVIOLABILITY,
            ARTICLE_23_TERRITORIAL_SCOPE,
            ARTICLE_24_MACROREGIONS,
            ARTICLE_25_CAPITAL,
            ARTICLE_26_CURRENCY,
            ARTICLE_27_NETWORK_FEE,
            ARTICLE_28_TAX,
            ARTICLE_29_EQUAL_CIVIL_RIGHTS,
            ARTICLE_30_EXCLUSIVE_INDIGENOUS_RIGHTS,
            ARTICLE_31_PEOPLES_OWNERSHIP,
            ARTICLE_32_NATURE_RESERVES,
            ARTICLE_33_LAND_OWNERSHIP,
            ARTICLE_34_RESOURCE_EXCHANGE,
            ARTICLE_35_NATIONAL_CORPORATIONS,
            ARTICLE_36_PROFIT_DISTRIBUTION,
            ARTICLE_37_CORE_FREEZE,
            CONCLUSION
        ));
    }

    /*//////////////////////////////////////////////////////////////
                        ФУНКЦИИ ЧТЕНИЯ
    //////////////////////////////////////////////////////////////*/

    function getArticle(uint8 number) external pure returns (string memory) {
        if (number == 1) return ARTICLE_1_SOURCE_OF_POWER;
        if (number == 2) return ARTICLE_2_PERSONAL_SOVEREIGNTY;
        if (number == 3) return ARTICLE_3_IDENTITY;
        if (number == 4) return ARTICLE_4_ACCOUNTABILITY;
        if (number == 5) return ARTICLE_5_TERM_LIMITS;
        if (number == 6) return ARTICLE_6_RULE_OF_LAW;
        if (number == 7) return ARTICLE_7_INEVITABILITY;
        if (number == 8) return ARTICLE_8_LAND_RIGHTS;
        if (number == 9) return ARTICLE_9_RESIDENCE;
        if (number == 10) return ARTICLE_10_SOCIAL_STRUCTURE;
        if (number == 11) return ARTICLE_11_PRIVATE_PROPERTY;
        if (number == 12) return ARTICLE_12_FREE_SPEECH;
        if (number == 13) return ARTICLE_13_PEOPLES_SOVEREIGNTY;
        if (number == 14) return ARTICLE_14_INTERNAL_POLICY;
        if (number == 15) return ARTICLE_15_DIPLOMATIC_RIGHTS;
        if (number == 16) return ARTICLE_16_JOINT_FOREIGN_POLICY;
        if (number == 17) return ARTICLE_17_YEHE_KHURAL;
        if (number == 18) return ARTICLE_18_VOLUNTARY_UNION;
        if (number == 19) return ARTICLE_19_COMMUNITY_EXIT;
        if (number == 20) return ARTICLE_20_INDIGENOUS_EXIT_RIGHT;
        if (number == 21) return ARTICLE_21_EXIT_PROCEDURE;
        if (number == 22) return ARTICLE_22_EXIT_INVIOLABILITY;
        if (number == 23) return ARTICLE_23_TERRITORIAL_SCOPE;
        if (number == 24) return ARTICLE_24_MACROREGIONS;
        if (number == 25) return ARTICLE_25_CAPITAL;
        if (number == 26) return ARTICLE_26_CURRENCY;
        if (number == 27) return ARTICLE_27_NETWORK_FEE;
        if (number == 28) return ARTICLE_28_TAX;
        if (number == 29) return ARTICLE_29_EQUAL_CIVIL_RIGHTS;
        if (number == 30) return ARTICLE_30_EXCLUSIVE_INDIGENOUS_RIGHTS;
        if (number == 31) return ARTICLE_31_PEOPLES_OWNERSHIP;
        if (number == 32) return ARTICLE_32_NATURE_RESERVES;
        if (number == 33) return ARTICLE_33_LAND_OWNERSHIP;
        if (number == 34) return ARTICLE_34_RESOURCE_EXCHANGE;
        if (number == 35) return ARTICLE_35_NATIONAL_CORPORATIONS;
        if (number == 36) return ARTICLE_36_PROFIT_DISTRIBUTION;
        if (number == 37) return ARTICLE_37_CORE_FREEZE;
        revert("Invalid article number (1-37)");
    }

    function getSectionArticles(uint8 section) external pure returns (uint8 start, uint8 end) {
        if (section == 1) return (1, 5);   // Источник и пределы власти
        if (section == 2) return (6, 7);   // Закон и правопорядок
        if (section == 3) return (8, 11);  // Земля и общественный порядок
        if (section == 4) return (12, 12); // Свободы
        if (section == 5) return (13, 17); // Государства народов и конфедерация
        if (section == 6) return (18, 22); // Право выхода
        if (section == 7) return (23, 25); // Территория и столица
        if (section == 8) return (26, 28); // Экономическое основание
        if (section == 9) return (29, 30); // Равенство прав
        if (section == 10) return (31, 36); // Небо, земля, ресурсы
        if (section == 11) return (37, 37); // Неизменяемость
        revert("Invalid section number (1-11)");
    }

    function verifyIntegrity() external view returns (bool) {
        return _computeHash() == lawHash;
    }

    function getPreamble() external pure returns (string memory) {
        return PREAMBLE;
    }

    function getConclusion() external pure returns (string memory) {
        return CONCLUSION;
    }
}
