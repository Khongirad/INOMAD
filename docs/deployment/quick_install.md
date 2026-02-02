# ALTAN L1 - Quick Install Commands

**Status**: 🟡 Manual installation required (password needed)

---

## ✅ Completed
- [x] Project directory created: `~/blockchain/altan/`

---

## 📋 Next Steps (Copy-Paste These Commands)

### Step 1: Install Homebrew (1 command)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**⚠️ This will ask for your password** - это нормально, введите пароль.

После установки, добавьте Homebrew в PATH:

```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

Проверка:
```bash
brew --version
```

---

### Step 2: Install Go (1 command)

```bash
brew install go
```

Настройка Go:
```bash
echo 'export GOPATH=$HOME/go' >> ~/.zshrc
echo 'export PATH=$PATH:$GOPATH/bin' >> ~/.zshrc
source ~/.zshrc
```

Проверка:
```bash
go version
# Должно показать: go version go1.23.x darwin/arm64
```

---

### Step 3: Install Ignite CLI (1 command)

```bash
curl https://get.ignite.com/cli! | bash
```

Добавить в PATH (если нужно):
```bash
sudo mv ignite /usr/local/bin/
```

Проверка:
```bash
ignite version
# Должно показать версию
```

---

### Step 4: Initialize ALTAN Chain

```bash
cd ~/blockchain/altan
ignite scaffold chain altan --no-module
```

Это создаст:
- `app/` - основная структура приложения
- `cmd/` - CLI binary
- `proto/` - protobuf файлы
- `x/` - кастомные модули (пока пусто)
- `config.yml` - конфигурация Ignite

---

### Step 5: First Build

```bash
cd ~/blockchain/altan
ignite chain build
```

Если успешно, вы увидите:
```
✓ Building...
✓ Binary built successfully
```

---

### Step 6: Configure ALTAN Parameters

```bash
cd ~/blockchain/altan

cat > config.yml << 'EOF'
version: 1

accounts:
  - name: alice
    coins:
      - 10000000000000000ualtan
  - name: bob
    coins:
      - 1000000000000000ualtan

validators:
  - name: alice
    bonded: 1000000000000ualtan

client:
  vuex:
    path: vue/src/store
  
faucet:
  name: alice
  coins:
    - 100000000ualtan
  
genesis:
  chain_id: altan-testnet-1
  
  app_state:
    staking:
      params:
        bond_denom: ualtan
        max_validators: 100
        unbonding_time: "1814400s"
    
    bank:
      denom_metadata:
        - description: "Native token of ALTAN Confederation"
          denom_units:
            - denom: ualtan
              exponent: 0
              aliases: ["microaltan"]
            - denom: altan
              exponent: 6
          base: ualtan
          display: altan
          name: ALTAN
          symbol: ALTAN
      
      supply:
        - denom: ualtan
          amount: "11000000000000000"
EOF
```

---

### Step 7: Run Local Testnet

```bash
cd ~/blockchain/altan
ignite chain serve
```

Вы должны увидеть:
```
🌍 Tendermint node: http://0.0.0.0:26657
🌍 API server: http://0.0.0.0:1317
🌍 Token faucet: http://0.0.0.0:4500
```

**🎉 УСПЕХ!** Если вы видите это, у вас работает ALTAN blockchain!

---

### Step 8: Test Your Chain (в новом терминале)

```bash
# Проверить статус
altand status

# Проверить баланс Alice
altand query bank balances $(altand keys show alice -a)

# Перевести токены
altand tx bank send alice $(altand keys show bob -a) 1000000ualtan \
  --chain-id altan-testnet-1 \
  --yes

# Проверить баланс Bob (через 6 секунд)
altand query bank balances $(altand keys show bob -a)
```

---

## 🔥 Quick Copy-Paste Script (Все в одном)

Если хотите всё сразу (после установки Homebrew):

```bash
# Install dependencies
brew install go
curl https://get.ignite.com/cli! | bash
sudo mv ignite /usr/local/bin/

# Setup Go env
echo 'export GOPATH=$HOME/go' >> ~/.zshrc
echo 'export PATH=$PATH:$GOPATH/bin' >> ~/.zshrc
source ~/.zshrc

# Verify
go version
ignite version

# Create ALTAN chain
cd ~/blockchain/altan
ignite scaffold chain altan --no-module
cd altan

# Build
ignite chain build

# Run
ignite chain serve
```

---

## ⚠️ Troubleshooting

### "ignite: command not found"
```bash
sudo mv ~/ignite /usr/local/bin/
# или
echo 'export PATH=$PATH:$HOME' >> ~/.zshrc
```

### "go: command not found после brew install"
```bash
eval "$(/opt/homebrew/bin/brew shellenv)"
source ~/.zshrc
```

### "Port 26657 already in use"
```bash
lsof -ti:26657 | xargs kill -9
```

---

## 📞 Когда Вернуться

Вернитесь сюда после:
1. ✅ `brew --version` работает
2. ✅ `go version` работает  
3. ✅ `ignite version` работает
4. ✅ `ignite chain serve` запустился

Тогда я продолжу с созданием x/corelaw модуля!

---

**Время**: ~30-60 минут  
**Сложность**: Легко (просто copy-paste)
