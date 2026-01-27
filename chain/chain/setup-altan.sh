set -euo pipefail

ROOT="$(pwd)"
CHAIN="$ROOT/chain"

if [ ! -d "$CHAIN" ]; then
  echo "Не найдена папка ./chain. Создай её или перейди в корень проекта."
  exit 1
fi

mkdir -p "$CHAIN/contracts" "$CHAIN/scripts"

# 1) package.json (ESM) + зависимости
if [ ! -f "$CHAIN/package.json" ]; then
  cat > "$CHAIN/package.json" <<'JSON'
{
  "name": "inomad-chain",
  "private": true,
  "type": "module",
  "scripts": {
    "compile": "hardhat compile",
    "node": "hardhat node",
    "deploy": "hardhat run scripts/deploy.js --network localhost",
    "demo:ten": "hardhat run scripts/demo-ten.js --network localhost"
  },
  "devDependencies": {
    "hardhat": "^3.0.0",
    "@nomicfoundation/hardhat-ethers": "^3.0.0",
    "ethers": "^6.13.4",
    "@openzeppelin/contracts": "^5.0.2"
  }
}
JSON
fi

# 2) hardhat.config.js (ESM)
cat > "$CHAIN/hardhat.config.js" <<'JS'
import "@nomicfoundation/hardhat-ethers";

/** @type {import("hardhat/config").HardhatUserConfig} */
export default {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 }
    }
  },
  networks: {
    localhost: { url: "http://127.0.0.1:8545" }
  }
};
JS

# 3) SeatSBT.sol
cat > "$CHAIN/contracts/SeatSBT.sol" <<'SOL'
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * SeatSBT = "цифровой гражданин" (Soulbound)
 * - не передается
 * - хранит статус
 * - хранит привязанный SeatAccount (смарт-кошелек)
 */
contract SeatSBT is ERC721, AccessControl {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    enum Status {
        Draft,
        Verified10,
        VerifiedMarriage,
        Citizen
    }

    uint256 public nextId = 1;

    mapping(uint256 => Status) public statusOf;
    mapping(uint256 => address) public accountOf; // seatId -> SeatAccount

    constructor() ERC721("INOMAD Seat", "SEAT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(REGISTRAR_ROLE, msg.sender);
    }

    function mintSeat(address to) external onlyRole(REGISTRAR_ROLE) returns (uint256 seatId) {
        seatId = nextId++;
        _safeMint(to, seatId);
        statusOf[seatId] = Status.Draft;
    }

    function setStatus(uint256 seatId, Status s) external onlyRole(REGISTRAR_ROLE) {
        require(_ownerOf(seatId) != address(0), "Seat: nonexistent");
        statusOf[seatId] = s;
    }

    function setAccount(uint256 seatId, address seatAccount) external onlyRole(REGISTRAR_ROLE) {
        require(_ownerOf(seatId) != address(0), "Seat: nonexistent");
        accountOf[seatId] = seatAccount;
    }

    function isCitizen(uint256 seatId) external view returns (bool) {
        return statusOf[seatId] == Status.Citizen;
    }

    // Soulbound: запрещаем трансферы
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address from)
    {
        from = _ownerOf(tokenId);
        // разрешаем mint (from == 0) и burn (to == 0), но запрещаем обычный transfer
        if (from != address(0) && to != address(0)) revert("SeatSBT: non-transferable");
        return super._update(to, tokenId, auth);
    }
}
SOL

# 4) SeatAccount.sol + Factory
cat > "$CHAIN/contracts/SeatAccount.sol" <<'SOL'
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";

/**
 * Наивный смарт-кошелек:
 * - привязан к seatId (SeatSBT)
 * - controller = EOA (на MVP)
 * Позже controller заменяем на Passkey/WebAuthn или AA.
 */
contract SeatAccount {
    using Address for address;

    address public immutable seatSbt;
    uint256 public immutable seatId;

    address public controller; // MVP: EOA

    error NotAuthorized();

    constructor(address _seatSbt, uint256 _seatId, address _controller) {
        seatSbt = _seatSbt;
        seatId = _seatId;
        controller = _controller;
    }

    modifier onlySeatOwnerOrController() {
        address seatOwner = IERC721(seatSbt).ownerOf(seatId);
        if (msg.sender != controller && msg.sender != seatOwner) revert NotAuthorized();
        _;
    }

    function setController(address newController) external onlySeatOwnerOrController {
        controller = newController;
    }

    function execute(address to, uint256 value, bytes calldata data)
        external
        onlySeatOwnerOrController
        returns (bytes memory)
    {
        return to.functionCallWithValue(data, value);
    }

    receive() external payable {}
}

contract SeatAccountFactory {
    event AccountCreated(uint256 indexed seatId, address account, address controller, bytes32 salt);

    address public immutable seatSbt;

    constructor(address _seatSbt) {
        seatSbt = _seatSbt;
    }

    function predictAddress(uint256 seatId, address controller, bytes32 salt) public view returns (address) {
        bytes memory bytecode = abi.encodePacked(
            type(SeatAccount).creationCode,
            abi.encode(seatSbt, seatId, controller)
        );
        bytes32 codeHash = keccak256(bytecode);
        return address(uint160(uint256(keccak256(abi.encodePacked(
            bytes1(0xff), address(this), salt, codeHash
        )))));
    }

    function createAccount(uint256 seatId, address controller, bytes32 salt) external returns (address account) {
        bytes memory bytecode = abi.encodePacked(
            type(SeatAccount).creationCode,
            abi.encode(seatSbt, seatId, controller)
        );
        assembly {
            account := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
            if iszero(account) { revert(0, 0) }
        }
        emit AccountCreated(seatId, account, controller, salt);
    }
}
SOL

# 5) Altan.sol
cat > "$CHAIN/contracts/Altan.sol" <<'SOL'
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract Altan is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor() ERC20("Altan", "ALTAN") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
}
SOL

# 6) CentralBank.sol
cat > "$CHAIN/contracts/CentralBank.sol" <<'SOL'
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./Altan.sol";

contract CentralBank is AccessControl {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    Altan public immutable altan;

    // политика (можно менять)
    uint256 public tenRewardPerSeat = 100 ether; // 100 ALTAN на seat после подтверждения десятки

    constructor(address altanToken) {
        altan = Altan(altanToken);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(REGISTRAR_ROLE, msg.sender);
    }

    function setTenRewardPerSeat(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        tenRewardPerSeat = amount;
    }

    function issue(address to, uint256 amount) external onlyRole(REGISTRAR_ROLE) {
        altan.mint(to, amount);
    }
}
SOL

# 7) TenRegistry.sol
cat > "$CHAIN/contracts/TenRegistry.sol" <<'SOL'
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";

import "./SeatSBT.sol";
import "./SeatAccount.sol";
import "./CentralBank.sol";

contract TenRegistry is AccessControl {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    SeatSBT public immutable seat;
    SeatAccountFactory public immutable factory;
    CentralBank public immutable bank;

    struct Ten {
        uint256[10] seats;
        bool approved;
        address proposer;
    }

    Ten[] public tens;

    event TenProposed(uint256 indexed tenId, address indexed proposer);
    event TenApproved(uint256 indexed tenId);

    constructor(address seatSbt, address seatAccountFactory, address centralBank) {
        seat = SeatSBT(seatSbt);
        factory = SeatAccountFactory(seatAccountFactory);
        bank = CentralBank(centralBank);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(REGISTRAR_ROLE, msg.sender);
    }

    function proposeTen(uint256[10] calldata seatIds) external returns (uint256 tenId) {
        // на MVP: проверка минимальная — что seat существует
        for (uint256 i = 0; i < 10; i++) {
            require(IERC721(address(seat)).ownerOf(seatIds[i]) != address(0), "Seat nonexistent");
        }

        tens.push(Ten({
            seats: seatIds,
            approved: false,
            proposer: msg.sender
        }));

        tenId = tens.length - 1;
        emit TenProposed(tenId, msg.sender);
    }

    function approveTen(uint256 tenId) external onlyRole(REGISTRAR_ROLE) {
        Ten storage t = tens[tenId];
        require(!t.approved, "Already approved");

        for (uint256 i = 0; i < 10; i++) {
            uint256 seatId = t.seats[i];
            address owner = IERC721(address(seat)).ownerOf(seatId);

            // 1) создаем SeatAccount если нет
            address acc = seat.accountOf(seatId);
            if (acc == address(0)) {
                // salt = keccak256(seatId) (детерминированно)
                bytes32 salt = keccak256(abi.encodePacked("SEAT_ACCOUNT", seatId));
                acc = factory.createAccount(seatId, owner, salt);
                seat.setAccount(seatId, acc);
            }

            // 2) ставим статус Verified10
            seat.setStatus(seatId, SeatSBT.Status.Verified10);

            // 3) начисляем ALTAN на SeatAccount
            bank.issue(acc, bank.tenRewardPerSeat());
        }

        t.approved = true;
        emit TenApproved(tenId);
    }

    function count() external view returns (uint256) {
        return tens.length;
    }
}
SOL

# 8) deploy.js
cat > "$CHAIN/scripts/deploy.js" <<'JS'
import fs from "node:fs";
import path from "node:path";
import { ethers } from "hardhat";

function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
}

async function main() {
  const [deployer] = await ethers.getSigners();

  const SeatSBT = await ethers.getContractFactory("SeatSBT");
  const seat = await SeatSBT.deploy();
  await seat.waitForDeployment();

  const SeatAccountFactory = await ethers.getContractFactory("SeatAccountFactory");
  const factory = await SeatAccountFactory.deploy(await seat.getAddress());
  await factory.waitForDeployment();

  const Altan = await ethers.getContractFactory("Altan");
  const altan = await Altan.deploy();
  await altan.waitForDeployment();

  const CentralBank = await ethers.getContractFactory("CentralBank");
  const bank = await CentralBank.deploy(await altan.getAddress());
  await bank.waitForDeployment();

  // даем банку право минтить ALTAN
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  await (await altan.grantRole(MINTER_ROLE, await bank.getAddress())).wait();

  const TenRegistry = await ethers.getContractFactory("TenRegistry");
  const ten = await TenRegistry.deploy(
    await seat.getAddress(),
    await factory.getAddress(),
    await bank.getAddress()
  );
  await ten.waitForDeployment();

  // даем TenRegistry роль REGISTRAR в SeatSBT и CentralBank
  const REGISTRAR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REGISTRAR_ROLE"));
  await (await seat.grantRole(REGISTRAR_ROLE, await ten.getAddress())).wait();
  await (await bank.grantRole(REGISTRAR_ROLE, await ten.getAddress())).wait();

  const out = {
    deployer: deployer.address,
    SeatSBT: await seat.getAddress(),
    SeatAccountFactory: await factory.getAddress(),
    Altan: await altan.getAddress(),
    CentralBank: await bank.getAddress(),
    TenRegistry: await ten.getAddress()
  };

  const outPath = path.join(process.cwd(), "addresses.json");
  writeJson(outPath, out);

  console.log("Deployed:");
  console.log(out);
  console.log("Wrote", outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
JS

# 9) demo-ten.js (создаем 10 Seat и подтверждаем десятку)
cat > "$CHAIN/scripts/demo-ten.js" <<'JS'
import fs from "node:fs";
import { ethers } from "hardhat";

function readAddresses() {
  return JSON.parse(fs.readFileSync(new URL("../addresses.json", import.meta.url)));
}

async function main() {
  const addrs = readAddresses();
  const signers = await ethers.getSigners();

  const seat = await ethers.getContractAt("SeatSBT", addrs.SeatSBT);
  const altan = await ethers.getContractAt("Altan", addrs.Altan);
  const ten = await ethers.getContractAt("TenRegistry", addrs.TenRegistry);

  // МИНТ 10 seat на первые 10 аккаунтов
  const seatIds = [];
  for (let i = 0; i < 10; i++) {
    const to = signers[i].address;
    const tx = await seat.mintSeat(to);
    const rc = await tx.wait();
    // seatId = nextId-1; проще читать nextId после минта
    const nextId = await seat.nextId();
    const seatId = Number(nextId) - 1;
    seatIds.push(seatId);
  }

  console.log("Minted seatIds:", seatIds);

  // propose ten
  const arr10 = seatIds; // length 10
  const proposeTx = await ten.proposeTen(arr10);
  await proposeTx.wait();

  const tenId = (await ten.count()) - 1n;
  console.log("Proposed tenId:", tenId.toString());

  // approve ten (REGISTRAR) — у нас deployer имеет роль, ten сам тоже REGISTRAR по контракту
  const approveTx = await ten.approveTen(tenId);
  await approveTx.wait();
  console.log("Approved tenId:", tenId.toString());

  // Проверка: у каждого seat появился account + баланс ALTAN на account
  for (let i = 0; i < 10; i++) {
    const seatId = seatIds[i];
    const acc = await seat.accountOf(seatId);
    const st = await seat.statusOf(seatId);
    const bal = await altan.balanceOf(acc);
    console.log(`seat#${seatId} status=${st} account=${acc} ALTAN=${ethers.formatEther(bal)}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
JS

echo "==> Installing deps in ./chain"
cd "$CHAIN"
npm install

echo "==> Compile"
npx hardhat compile

echo "OK. Дальше: в одном терминале 'cd chain && npx hardhat node', в другом 'cd chain && npm run deploy', затем 'cd chain && npm run demo:ten'."
