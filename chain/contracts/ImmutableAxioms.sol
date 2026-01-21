// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ImmutableAxioms
 * @notice Неизменяемые Аксиомы Сибирской Конфедерации
 *
 * Данный контракт содержит фундаментальные принципы, которые НЕ МОГУТ быть изменены.
 * Они записаны при создании контракта и остаются неизменными навечно.
 *
 * Это основа всей правовой системы — Конституция над Конституцией.
 * ConstitutionRegistry может хранить статьи и поправки, но они НЕ МОГУТ
 * противоречить данным аксиомам.
 *
 * Сибирская Конфедерация — союз свободных народов от Урала до Тихого океана.
 * Сибирь — колыбель кочевой цивилизации.
 */
contract ImmutableAxioms {
    /*//////////////////////////////////////////////////////////////
                        НЕИЗМЕНЯЕМЫЕ АКСИОМЫ
    //////////////////////////////////////////////////////////////*/

    // ═══════════════════════════════════════════════════════════════
    // РАЗДЕЛ I: ИСТОЧНИК ВЛАСТИ И СУВЕРЕНИТЕТ
    // ═══════════════════════════════════════════════════════════════

    /// @notice Аксиома 1: Источник власти
    string public constant AXIOM_1_SOURCE_OF_POWER =
        unicode"Коренной народ является единственным источником власти. "
        unicode"Власть исходит от народа и осуществляется народом через "
        unicode"систему Хурал (10-100-1000-10000).";

    /// @notice Аксиома 2: Право на землю
    string public constant AXIOM_2_LAND_RIGHTS =
        unicode"Исключительное право на земли принадлежит коренному народу. "
        unicode"Земли неотчуждаемы и не продаются. "
        unicode"Земля — священное наследие предков для будущих поколений.";

    /// @notice Аксиома 3: Право на жилище
    string public constant AXIOM_3_RIGHT_TO_DWELL =
        unicode"Все люди, вне зависимости от вероисповедания и расы, "
        unicode"имеют право жить на земле коренных народов и строить "
        unicode"свои жилища, если соблюдают законы Конфедерации.";

    // ═══════════════════════════════════════════════════════════════
    // РАЗДЕЛ II: ПРАВА И СВОБОДЫ
    // ═══════════════════════════════════════════════════════════════

    /// @notice Аксиома 4: Частная жизнь и собственность
    string public constant AXIOM_4_PRIVATE_PROPERTY =
        unicode"Частная жизнь и частная собственность защищены законом. "
        unicode"Никто не может быть лишён собственности без справедливого "
        unicode"судебного решения.";

    /// @notice Аксиома 5: Свобода слова с ответственностью
    string public constant AXIOM_5_FREE_SPEECH =
        unicode"Свобода слова гарантирована с ответственностью за слова. "
        unicode"За враньё и клевету — наказание по закону. "
        unicode"Слово — сила, и сила требует ответственности.";

    /// @notice Аксиома 6: Наказание за преступления
    string public constant AXIOM_6_JUSTICE =
        unicode"За воровство — наказание. За преступления против личности — наказание. "
        unicode"Закон един для всех, без исключений по статусу или происхождению.";

    // ═══════════════════════════════════════════════════════════════
    // РАЗДЕЛ III: СТРУКТУРА ВЛАСТИ
    // ═══════════════════════════════════════════════════════════════

    /// @notice Аксиома 7: Семья — основа нации
    string public constant AXIOM_7_FAMILY_STRUCTURE =
        unicode"Структура 10-100-1000-10000 — обязательная связь семьи "
        unicode"в законодательной ветке власти. Семья — основа нации, "
        unicode"где коренной народ является ядром. "
        unicode"Арбан (10) → Зун (100) → Мянган (1000) → Тумен (10000).";

    /// @notice Аксиома 8: Высший Хурал
    string public constant AXIOM_8_KHURAL =
        unicode"Высший Хурал — верховный законодательный орган. "
        unicode"Только Высший Хурал может вносить изменения в Конституцию. "
        unicode"Данные Аксиомы НЕ ПОДЛЕЖАТ изменению никаким органом.";

    // ═══════════════════════════════════════════════════════════════
    // РАЗДЕЛ IV: ЭКОНОМИКА И ВАЛЮТА
    // ═══════════════════════════════════════════════════════════════

    /// @notice Аксиома 9: Валюта Алтан
    string public constant AXIOM_9_ALTAN_CURRENCY =
        unicode"Алтан — единая валюта Сибирской Конфедерации. "
        unicode"Право эмиссии принадлежит исключительно Центральному Банку Сибири. "
        unicode"Алтан обеспечен словом народов Сибири и богатствами нашего народа.";

    /// @notice Аксиома 10: Единая комиссия
    string public constant AXIOM_10_TRANSACTION_FEE =
        unicode"Любая транзакция в системе стоит 0.03% Алтан от суммы транзакции. "
        unicode"Не должно быть иных комиссий или связей с внешними операторами. "
        unicode"Комиссия идёт на поддержание инфраструктуры.";

    /// @notice Аксиома 11: Налогообложение
    string public constant AXIOM_11_TAXATION =
        unicode"Налог 10% от прибыли платят все без исключения — граждане и не-граждане. "
        unicode"Налог распределяется: 7% в бюджет Республики, 3% в бюджет Конфедерации. "
        unicode"Равенство перед налоговым законом без дискриминации.";

    // ═══════════════════════════════════════════════════════════════
    // РАЗДЕЛ V: КОНФЕДЕРАЦИЯ И НАРОДЫ
    // ═══════════════════════════════════════════════════════════════

    /// @notice Аксиома 12: Сибирская Конфедерация
    string public constant AXIOM_12_CONFEDERATION =
        unicode"Сибирская Конфедерация — союз свободных народов и республик "
        unicode"от Урала до Тихого океана. Каждая республика суверенна "
        unicode"в рамках данных Аксиом и Конституции.";

    /// @notice Аксиома 13: Свободное перемещение
    string public constant AXIOM_13_FREE_MOVEMENT =
        unicode"Свободное перемещение по странам Конфедерации гарантировано. "
        unicode"Каждый народ обеспечивает защиту и ответственен за жизнь "
        unicode"гражданина Конфедерации на своей территории.";

    /// @notice Аксиома 14: Документ принадлежности
    string public constant AXIOM_14_IDENTITY_DOCUMENT =
        unicode"Каждый гражданин получает документ принадлежности к своей Республике. "
        unicode"Формат: [Союз]-[Республика]. Например: Сибирь-Буряад-Монголия, "
        unicode"Сибирь-Республика Саха, Северный Кавказ-Дагестан. "
        unicode"Право на документ имеют коренные народы и рождённые на территории.";

    /// @notice Аксиома 15: Колыбель цивилизации
    string public constant AXIOM_15_CRADLE =
        unicode"Сибирь — колыбель кочевой цивилизации. "
        unicode"Мы храним память предков и строим будущее для потомков. "
        unicode"Коренные народы: Буряад-Монголы, Тюрки, Маньчжуры, Тунгусы, Угры.";

    /*//////////////////////////////////////////////////////////////
                        МЕТАДАННЫЕ КОНТРАКТА
    //////////////////////////////////////////////////////////////*/

    /// @notice Название документа
    string public constant DOCUMENT_NAME = unicode"Неизменяемые Аксиомы Сибирской Конфедерации";

    /// @notice Версия (неизменяемая)
    string public constant VERSION = "1.0.0";

    /// @notice Дата принятия (timestamp создания контракта)
    uint256 public immutable adoptedAt;

    /// @notice Хеш всех аксиом для верификации целостности
    bytes32 public immutable axiomsHash;

    /*//////////////////////////////////////////////////////////////
                        СТРУКТУРА СОЮЗОВ
    //////////////////////////////////////////////////////////////*/

    /// @notice Перечень союзов Конфедерации
    string public constant UNIONS =
        unicode"1. СИБИРЬ — от Урала до Тихого океана\n"
        unicode"   • Буряад-Монголия (вкл. Красноярский край, Иркутская обл., "
        unicode"Забайкальский край, Хабаровский край, Приморский край, Сахалин)\n"
        unicode"   • Республика Саха (Якутия)\n"
        unicode"   • Республика Чукотка\n"
        unicode"   • Республика Алтай (вкл. Алтайский край, Новосибирская, Томская, Омская обл.)\n"
        unicode"   • Республика Тыва\n"
        unicode"   • Республика Хакасия\n"
        unicode"\n"
        unicode"2. СЕВЕРНЫЙ КАВКАЗ\n"
        unicode"   • Республика Дагестан\n"
        unicode"   • Чеченская Республика (Ичкерия)\n"
        unicode"   • Республика Ингушетия\n"
        unicode"   • Кабардино-Балкарская Республика\n"
        unicode"   • Карачаево-Черкесская Республика\n"
        unicode"   • Республика Северная Осетия\n"
        unicode"   • Республика Адыгея\n"
        unicode"\n"
        unicode"3. ЗОЛОТОЕ КОЛЬЦО (Российская Республика)\n"
        unicode"   • Московская область\n"
        unicode"   • Владимирская область\n"
        unicode"   • Ярославская область\n"
        unicode"   • Костромская область\n"
        unicode"   • Ивановская область\n"
        unicode"   • Суздальская область\n"
        unicode"   • Тверская область\n"
        unicode"\n"
        unicode"4. СЕВЕР\n"
        unicode"   • Республика Коми\n"
        unicode"   • Республика Карелия\n"
        unicode"   • Архангельская область\n"
        unicode"   • Мурманская область\n"
        unicode"   • Ненецкий автономный округ\n"
        unicode"\n"
        unicode"5. ПОВОЛЖЬЕ\n"
        unicode"   • Республика Татарстан\n"
        unicode"   • Республика Башкортостан\n"
        unicode"   • Чувашская Республика\n"
        unicode"   • Республика Марий Эл\n"
        unicode"   • Республика Мордовия\n"
        unicode"   • Удмуртская Республика\n"
        unicode"\n"
        unicode"6. УРАЛ\n"
        unicode"   • Свердловская область\n"
        unicode"   • Челябинская область\n"
        unicode"   • Курганская область\n"
        unicode"   • Ханты-Мансийский автономный округ\n"
        unicode"   • Ямало-Ненецкий автономный округ";

    /*//////////////////////////////////////////////////////////////
                            КОНСТРУКТОР
    //////////////////////////////////////////////////////////////*/

    constructor() {
        adoptedAt = block.timestamp;

        // Вычисляем хеш всех аксиом для верификации целостности
        axiomsHash = keccak256(abi.encodePacked(
            AXIOM_1_SOURCE_OF_POWER,
            AXIOM_2_LAND_RIGHTS,
            AXIOM_3_RIGHT_TO_DWELL,
            AXIOM_4_PRIVATE_PROPERTY,
            AXIOM_5_FREE_SPEECH,
            AXIOM_6_JUSTICE,
            AXIOM_7_FAMILY_STRUCTURE,
            AXIOM_8_KHURAL,
            AXIOM_9_ALTAN_CURRENCY,
            AXIOM_10_TRANSACTION_FEE,
            AXIOM_11_TAXATION,
            AXIOM_12_CONFEDERATION,
            AXIOM_13_FREE_MOVEMENT,
            AXIOM_14_IDENTITY_DOCUMENT,
            AXIOM_15_CRADLE,
            UNIONS
        ));
    }

    /*//////////////////////////////////////////////////////////////
                        ФУНКЦИИ ЧТЕНИЯ
    //////////////////////////////////////////////////////////////*/

    /// @notice Получить все аксиомы как массив строк
    function getAllAxioms() external pure returns (string[15] memory) {
        return [
            AXIOM_1_SOURCE_OF_POWER,
            AXIOM_2_LAND_RIGHTS,
            AXIOM_3_RIGHT_TO_DWELL,
            AXIOM_4_PRIVATE_PROPERTY,
            AXIOM_5_FREE_SPEECH,
            AXIOM_6_JUSTICE,
            AXIOM_7_FAMILY_STRUCTURE,
            AXIOM_8_KHURAL,
            AXIOM_9_ALTAN_CURRENCY,
            AXIOM_10_TRANSACTION_FEE,
            AXIOM_11_TAXATION,
            AXIOM_12_CONFEDERATION,
            AXIOM_13_FREE_MOVEMENT,
            AXIOM_14_IDENTITY_DOCUMENT,
            AXIOM_15_CRADLE
        ];
    }

    /// @notice Получить аксиому по номеру (1-15)
    function getAxiom(uint8 number) external pure returns (string memory) {
        if (number == 1) return AXIOM_1_SOURCE_OF_POWER;
        if (number == 2) return AXIOM_2_LAND_RIGHTS;
        if (number == 3) return AXIOM_3_RIGHT_TO_DWELL;
        if (number == 4) return AXIOM_4_PRIVATE_PROPERTY;
        if (number == 5) return AXIOM_5_FREE_SPEECH;
        if (number == 6) return AXIOM_6_JUSTICE;
        if (number == 7) return AXIOM_7_FAMILY_STRUCTURE;
        if (number == 8) return AXIOM_8_KHURAL;
        if (number == 9) return AXIOM_9_ALTAN_CURRENCY;
        if (number == 10) return AXIOM_10_TRANSACTION_FEE;
        if (number == 11) return AXIOM_11_TAXATION;
        if (number == 12) return AXIOM_12_CONFEDERATION;
        if (number == 13) return AXIOM_13_FREE_MOVEMENT;
        if (number == 14) return AXIOM_14_IDENTITY_DOCUMENT;
        if (number == 15) return AXIOM_15_CRADLE;
        revert("Invalid axiom number (1-15)");
    }

    /// @notice Проверить целостность аксиом
    function verifyIntegrity() external view returns (bool) {
        bytes32 currentHash = keccak256(abi.encodePacked(
            AXIOM_1_SOURCE_OF_POWER,
            AXIOM_2_LAND_RIGHTS,
            AXIOM_3_RIGHT_TO_DWELL,
            AXIOM_4_PRIVATE_PROPERTY,
            AXIOM_5_FREE_SPEECH,
            AXIOM_6_JUSTICE,
            AXIOM_7_FAMILY_STRUCTURE,
            AXIOM_8_KHURAL,
            AXIOM_9_ALTAN_CURRENCY,
            AXIOM_10_TRANSACTION_FEE,
            AXIOM_11_TAXATION,
            AXIOM_12_CONFEDERATION,
            AXIOM_13_FREE_MOVEMENT,
            AXIOM_14_IDENTITY_DOCUMENT,
            AXIOM_15_CRADLE,
            UNIONS
        ));
        return currentHash == axiomsHash;
    }

    /// @notice Получить общее количество аксиом
    function getAxiomCount() external pure returns (uint8) {
        return 15;
    }

    /// @notice Получить структуру союзов
    function getUnions() external pure returns (string memory) {
        return UNIONS;
    }
}
