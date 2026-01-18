// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISeatSBT {
    function mintSeat(address to, uint256 seatId, uint32 cohortArbanId, uint16 competencyFlags) external;
    function exists(uint256 seatId) external view returns (bool);
}

interface IAltanWalletRegistry {
    function createWallet(uint256 seatId) external returns (address);
}


/**
 * ВАЖНО:
 * В вашем проекте уже есть ConstitutionAcceptanceRegistry.sol.
 * Здесь интерфейс сделан минимальным. Если у вас функция называется иначе —
 * просто переименуйте в interface ниже под фактическую сигнатуру.
 */
interface IConstitutionAcceptanceRegistry {
    function hasAccepted(address who) external view returns (bool);
}

/**
 * ActivationRegistry (опционально):
 * Если у вас будет функция "setInitialLocked" — CitizenRegistry вызовет её.
 * Если нет — статус LOCKED и так дефолтный (0) в нашем ActivationRegistry.
 */
interface IActivationRegistryOptional {
    // recommended optional hook:
    // function setInitialLocked(uint256 seatId, bytes32 reasonDoc) external;
}

/**
 * CitizenRegistry = issuer SeatSBT
 * - mint SeatSBT только если гражданин принял Конституцию (acceptance)
 * - SeatSBT НЕИЗЫМАЕМАЯ: тут нет revoke/burn логики
 * - По умолчанию статус правоспособности должен быть LOCKED (ActivationRegistry)
 * - Политические атрибуты фиксируются на уровне реестра (не в SeatSBT)
 */
contract CitizenRegistry {

    /* ===================== Errors ===================== */
    error NotOwner();
    error ZeroAddress();
    error NotAcceptedConstitution();
    error AlreadyHasSeat();
    error SeatAlreadyExists();
    error WalletRegistryAlreadySet();
    error WalletRegistryNotSet();

    /* ===================== Owner (MVP) ===================== */
    address public owner;
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    /* ===================== Dependencies ===================== */
    ISeatSBT public seatSbt; // set once after deployment (или передайте в ctor если порядок позволяет)
    IAltanWalletRegistry public walletRegistry; // set once after deployment
    IConstitutionAcceptanceRegistry public immutable acceptance;
    address public activationRegistry; // optional hook target

    /* ===================== Seat bookkeeping ===================== */
    uint256 public nextSeatId = 1;
    mapping(address => uint256) public seatOf;     // one human -> one seatId
    mapping(uint256 => address) public ownerOfSeat; // seatId -> human

    /* ===================== Political metadata ===================== */
    struct CitizenMeta {
        uint32 cohort_arban_id;
        uint16 civ;
        uint16 dom;
        uint16 exp;
        bytes32 ethics_hash;
        bool exists;
    }
    mapping(uint256 => CitizenMeta) public metaOf; // seatId -> meta

    /* ===================== Events ===================== */
    event OwnerChanged(address indexed oldOwner, address indexed newOwner);
    event SeatSBTSet(address indexed seatSbt);
    event WalletRegistrySet(address indexed walletRegistry);
    event ActivationRegistrySet(address indexed activationRegistry);
    event CitizenMinted(address indexed citizen, uint256 indexed seatId, uint32 cohortArbanId, bytes32 ethicsHash);
    event InitialLockHookCalled(uint256 indexed seatId, bool ok);

    constructor(address acceptanceRegistry_) {
        if (acceptanceRegistry_ == address(0)) revert ZeroAddress();
        owner = msg.sender;
        acceptance = IConstitutionAcceptanceRegistry(acceptanceRegistry_);
        emit OwnerChanged(address(0), msg.sender);
    }

    /* ===================== Admin wiring ===================== */

    function setSeatSBT(address seatSbt_) external onlyOwner {
        if (seatSbt_ == address(0)) revert ZeroAddress();
        // set-once (чтобы issuer никогда не подменили)
        require(address(seatSbt) == address(0), "SEAT_SBT_ALREADY_SET");
        seatSbt = ISeatSBT(seatSbt_);
        emit SeatSBTSet(seatSbt_);
    }

    function setWalletRegistry(address walletRegistry_) external onlyOwner {
        if (walletRegistry_ == address(0)) revert ZeroAddress();
        if (address(walletRegistry) != address(0)) revert WalletRegistryAlreadySet();
        walletRegistry = IAltanWalletRegistry(walletRegistry_);
        emit WalletRegistrySet(walletRegistry_);
    }


    function setActivationRegistry(address activationRegistry_) external onlyOwner {
        // optional, can be zero
        activationRegistry = activationRegistry_;
        emit ActivationRegistrySet(activationRegistry_);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnerChanged(owner, newOwner);
        owner = newOwner;
    }

    /* ===================== Core issuance ===================== */

    /**
     * Self-registration:
     * 1) требует принятия Конституции (acceptance)
     * 2) mint SeatSBT (неизымаемо)
     * 3) записывает политические атрибуты
     * 4) (опционально) дергает ActivationRegistry.setInitialLocked(seatId, reasonDoc)
     *
     * reasonDoc: хеш документа основания (заявление, доказательства, офчейн KYC, протокол арбана и т.д.)
     */
    function registerSelf(
        uint32 cohortArbanId,
        uint16 civ,
        uint16 dom,
        uint16 exp,
        bytes32 ethicsHash,
        bytes32 reasonDoc
    ) external returns (uint256 seatId) {
        if (address(seatSbt) == address(0)) revert ZeroAddress();
        if (!acceptance.hasAccepted(msg.sender)) revert NotAcceptedConstitution();

        if (seatOf[msg.sender] != 0) revert AlreadyHasSeat();

        seatId = nextSeatId++;
        // extra safety
        if (seatSbt.exists(seatId)) revert SeatAlreadyExists();

        seatSbt.mintSeat(msg.sender, seatId, cohortArbanId, 3);
        if (address(walletRegistry) == address(0)) revert WalletRegistryNotSet();
        walletRegistry.createWallet(seatId);

        seatOf[msg.sender] = seatId;
        ownerOfSeat[seatId] = msg.sender;

        metaOf[seatId] = CitizenMeta({
            cohort_arban_id: cohortArbanId,
            civ: civ,
            dom: dom,
            exp: exp,
            ethics_hash: ethicsHash,
            exists: true
        });

        emit CitizenMinted(msg.sender, seatId, cohortArbanId, ethicsHash);

        _tryInitialLockHook(seatId, reasonDoc);
    }

    /**
     * Admin issuance (на MVP полезно для первичной загрузки граждан).
     * Конституционное требование acceptance сохраняется: гражданин обязан принять Конституцию.
     */
    function registerByOwner(
        address citizen,
        uint32 cohortArbanId,
        uint16 civ,
        uint16 dom,
        uint16 exp,
        bytes32 ethicsHash,
        bytes32 reasonDoc
    ) external onlyOwner returns (uint256 seatId) {
        if (citizen == address(0)) revert ZeroAddress();
        if (address(seatSbt) == address(0)) revert ZeroAddress();
        if (!acceptance.hasAccepted(citizen)) revert NotAcceptedConstitution();
        if (seatOf[citizen] != 0) revert AlreadyHasSeat();

        seatId = nextSeatId++;
        if (seatSbt.exists(seatId)) revert SeatAlreadyExists();

        seatSbt.mintSeat(citizen, seatId, cohortArbanId, 3);
        if (address(walletRegistry) == address(0)) revert WalletRegistryNotSet();
        walletRegistry.createWallet(seatId);

        seatOf[citizen] = seatId;
        ownerOfSeat[seatId] = citizen;

        metaOf[seatId] = CitizenMeta({
            cohort_arban_id: cohortArbanId,
            civ: civ,
            dom: dom,
            exp: exp,
            ethics_hash: ethicsHash,
            exists: true
        });

        emit CitizenMinted(citizen, seatId, cohortArbanId, ethicsHash);

        _tryInitialLockHook(seatId, reasonDoc);
    }

    /* ===================== Optional ActivationRegistry hook ===================== */

    /**
     * Если ActivationRegistry поддерживает функцию:
     *   setInitialLocked(uint256 seatId, bytes32 reasonDoc)
     * то мы её вызовем.
     *
     * Если не поддерживает — ничего страшного: LOCKED должен быть дефолтом (0).
     */
    function _tryInitialLockHook(uint256 seatId, bytes32 reasonDoc) internal {
        if (activationRegistry == address(0)) return;

        (bool ok, ) = activationRegistry.call(
            abi.encodeWithSignature("setInitialLocked(uint256,bytes32)", seatId, reasonDoc)
        );

        emit InitialLockHookCalled(seatId, ok);
    }
}
