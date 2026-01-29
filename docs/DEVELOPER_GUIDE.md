# Developer Guide - iNomad Platform

## 🎯 Для новых разработчиков

### Первый день

#### 1. Настройка окружения

```bash
# Установить Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Клонировать проект
git clone https://github.com/inomadinc/inomad-client.git
cd inomad-client

# Установить зависимости
cd chain
forge install

# Проверить компиляцию
forge build
```

#### 2. Запустить тесты

```bash
# Все тесты
forge test

# С подробным выводом
forge test -vvv

# Конкретный контракт
forge test --match-contract RetailMarketplace

# Конкретный тест
forge test --match-test testPayOrder
```

#### 3. Изучить структуру

```
chain/
├── contracts/
│   ├── governance/      # 4 ветви власти
│   ├── core/           # ALTAN, Wallet, Registry
│   ├── financial/      # Stock, Forex, Payment
│   └── marketplaces/   # Retail, Service, etc.
├── test/               # Foundry тесты
└── script/             # Deployment скрипты
```

---

## 📚 Ключевые концепции

### 1. Governance System

Четырёхветвевая система власти:

```solidity
// Законодательная
Legislature → Majlis + Qurultai → Proposals → Voting

// Исполнительная
Executive → Khan + Ministers → Budget → Execution

// Судебная
Judiciary → District → Regional → Supreme Court

// Надзорная
Supervisory → Investigations → Audits → Impeachment
```

### 2. Payment Flows

Все маркетплейсы используют единый PaymentGateway:

```solidity
// Создать escrow
bytes32 paymentId = paymentGateway.createEscrowPayment(
    PaymentType.RETAIL_ORDER,
    buyer,
    splits,  // Multi-party distribution
    orderId
);

// Релиз при подтверждении
paymentGateway.releasePayment(paymentId);

// Или возврат
paymentGateway.refundPayment(paymentId);
```

### 3. DPP Tracking

Digital Product Passport для трекинга:

```solidity
// Создать паспорт
bytes32 dppId = dpp.createPassport(
    identityBlock,
    complianceBlock
);

// Передать владение
dpp.transferOwnership(
    dppId,
    newOwner,
    invoiceHash,
    actHash,
    price
);
```

---

## 🔧 Development Workflow

### Создание нового контракта

1. **Добавить в `contracts/`**:
```bash
touch chain/contracts/MyContract.sol
```

2. **Базовая структура**:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MyContract {
    address public owner;
    
    error NotOwner();
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
}
```

3. **Написать тесты**:
```bash
touch chain/test/MyContract.t.sol
```

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/MyContract.sol";

contract MyContractTest is Test {
    MyContract public myContract;
    
    function setUp() public {
        myContract = new MyContract();
    }
    
    function testOwner() public {
        assertEq(myContract.owner(), address(this));
    }
}
```

4. **Компилировать и тестировать**:
```bash
forge build
forge test --match-contract MyContract -vvv
```

---

## 🧪 Testing Best Practices

### Foundry Test Patterns

```solidity
contract MyTest is Test {
    // Setup
    function setUp() public {
        // Инициализация
    }
    
    // Happy path
    function testSuccess() public {
        // Должно работать
    }
    
    // Negative cases
    function testRevertNotOwner() public {
        vm.prank(address(0xdead));
        vm.expectRevert(NotOwner.selector);
        myContract.restrictedFunction();
    }
    
    // Fuzz testing
    function testFuzz_Transfer(uint256 amount) public {
        vm.assume(amount > 0 && amount < type(uint256).max);
        // Test с случайными значениями
    }
}
```

### Полезные cheatcodes

```solidity
// Изменить msg.sender
vm.prank(alice);
contract.call();

// Изменить время
vm.warp(block.timestamp + 1 days);

// Ожидать revert
vm.expectRevert(ErrorSelector);

// Ожидать event
vm.expectEmit(true, true, false, true);
emit MyEvent(param1, param2);

// Snapshot/revert state
uint256 snapshot = vm.snapshot();
vm.revertTo(snapshot);
```

---

## 🚀 Deployment

### Local Development

```bash
# Запустить локальную ноду
anvil

# В другом терминале - deploy
forge script script/Deploy.s.sol \
    --rpc-url http://localhost:8545 \
    --broadcast
```

### Testnet Deployment

```bash
# Настроить .env
PRIVATE_KEY=your_private_key
RPC_URL=https://rpc.testnet.example

# Deploy
forge script script/Deploy.s.sol \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --broadcast \
    --verify
```

### Deployment Script Example

```solidity
// script/Deploy.s.sol
contract DeployScript is Script {
    function run() external {
        vm.startBroadcast();
        
        // 1. Core
        Altan altan = new Altan();
        
        // 2. Infrastructure
        DigitalProductPassport dpp = new DigitalProductPassport();
        
        // 3. Payment
        AltanPaymentGateway gateway = new AltanPaymentGateway(
            address(altan)
        );
        
        // 4. Marketplaces
        RetailMarketplace retail = new RetailMarketplace();
        retail.setPaymentGateway(address(gateway));
        retail.setDpp(address(dpp));
        
        vm.stopBroadcast();
    }
}
```

---

## 🔍 Debugging

### Forge Debug

```bash
# Debug конкретную транзакцию
forge debug --debug <TX_HASH>

# Debug test
forge test --debug testMyFunction
```

### Gas Profiling

```bash
# Gas report
forge test --gas-report

# Specific contract
forge test --gas-report --match-contract MyContract
```

### Trace Calls

```bash
forge test -vvvv  # Full traces
```

---

## 📝 Code Style

### Naming Conventions

```solidity
// Contracts: PascalCase
contract RetailMarketplace {}

// Functions: camelCase
function createOrder() {}

// Variables: camelCase
uint256 totalSupply;

// Constants: UPPER_CASE
uint256 constant MAX_SUPPLY = 1000000;

// Internal/Private: _prefix
function _internalHelper() internal {}

// Events: PascalCase
event OrderCreated(bytes32 indexed orderId);

// Errors: PascalCase
error InsufficientBalance();
```

### Documentation

```solidity
/**
 * @notice User-facing description
 * @dev Developer notes
 * @param orderId The ID of the order
 * @return success Whether the operation succeeded
 */
function processOrder(bytes32 orderId) 
    external 
    returns (bool success) 
{
    // Implementation
}
```

---

## 🛡️ Security Checklist

### Before Committing

- [ ] Reentrancy guards на external calls
- [ ] Access control (onlyOwner, roles)
- [ ] Input validation
- [ ] Overflow/underflow checks (или SafeMath)
- [ ] Gas optimization
- [ ] Event emissions
- [ ] Error handling
- [ ] Tests написаны
- [ ] Tests passing
- [ ] Documentation updated

### Common Vulnerabilities

```solidity
// ❌ BAD: Reentrancy
function withdraw() external {
    uint256 amount = balances[msg.sender];
    msg.sender.call{value: amount}("");  // Attacker re-enters
    balances[msg.sender] = 0;
}

// ✅ GOOD: Checks-Effects-Interactions
function withdraw() external {
    uint256 amount = balances[msg.sender];
    balances[msg.sender] = 0;  // Effect first
    msg.sender.call{value: amount}("");  // Interaction last
}

// OR use ReentrancyGuard
function withdraw() external nonReentrant {
    // Safe
}
```

---

## 🔗 Integration

### Connecting Contracts

```solidity
contract Marketplace {
    IAltanPaymentGateway public paymentGateway;
    IDigitalProductPassport public dpp;
    
    function setPaymentGateway(address _gateway) external onlyOwner {
        paymentGateway = IAltanPaymentGateway(_gateway);
    }
    
    function createOrder() external {
        // Use interfaces
        bytes32 paymentId = paymentGateway.createEscrowPayment(...);
        dpp.blockPassport(dppId, "Order in progress");
    }
}
```

### Event Listening (Off-chain)

```typescript
// ethers.js example
const contract = new ethers.Contract(address, abi, provider);

contract.on("OrderCreated", (orderId, buyer, seller, event) => {
    console.log(`New order: ${orderId}`);
    // Process event
});
```

---

## 📊 Performance Tips

### Gas Optimization

```solidity
// ❌ Expensive: SLOAD every iteration
for (uint i = 0; i < array.length; i++) {
    process(array[i]);
}

// ✅ Cheaper: Cache length
uint256 len = array.length;
for (uint i = 0; i < len; i++) {
    process(array[i]);
}

// ✅ Even better: Use unchecked
uint256 len = array.length;
for (uint i = 0; i < len;) {
    process(array[i]);
    unchecked { ++i; }
}
```

```solidity
// ❌ Expensive: Multiple SSTOREs
function update(uint256 a, uint256 b) external {
    state.a = a;  // SSTORE
    state.b = b;  // SSTORE
}

// ✅ Cheaper: Pack variables
struct State {
    uint128 a;
    uint128 b;
}
// Both fit in one slot = one SSTORE
```

---

## 🤝 Contributing

### Pull Request Process

1. **Branch от `main`**:
```bash
git checkout -b feature/my-feature
```

2. **Make changes & test**:
```bash
forge test
```

3. **Commit**:
```bash
git add .
git commit -m "feat: Add new marketplace feature"
```

4. **Push & PR**:
```bash
git push origin feature/my-feature
# Create PR on GitHub
```

### Commit Message Format

```
<type>: <description>

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `test`: Tests
- `refactor`: Code refactoring
- `chore`: Maintenance

---

## 📞 Need Help?

- **Discord**: [iNomad Developers](https://discord.gg/inomad-dev)
- **Docs**: [docs.inomad.io](https://docs.inomad.io)
- **Issues**: [GitHub Issues](https://github.com/inomadinc/inomad-client/issues)

---

## 🔗 Useful Links

- **Foundry Book**: https://book.getfoundry.sh/
- **Solidity Docs**: https://docs.soliditylang.org/
- **OpenZeppelin**: https://docs.openzeppelin.com/
- **Etherscan**: https://etherscan.io/
