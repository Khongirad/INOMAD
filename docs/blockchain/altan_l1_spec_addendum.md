# ALTAN L1 - Addendum: Fee Model & Governance Updates

## 1. Secure Dual Fee Model (Gas + Commission)

### 1.1 Formula (SECURE)

```
Total Fee = Gas Fee + INOMAD Commission

Where:
  Gas Fee    = gas_used × gas_price           → NO CAP (spam protection!)
  Commission = MIN(amount × 0.03%, 1000 ALTAN) → CAP 1000 (whale-friendly)

Security: Gas has NO cap to prevent spam/DDoS attacks
Fairness: Commission capped so whales don't pay excessive fees
```

### 1.2 Fee Breakdown

| Component | Purpose | Cap | Recipient | Why? |
|-----------|---------|-----|-----------|------|
| **Gas Fee** | Network protection, anti-spam, DDoS | **NO CAP** | Validators 90% + Pool 10% | Спамеры платят дорого! |
| **0.03% Commission** | Platform revenue | **1,000 ALTAN** | INOMAD INC | Киты не уходят |

### 1.3 Security Analysis

| Attack Type | Gas Required | Gas Fee (no cap) | Commission | **Total Cost** | **Verdict** |
|-------------|--------------|------------------|------------|----------------|-------------|
| **Spam (1M empty txs)** | 50K × 1M | 50M ALTAN | 0 | **50M ALTAN** | ❌ Too expensive |
| **DDoS (complex contracts)** | 10M × 10K | 100B ALTAN | 0 | **100B ALTAN** | ❌ Impossible |
| **State bloat attack** | 1M × 1K | 1B ALTAN | 0 | **1B ALTAN** | ❌ Very expensive |

### 1.4 Business Examples (Normal Users)

| Transaction | Amount | Gas Used | Gas Fee | 0.03% Commission | **Total** |
|-------------|--------|----------|---------|------------------|-----------|
| Simple transfer | 100 ALTAN | 50,000 | 0.05 | 0.03 | **0.08** |
| Medium transfer | 10,000 ALTAN | 50,000 | 0.05 | 3.00 | **3.05** |
| Large transfer | 1,000,000 ALTAN | 50,000 | 0.05 | 300 | **300.05** |
| Whale transfer | 100,000,000 ALTAN | 50,000 | 0.05 | **1,000** (cap) | **1,000.05** |
| Smart contract | 1,000 ALTAN | 500,000 | 0.50 | 0.30 | **0.80** |
| Complex DeFi | 10,000 ALTAN | 2,000,000 | 2.00 | 3.00 | **5.00** |

### 1.5 Why This Model Works

```
✅ SPAM PROTECTION: Gas has NO cap
   - Attacker pays proportionally to network resources used
   - 1 million spam txs = 50 million ALTAN cost
   - Makes attacks economically impossible

✅ WHALE-FRIENDLY: Commission capped at 1000 ALTAN
   - Transfer $100M = pay only 1000 ALTAN commission
   - Better than banks (0.001% vs 1-3%)
   - Whales stay in ecosystem

✅ SUSTAINABLE REVENUE: 0.03% goes to INOMAD INC
   - Every transfer funds development
   - Cap ensures competitive rates
   - Predictable for users
```

### 1.6 Comparison with Other Chains

| Chain | Fee Model | Spam Safe? | Whale-Friendly? |
|-------|-----------|------------|-----------------|
| **Ethereum** | Gas only, no cap | ✅ Yes | ⚠️ Depends on congestion |
| **Solana** | Fixed low fees | ❌ Spam possible | ✅ Yes |
| **BSC** | Gas, low price | ⚠️ Some spam | ✅ Yes |
| **ALTAN** | Gas (no cap) + 0.03% (cap 1000) | ✅ **Yes** | ✅ **Yes** |

### 1.3 Fee Distribution & Economics

```yaml
Distribution:
  Validators + Delegators: 90%
  Community Pool: 10%

# При комиссии 50 ualtan:
# → 45 ualtan → Валидаторы (поддержка серверов 24/7)
# → 5 ualtan → Community Pool (развитие экосистемы)
```

**Почему именно 90/10?**

| Получатель | Доля | Назначение |
|------------|------|------------|
| **Валидаторы** | 90% | Компенсация за сервера (64GB RAM, NVMe SSD), аптайм 24/7, безопасность |
| **Делегаторы** | (часть 90%) | Обычные пользователи, стейкающие ALTAN |
| **Community Pool** | 10% | Гранты разработчикам, маркетинг, развитие — расходуется через Governance Vote |

---

## 2. Полная Экономика Газа

### 2.1 Minimum Gas Price

```yaml
Minimum Gas Price: 0.001 ualtan per gas unit
```

**Зачем нужен минимум?**
1. **Защита от DDoS**: Бесплатные транзакции = миллиарды спам-атак
2. **Floor Price**: Валидаторы отклоняют tx с ценой < 0.001
3. **Доступность**: $0.000005 за перевод = практически бесплатно для пользователей

### 2.2 Gas Limits по Операциям

| Операция | Gas Limit | Обоснование |
|----------|-----------|-------------|
| **Simple Transfer** | 50,000 | Проверка подписи + изменение 2 балансов |
| **CosmWasm Execute** | 200,000-500,000 | Wasm VM + чтение/запись storage |
| **Complex Governance** | 1,000,000 | Проверка условий + обновление всей БД сети |

### 2.3 Расчёт Итоговой Комиссии

```
Шаг 1: Gas Limit × Gas Price = Base Fee
Шаг 2: MAX(Base Fee, 0.03% × Amount) = Transaction Fee
Шаг 3: MIN(Transaction Fee, Hard Cap 1000 ALTAN) = Final Fee
```

**Примеры:**

| Операция | Gas | Amount | Base Fee | 0.03% Tax | **Final Fee** |
|----------|-----|--------|----------|-----------|---------------|
| Transfer 10 ALTAN | 50,000 | 10 | 0.05 | 0.003 | **0.05** |
| Transfer 100K ALTAN | 50,000 | 100,000 | 0.05 | 30 | **30** |
| CosmWasm call | 300,000 | 1,000 | 0.30 | 0.30 | **0.30** |
| Whale transfer 100M | 50,000 | 100,000,000 | 0.05 | 30,000 | **1,000** (cap) |

### 2.4 Процесс Транзакции

```
1. Пользователь нажимает "Отправить"
     ↓
2. Кошелёк считает: Gas Limit × Gas Price = Base Fee
     ↓
3. Сравнение: MAX(Base Fee, 0.03% × Amount)
     ↓
4. Применение Hard Cap: MIN(result, 1000 ALTAN)
     ↓
5. Валидатор проверяет: Fee ≥ Required?
     ↓
6. ✅ Транзакция в блоке:
   → 90% → Валидаторы + Делегаторы
   → 10% → Community Pool
```

### 2.5 Burn Option (Дефляционная Модель)

```yaml
# Опционально (включается через Governance)
Burn Enabled: false  # По умолчанию выключено

# Если включено:
Burn Rate: 50% от собранных комиссий
Effect: Постепенное сокращение Total Supply
Benefit: Рост стоимости оставшихся токенов
```

---

## 3. Обновлённая Иерархия Khural (5 уровней)

### 3.1 Корректная Структура

```
┌────────────────────────────────────────────────────────────────┐
│                 CONFEDERATION KHURAL                             │
│         (Встреча лидеров ВСЕХ Республик)                        │
│              Законы Сибирской Конфедерации                       │
└───────────────────────────┬────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼───────┐   ┌───────▼───────┐   ┌───────▼───────┐
│ REPUBLIC      │   │ REPUBLIC      │   │ REPUBLIC      │
│ KHURAL        │   │ KHURAL        │   │ KHURAL        │
│ (Yakutia)     │   │ (Buryatia)    │   │ (N Republics) │
│ Лидеры Tumed  │   │ Лидеры Tumed  │   │ Лидеры Tumed  │
└───────┬───────┘   └───────────────┘   └───────────────┘
        │
┌───────▼───────┐
│ TUMED KHURAL  │ × N (по кол-ву Tumed в республике)
│ 10,000 семей  │
│ Лидеры Myangad│
└───────┬───────┘
        │
┌───────▼───────┐
│MYANGAD KHURAL │ × 10
│ 1,000 семей   │
│ Лидеры Zun    │
└───────┬───────┘
        │
┌───────▼───────┐
│  ZUN KHURAL   │ × 10
│ 100 семей     │
│ Лидеры Arbad  │
└───────┬───────┘
        │
┌───────▼───────┐
│ ARBAD KHURAL  │ × 10
│ 10 семей      │
│ Прямое голос. │
└───────────────┘
```

### 3.2 Юрисдикция (Corrected)

| Уровень | Юрисдикция | Состав | Голосование |
|---------|------------|--------|-------------|
| **Arbad** | Местные вопросы | 10 семей (~50 чел) | Прямая демократия |
| **Zun** | Район | 100 семей (~500 чел) | Представители Arbad |
| **Myangad** | Провинция | 1,000 семей (~5K чел) | Представители Zun |
| **Tumed** | Область/Округ | 10,000 семей (~50K чел) | Представители Myangad |
| **Republic Khural** | Республика | Все Tumed республики | **Лидеры Tumed** |
| **Confederation** | Конфедерация | 145M граждан | **Лидеры Республик** |

### 3.3 Обновлённый Proto

```protobuf
// proto/altan/khural/v1/khural.proto
enum KhuralLevel {
  ARBAD = 0;           // 10 families - local
  ZUN = 1;             // 100 families - district  
  MYANGAD = 2;         // 1,000 families - province
  TUMED = 3;           // 10,000 families - region
  REPUBLIC = 4;        // Republic (all Tumeds) - Лидеры Tumed
  CONFEDERATION = 5;   // All Republics - Лидеры Республик
}

message RepublicKhural {
  string id = 1;
  string republic_name = 2;           // "Yakutia", "Buryatia", etc.
  repeated string tumed_leader_ids = 3;  // Leaders of all Tumeds
  uint64 total_population = 4;
}

message ConfederationKhural {
  string id = 1;
  repeated string republic_leader_ids = 2;  // Leaders of all Republics
  uint64 total_population = 3;              // 145 million
  string current_chairman_id = 4;
}
```

### 1.7 SecureDualFeeDecorator Implementation (Go)

```go
// app/ante/secure_dual_fee_decorator.go
package ante

import (
    sdk "github.com/cosmos/cosmos-sdk/types"
    sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
    banktypes "github.com/cosmos/cosmos-sdk/x/bank/types"
)

const (
    CommissionRateBPS = 3       // 0.03%
    CommissionCap     = 1000    // 1000 ALTAN max for INOMAD commission only
    // NOTE: Gas has NO cap for spam protection!
)

// INOMAD INC wallet address
var InomadWallet = sdk.MustAccAddressFromBech32("altan1inomad...")

type SecureDualFeeDecorator struct {
    bankKeeper    BankKeeper
    corelawKeeper CoreLawKeeper
}

func NewSecureDualFeeDecorator(bk BankKeeper, ck CoreLawKeeper) SecureDualFeeDecorator {
    return SecureDualFeeDecorator{
        bankKeeper:    bk,
        corelawKeeper: ck,
    }
}

func (sdf SecureDualFeeDecorator) AnteHandle(
    ctx sdk.Context, 
    tx sdk.Tx, 
    simulate bool, 
    next sdk.AnteHandler,
) (newCtx sdk.Context, err error) {
    
    feeTx, ok := tx.(sdk.FeeTx)
    if !ok {
        return ctx, sdkerrors.Wrap(sdkerrors.ErrTxDecode, "Tx must be a FeeTx")
    }

    msgs := tx.GetMsgs()
    
    // Calculate INOMAD commission (0.03% with 1000 ALTAN cap)
    var inomadCommission sdk.Coins
    
    for _, msg := range msgs {
        switch m := msg.(type) {
        case *banktypes.MsgSend:
            commission := sdf.calculateCommission(m.Amount)
            inomadCommission = inomadCommission.Add(commission...)
            
        case *banktypes.MsgMultiSend:
            for _, input := range m.Inputs {
                commission := sdf.calculateCommission(input.Coins)
                inomadCommission = inomadCommission.Add(commission...)
            }
        }
    }

    // Gas fee from tx - NO CAP for spam protection!
    gasFee := feeTx.GetFee()
    
    // Total required = Full Gas Fee (no cap) + INOMAD Commission (with cap)
    totalRequired := gasFee.Add(inomadCommission...)

    // Validate provided fee covers total
    providedFee := feeTx.GetFee()
    if providedFee.IsAllLT(totalRequired) {
        return ctx, sdkerrors.Wrapf(
            sdkerrors.ErrInsufficientFee,
            "insufficient fee: got %s, need %s (gas + 0.03%% commission)",
            providedFee, totalRequired,
        )
    }

    // Send INOMAD commission to INOMAD INC wallet
    if !inomadCommission.IsZero() {
        feePayer := feeTx.FeePayer()
        err := sdf.bankKeeper.SendCoins(ctx, feePayer, InomadWallet, inomadCommission)
        if err != nil {
            return ctx, sdkerrors.Wrap(err, "failed to send INOMAD commission")
        }
        
        ctx.EventManager().EmitEvent(
            sdk.NewEvent(
                "inomad_commission",
                sdk.NewAttribute("amount", inomadCommission.String()),
                sdk.NewAttribute("payer", feePayer.String()),
            ),
        )
    }

    return next(ctx, tx, simulate)
}

// calculateCommission: 0.03% with 1000 ALTAN cap
func (sdf SecureDualFeeDecorator) calculateCommission(amount sdk.Coins) sdk.Coins {
    var commission sdk.Coins
    
    for _, coin := range amount {
        if coin.Denom != "ualtan" {
            continue
        }
        
        // 0.03% = amount * 3 / 10000
        commAmount := coin.Amount.MulRaw(CommissionRateBPS).QuoRaw(10000)
        
        // Apply cap ONLY to commission (1000 ALTAN = 1000 * 10^6 ualtan)
        cap := sdk.NewInt(CommissionCap * 1_000_000)
        if commAmount.GT(cap) {
            commAmount = cap
        }
        
        if commAmount.IsPositive() {
            commission = commission.Add(sdk.NewCoin(coin.Denom, commAmount))
        }
    }
    
    return commission
}

// NO applyGasCap function - gas must remain uncapped for security!
```

### 1.5 Integration in AnteHandler

```go
// app/ante.go
func NewAnteHandler(options HandlerOptions) (sdk.AnteHandler, error) {
    return sdk.ChainAnteDecorators(
        ante.NewSetUpContextDecorator(),
        ante.NewValidateBasicDecorator(),
        ante.NewTxTimeoutHeightDecorator(),
        ante.NewValidateMemoDecorator(options.AccountKeeper),
        ante.NewConsumeGasForTxSizeDecorator(options.AccountKeeper),
        
        // Custom ALTAN Tax Decorator (BEFORE DeductFee)
        NewTaxDecorator(options.BankKeeper, options.CoreLawKeeper),
        
        ante.NewDeductFeeDecorator(options.AccountKeeper, options.BankKeeper, options.FeegrantKeeper, nil),
        ante.NewSetPubKeyDecorator(options.AccountKeeper),
        ante.NewValidateSigCountDecorator(options.AccountKeeper),
        ante.NewSigGasConsumeDecorator(options.AccountKeeper, sigGasConsumer),
        ante.NewSigVerificationDecorator(options.AccountKeeper, options.SignModeHandler),
        ante.NewIncrementSequenceDecorator(options.AccountKeeper),
    ), nil
}
```

---

## 2. Updated Khural Hierarchy (5 Levels)

### 2.1 Structure

```
                    ┌─────────────────────────────┐
                    │   CONFEDERATION KHURAL      │
                    │   (Union of Republics)      │
                    │   Laws for all Confederation│
                    └─────────────┬───────────────┘
                                  │
            ┌─────────────────────┼─────────────────────┐
            │                     │                     │
    ┌───────▼───────┐     ┌───────▼───────┐     ┌───────▼───────┐
    │ TUMED KHURAL  │     │ TUMED KHURAL  │     │ TUMED KHURAL  │
    │ Republic #1   │     │ Republic #2   │     │ Republic #N   │
    │ (10K families)│     │ (10K families)│     │ (10K families)│
    └───────┬───────┘     └───────┬───────┘     └───────────────┘
            │
    ┌───────▼───────┐
    │ MYANGAD KHURAL│ × 10
    │ (1K families) │
    └───────┬───────┘
            │
    ┌───────▼───────┐
    │  ZUN KHURAL   │ × 10
    │ (100 families)│
    └───────┬───────┘
            │
    ┌───────▼───────┐
    │ ARBAD KHURAL  │ × 10
    │ (10 families) │
    └───────────────┘
```

### 2.2 Jurisdiction

| Level | Jurisdiction | Population | Voting |
|-------|-------------|------------|--------|
| **Arbad** | Local community | 10 families (~50 people) | Direct democracy |
| **Zun** | District | 100 families (~500 people) | Arbad representatives |
| **Myangad** | Province | 1,000 families (~5,000 people) | Zun representatives |
| **Tumed** | Republic | 10,000 families (~50,000 people) | Myangad representatives |
| **Confederation** | All Republics | 145 million citizens | Tumed representatives |

### 2.3 Updated Proto Definition

```protobuf
// proto/altan/khural/v1/khural.proto
enum KhuralLevel {
  ARBAD = 0;         // 10 families - local
  ZUN = 1;           // 100 families - district
  MYANGAD = 2;       // 1,000 families - province
  TUMED = 3;         // 10,000 families - REPUBLIC laws
  CONFEDERATION = 4; // All republics - CONFEDERATION laws
}

message Khural {
  string id = 1;
  KhuralLevel level = 2;
  string name = 3;
  repeated string representatives = 4;
  uint64 population = 5;
  string parent_khural_id = 6;  // For hierarchy
  string republic_id = 7;        // Which republic (for levels 0-3)
  bool is_active = 8;
}

message ConfederationKhural {
  string id = 1;
  repeated string republic_ids = 2;  // All participating republics
  repeated string tumed_representatives = 3;
  uint64 total_population = 4;  // 145 million
}
```

---

## 3. Justice Court Integration

### 3.1 FreezeLaw - Justice Court Only

```go
// x/corelaw/keeper/msg_server.go
func (k msgServer) FreezeLaw(
    ctx context.Context, 
    msg *types.MsgFreezeLaw,
) (*types.MsgFreezeLawResponse, error) {
    
    sdkCtx := sdk.UnwrapSDKContext(ctx)
    
    // ONLY Justice Court can freeze law
    if !k.IsJusticeCourt(sdkCtx, msg.Authority) {
        return nil, types.ErrNotJusticeCourt
    }
    
    // Check if court order is valid
    if !k.ValidateCourtOrder(sdkCtx, msg.CourtOrderHash) {
        return nil, types.ErrInvalidCourtOrder
    }
    
    if k.IsFrozen(sdkCtx) {
        return nil, types.ErrAlreadyFrozen
    }
    
    k.SetFrozen(sdkCtx, true)
    k.SetFrozenAt(sdkCtx, sdkCtx.BlockTime())
    k.SetCourtOrder(sdkCtx, msg.CourtOrderHash)
    
    sdkCtx.EventManager().EmitEvent(
        sdk.NewEvent(
            types.EventTypeFreezeLaw,
            sdk.NewAttribute(types.AttributeKeyFrozenAt, sdkCtx.BlockTime().String()),
            sdk.NewAttribute(types.AttributeKeyCourtOrder, msg.CourtOrderHash),
            sdk.NewAttribute(types.AttributeKeyAuthority, msg.Authority),
        ),
    )
    
    return &types.MsgFreezeLawResponse{}, nil
}

// IsJusticeCourt checks if address is Supreme Court address
func (k Keeper) IsJusticeCourt(ctx sdk.Context, address string) bool {
    supremeCourt := k.GetSupremeCourtAddress(ctx)
    return address == supremeCourt
}
```

### 3.2 Justice Court Module (x/justice)

```protobuf
// proto/altan/justice/v1/justice.proto
message SupremeCourt {
  string address = 1;
  repeated Judge judges = 2;
  uint32 quorum = 3;  // Minimum judges for decision
}

message Judge {
  string id = 1;
  string name = 2;
  string address = 3;
  bool is_active = 4;
  google.protobuf.Timestamp appointed_at = 5;
}

message CourtOrder {
  string hash = 1;
  OrderType type = 2;
  string description = 3;
  repeated string judge_signatures = 4;
  google.protobuf.Timestamp issued_at = 5;
}

enum OrderType {
  FREEZE_LAW = 0;
  SUSPEND_CITIZEN = 1;
  SEIZE_ASSETS = 2;
  CONSTITUTIONAL_REVIEW = 3;
}
```

---

## 4. Annual Taxation Period

### 4.1 Tax Schedule

```yaml
Annual Tax Period:
  Start: January 1st, 00:00 UTC
  End: March 31st, 23:59 UTC (3 months)
  
Tax Rate: 10%
  - 7% → National Budget (Republic)
  - 3% → Confederation Budget
  
Applies To:
  - Annual income
  - Capital gains
  - Business profits
  - Property (land)
  
NOT Transaction Fees:
  - 0.03% network fee is ALWAYS active
  - 10% annual tax is SEPARATE system
```

### 4.2 Tax Module (x/taxation)

```protobuf
// proto/altan/taxation/v1/taxation.proto
message TaxPeriod {
  uint32 year = 1;
  google.protobuf.Timestamp start_date = 2;
  google.protobuf.Timestamp end_date = 3;
  bool is_active = 4;
}

message TaxDeclaration {
  string citizen_id = 1;
  uint32 tax_year = 2;
  string total_income = 3;
  string taxable_amount = 4;
  string tax_owed = 5;
  string tax_paid = 6;
  DeclarationStatus status = 7;
}

message TaxPayment {
  string id = 1;
  string citizen_id = 2;
  string amount = 3;
  string national_portion = 4;   // 7%
  string confederation_portion = 5;  // 3%
  google.protobuf.Timestamp paid_at = 6;
}
```

### 4.3 Tax Collection Logic

```go
// x/taxation/keeper/tax.go
func (k Keeper) CalculateTax(ctx context.Context, declaration *types.TaxDeclaration) error {
    params := k.GetParams(ctx)
    
    // 10% total tax rate
    totalTaxRate := sdk.NewDecWithPrec(10, 2) // 0.10
    
    taxableAmount, _ := sdk.NewDecFromStr(declaration.TaxableAmount)
    taxOwed := taxableAmount.Mul(totalTaxRate)
    
    // Split: 7% national, 3% confederation
    nationalPortion := taxOwed.Mul(sdk.NewDecWithPrec(70, 2))  // 70% of 10% = 7%
    confedPortion := taxOwed.Mul(sdk.NewDecWithPrec(30, 2))    // 30% of 10% = 3%
    
    declaration.TaxOwed = taxOwed.String()
    declaration.NationalPortion = nationalPortion.String()
    declaration.ConfederationPortion = confedPortion.String()
    
    return nil
}

// IsTaxPeriodActive checks if current date is within tax period
func (k Keeper) IsTaxPeriodActive(ctx context.Context) bool {
    currentTime := sdk.UnwrapSDKContext(ctx).BlockTime()
    currentYear := currentTime.Year()
    
    // Tax period: Jan 1 - Mar 31
    startDate := time.Date(currentYear, time.January, 1, 0, 0, 0, 0, time.UTC)
    endDate := time.Date(currentYear, time.March, 31, 23, 59, 59, 0, time.UTC)
    
    return currentTime.After(startDate) && currentTime.Before(endDate)
}
```

---

## 5. Updated Module List

| # | Module | Description |
|---|--------|-------------|
| 1 | x/corelaw | Constitutional law (37 articles) |
| 2 | x/citizen | Citizen registry (145M population) |
| 3 | x/arbad | Social structure (family + org) |
| 4 | x/khural | 5-level democratic governance |
| 5 | x/justice | Supreme Court & judicial orders |
| 6 | x/centralbank | Monetary policy & emission |
| 7 | x/banking | Dual banking system |
| 8 | x/taxation | Annual tax collection |

---

## 6. Genesis Parameters Update

```json
{
  "corelaw": {
    "params": {
      "network_fee_bps": 3,
      "network_fee_hard_cap": "1000000000",
      "annual_tax_rate_bps": 1000,
      "national_tax_share_bps": 7000,
      "confederation_tax_share_bps": 3000
    }
  },
  "justice": {
    "supreme_court": {
      "address": "altan1supremecourt...",
      "quorum": 5,
      "judges": []
    }
  },
  "taxation": {
    "params": {
      "tax_period_start_month": 1,
      "tax_period_start_day": 1,
      "tax_period_end_month": 3,
      "tax_period_end_day": 31,
      "enabled": true
    }
  },
  "khural": {
    "params": {
      "levels": 5,
      "arbad_size": 10,
      "zun_size": 10,
      "myangad_size": 10,
      "tumed_size": 10
    },
    "confederation": {
      "name": "Confederation Khural",
      "republic_ids": []
    }
  }
}
```

---

**Document Version**: 1.1 (Addendum)  
**Updated**: 2026-01-31  
**Changes**: Hybrid fee model, 5-level Khural, Justice Court, Annual Taxation
