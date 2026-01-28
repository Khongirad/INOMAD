# iNomad Blockchain Platform

<div align="center">

**Децентрализованная экономическая платформа для стран СНГ**

[![Solidity](https://img.shields.io/badge/Solidity-^0.8.24-blue)](https://soliditylang.org/)
[![Foundry](https://img.shields.io/badge/Foundry-Latest-yellow)](https://getfoundry.sh/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

[Документация](./docs/) · [Архитектура](./docs/ARCHITECTURE.md) · [Timeline](./docs/PROJECT_TIMELINE.md)

</div>

---

## 📖 О проекте

**iNomad** — комплексная блокчейн-экосистема для децентрализованной экономики стран СНГ с полным циклом от производства до торговли, включая систему управления, финансовые инструменты и трекинг товаров.

### Ключевые особенности

- 🏛️ **Четырёхветвевая система управления** (Законодательная, Исполнительная, Судебная, Надзорная)
- 💰 **Монетарная система ALTAN** с дефляционной моделью
- 🛒 **5 типов маркетплейсов** (Retail, Services, Auctions, Commodities, Jobs)
- 📈 **Финансовые биржи** (Фондовая, Валютная)
- 🔐 **Цифровые паспорта товаров** (DPP) с полной трассировкой
- 📄 **Автоматическая генерация документов** (СНГ стандарты)
- 🛡️ **Защита от мошенничества** встроенная в систему

---

## 🏗️ Архитектура системы

```
┌─────────────────────────────────────────────────┐
│         GOVERNANCE LAYER (4 Branches)           │
│  Legislative│Executive│Judicial│Supervisory     │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────┐
│            MARKETPLACE LAYER (11)                │
│  Retail│Service│Auction│Commodity│Job           │
│  Stock│Forex│ItemAuction                        │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────┐
│         PAYMENT & SETTLEMENT LAYER               │
│      AltanPaymentGateway (Unified)               │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────┐
│         INFRASTRUCTURE LAYER                     │
│  DPP│Chancellery│AntiFraud│Compliance│Notary    │
└──────────────────────────────────────────────────┘
```

Полное описание: [ARCHITECTURE.md](./docs/ARCHITECTURE.md)

---

## 📦 Основные контракты

### Governance (Управление)
- **Legislature.sol** — Законодательная власть (предложения, голосования)
- **Executive.sol** — Исполнительная власть (Хан, министры)
- **SupremeCourt.sol** — Судебная власть (споры, апелляции)
- **Supervisory.sol** — Надзорная власть (проверки, расследования)

### Marketplaces (Торговые площадки)
- **RetailMarketplace.sol** — Amazon-style розничная торговля
- **ServiceMarketplace.sol** — Билеты и бронирование услуг
- **AuctionHouse.sol** — 5 типов аукционов
- **CommodityExchange.sol** — B2B сырьевая биржа
- **JobMarketplace.sol** — Работа, гиги, тендеры

### Financial (Финансы)
- **AltanPaymentGateway.sol** — Единая платёжная система
- **StockExchange.sol** — Фондовая биржа (IPO, акции)
- **ForexExchange.sol** — Валютная биржа (ALTAN/USDT)
- **ItemAuctionHouse.sol** — WoW-style аукционы

### Infrastructure (Инфраструктура)
- **DigitalProductPassport.sol** — Цифровые паспорта товаров
- **UnifiedChancellery.sol** — Генерация СНГ документов
- **AntiFraudEngine.sol** — Защита от мошенничества
- **ComplianceMatrix.sol** — Проверка регуляций

---

## 🚀 Быстрый старт

### Установка

```bash
# Клонировать репозиторий
git clone https://github.com/inomadinc/inomad-client.git
cd inomad-client

# Установить зависимости
cd chain
forge install

# Компиляция контрактов
forge build

# Запустить тесты
forge test
```

### Развёртывание

```bash
# 1. Настроить .env
cp .env.example .env
# Добавить PRIVATE_KEY и RPC_URL

# 2. Deploy на localhost
anvil  # В отдельном терминале

# 3. Deploy контрактов
forge script script/Deploy.s.sol --rpc-url localhost --broadcast

# 4. Verify (для testnet/mainnet)
forge verify-contract <ADDRESS> <CONTRACT> --chain <CHAIN_ID>
```

---

## 📚 Документация

- [**Архитектура системы**](./docs/ARCHITECTURE.md) — Полное описание архитектуры
- [**Timeline проекта**](./docs/PROJECT_TIMELINE.md) — История разработки
- [**Контракты**](./docs/contracts/) — Детальная документация контрактов
- [**Руководство разработчика**](./docs/DEVELOPER_GUIDE.md) — Гайды для разработчиков
- [**API Reference**](./docs/API.md) — Справочник по функциям

---

## 📊 Статистика проекта

| Категория | Количество | Строк кода |
|-----------|------------|------------|
| **Contracts** | 30+ | ~15,000 |
| **Tests** | 50+ | ~5,000 |
| **Documentation** | 20+ | N/A |

### Последние обновления

**Январь 2026**:
- ✅ Создана полная система управления (4 ветви)
- ✅ Реализованы 5 основных маркетплейсов
- ✅ Добавлены фондовая и валютная биржи
- ✅ Интегрирован PaymentGateway во все маркетплейсы
- ✅ Создана система DPP для трекинга товаров

См. полный [PROJECT_TIMELINE.md](./docs/PROJECT_TIMELINE.md)

---

## 🤝 Для новых сотрудников

### Onboarding

1. **Прочитать документацию**:
   - [ARCHITECTURE.md](./docs/ARCHITECTURE.md) — Понять общую архитектуру
   - [PROJECT_TIMELINE.md](./docs/PROJECT_TIMELINE.md) — Узнать историю проекта
   - [DEVELOPER_GUIDE.md](./docs/DEVELOPER_GUIDE.md) — Начать разработку

2. **Настроить окружение**:
   ```bash
   # Установить Foundry
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   
   # Установить зависимости проекта
   cd chain && forge install
   ```

3. **Запустить тесты**:
   ```bash
   forge test -vvv
   ```

4. **Изучить ключевые контракты** (по приоритету):
   - `AltanPaymentGateway.sol` — Платежная система
   - `RetailMarketplace.sol` — Пример маркетплейса
   - `DigitalProductPassport.sol` — Трекинг товаров

### Структура проекта

```
inomad-client/
├── chain/                  # Blockchain контракты
│   ├── contracts/         # Solidity контракты
│   │   ├── governance/   # 4 ветви власти
│   │   ├── marketplaces/ # Торговые площадки
│   │   ├── financial/    # Финансовые контракты
│   │   └── infrastructure/ # Инфраструктура
│   ├── test/             # Foundry тесты
│   └── script/           # Deployment скрипты
├── backend/              # Backend сервисы
├── frontend/             # Frontend приложение
└── docs/                 # Документация
    ├── ARCHITECTURE.md
    ├── PROJECT_TIMELINE.md
    ├── contracts/        # Документация по контрактам
    └── diagrams/         # Диаграммы
```

---

## 🛠️ Технологии

- **Smart Contracts**: Solidity ^0.8.24
- **Framework**: Foundry (Forge, Cast, Anvil)
- **Testing**: Foundry Test
- **Deployment**: Foundry Scripts
- **Standards**: ERC20, ERC721, ERC1155

---

## 🔐 Безопасность

- ✅ Reentrancy protection
- ✅ Access control (roles)
- ✅ Escrow mechanisms
- ✅ Multi-sig support
- ✅ Pausable contracts
- ⏳ Audit planned (Q2 2026)

### Reporting Security Issues

Обнаружили уязвимость? Напишите на: security@inomad.io

---

## 📝 Лицензия

MIT License — см. [LICENSE](LICENSE)

---

## 👥 Команда

- **Founder & CEO**: [Profile]
- **CTO**: [Profile]  
- **Lead Blockchain Developer**: [Profile]
- **Smart Contract Auditor**: [Profile]

---

## 🌐 Ссылки

- **Website**: https://inomad.io
- **Docs**: https://docs.inomad.io
- **Twitter**: [@iNomadChain](https://twitter.com/iNomadChain)
- **Discord**: [Join](https://discord.gg/inomad)
- **Telegram**: [@iNomadOfficial](https://t.me/iNomadOfficial)

---

## 📞 Контакты

- **Email**: hello@inomad.io
- **Support**: support@inomad.io
- **Partnerships**: partners@inomad.io

---

<div align="center">

**Построено с ❤️ для СНГ**

[Сайт](https://inomad.io) · [Документация](./docs/) · [GitHub](https://github.com/inomadinc/inomad-client)

</div>
