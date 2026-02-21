// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {NationRegistry} from "./NationRegistry.sol";
import {CoreLaw} from "./CoreLaw.sol";

interface ISeatSBTIssuer {
    function mintSeat(address to, uint256 seatId, uint32 cohortArbanId, uint16 competencyFlags) external;
    function exists(uint256 seatId) external view returns (bool);
}

interface IAltanWalletRegistryIssuer {
    function createWallet(uint256 seatId) external returns (address);
}

interface IConstitutionAcceptanceRegistry {
    function hasAccepted(address who) external view returns (bool);
}

interface IVerificationJustice {
    function canVerify(address verifier) external view returns (bool);
    function recordVerification(address verifier, uint256 seatId) external;
}

interface IVerificationLimits {
    function canVerifyToday(address verifier) external view returns (bool);
    function recordVerification(address verifier) external;
}

/**
 * @title CitizenRegistry
 * @notice Реестр граждан Сибирской Конфедерации
 * @dev Отвечает за:
 * 1. Регистрацию граждан (1 Человек = 1 SeatSBT)
 * 2. Привязку к Нации (NationRegistry)
 * 3. Хранение политических метаданных (Арбан, Зун и т.д.)
 * 4. Создание AltanWallet (через WalletRegistry)
 * 5. Tracking кто кого верифицировал (прозрачность)
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
    error NationNotFound();
    error NationNotActive();
    error InvalidArbanSize();
    error VerifierSuspended();
    error DailyLimitExceeded();
    error NotAuthorizedVerifier();

    /* ===================== Owner (MVP) ===================== */
    address public owner;
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    /* ===================== Dependencies ===================== */
    ISeatSBTIssuer public seatSbt; 
    IAltanWalletRegistryIssuer public walletRegistry;
    IConstitutionAcceptanceRegistry public immutable acceptance;
    NationRegistry public immutable nationRegistry;
    CoreLaw public immutable coreLaw;
    
    // Verification system integration
    IVerificationJustice public verificationJustice;
    IVerificationLimits public verificationLimits;
    
    address public activationRegistry; // optional hook target

    /* ===================== Seat bookkeeping ===================== */
    uint256 public nextSeatId = 1;
    mapping(address => uint256) public seatOf;     // one human -> one seatId
    mapping(uint256 => address) public ownerOfSeat; // seatId -> human
    
    // VERIFICATION CHAIN TRANSPARENCY
    mapping(uint256 => address) public verifiedBy;  // seatId -> verifier address
    mapping(uint256 => uint256) public verifiedAt;  // seatId -> timestamp

    /* ===================== Political metadata ===================== */
    struct CitizenMeta {
        bytes32 nationId;      // Принадлежность к народу
        uint32 cohort_arban_id; // ID Арбана (первичной общины)
        uint16 civ;            // Гражданский рейтинг (Civitas)
        uint16 dom;            // Доминион (владения)
        uint16 exp;            // Опыт (Experience)
        bytes32 ethics_hash;   // Хеш этического профиля
        bool exists;
    }
    mapping(uint256 => CitizenMeta) public metaOf; // seatId -> meta

    /* ===================== Events ===================== */
    event OwnerChanged(address indexed oldOwner, address indexed newOwner);
    event SeatSBTSet(address indexed seatSbt);
    event WalletRegistrySet(address indexed walletRegistry);
    event ActivationRegistrySet(address indexed activationRegistry);
    event CitizenMinted(address indexed citizen, uint256 indexed seatId, bytes32 indexed nationId, uint32 cohortArbanId);
    event InitialLockHookCalled(uint256 indexed seatId, bool ok);

    constructor(
        address acceptanceRegistry_,
        address nationRegistry_,
        address coreLaw_
    ) {
        if (acceptanceRegistry_ == address(0)) revert ZeroAddress();
        if (nationRegistry_ == address(0)) revert ZeroAddress();
        if (coreLaw_ == address(0)) revert ZeroAddress();
        
        owner = msg.sender;
        acceptance = IConstitutionAcceptanceRegistry(acceptanceRegistry_);
        nationRegistry = NationRegistry(nationRegistry_);
        coreLaw = CoreLaw(coreLaw_);
        
        emit OwnerChanged(address(0), msg.sender);
    }

    /* ===================== Admin wiring ===================== */

    function setSeatSBT(address seatSbt_) external onlyOwner {
        if (seatSbt_ == address(0)) revert ZeroAddress();
        // set-once (чтобы issuer никогда не подменили)
        require(address(seatSbt) == address(0), "SEAT_SBT_ALREADY_SET");
        seatSbt = ISeatSBTIssuer(seatSbt_);
        emit SeatSBTSet(seatSbt_);
    }

    function setWalletRegistry(address walletRegistry_) external onlyOwner {
        if (walletRegistry_ == address(0)) revert ZeroAddress();
        if (address(walletRegistry) != address(0)) revert WalletRegistryAlreadySet();
        walletRegistry = IAltanWalletRegistryIssuer(walletRegistry_);
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
    
    function setVerificationJustice(address justice_) external onlyOwner {
        verificationJustice = IVerificationJustice(justice_);
    }
    
    function setVerificationLimits(address limits_) external onlyOwner {
        verificationLimits = IVerificationLimits(limits_);
    }

    /* ===================== Core issuance ===================== */

    /**
     * Self-registration:
     * 1) требует принятия Конституции (acceptance)
     * 2) проверяет существование NationId
     * 3) mint SeatSBT (неизымаемо)
     * 4) создаёт AltanWallet
     * 5) (опционально) дергает ActivationRegistry
     */
    function registerSelf(
        bytes32 nationId,
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

        // Проверка нации
        try nationRegistry.getNation(nationId) returns (NationRegistry.Nation memory nation) {
            if (!nation.active) revert NationNotActive();
        } catch {
            revert NationNotFound();
        }

        seatId = nextSeatId++;
        // extra safety
        if (seatSbt.exists(seatId)) revert SeatAlreadyExists();

        // Mint SeatSBT (Soulbound Token)
        seatSbt.mintSeat(msg.sender, seatId, cohortArbanId, 3);
        
        // Create Sovereign Wallet
        if (address(walletRegistry) == address(0)) revert WalletRegistryNotSet();
        walletRegistry.createWallet(seatId);

        seatOf[msg.sender] = seatId;
        ownerOfSeat[seatId] = msg.sender;

        metaOf[seatId] = CitizenMeta({
            nationId: nationId,
            cohort_arban_id: cohortArbanId,
            civ: civ,
            dom: dom,
            exp: exp,
            ethics_hash: ethicsHash,
            exists: true
        });

        emit CitizenMinted(msg.sender, seatId, nationId, cohortArbanId);

        _tryInitialLockHook(seatId, reasonDoc);
    }

    /**
     * Admin issuance (на MVP полезно для первичной загрузки граждан).
     */
    function registerByOwner(
        address citizen,
        bytes32 nationId,
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

        // Проверка нации
        try nationRegistry.getNation(nationId) returns (NationRegistry.Nation memory nation) {
            if (!nation.active) revert NationNotActive();
        } catch {
            revert NationNotFound();
        }

        seatId = nextSeatId++;
        if (seatSbt.exists(seatId)) revert SeatAlreadyExists();

        seatSbt.mintSeat(citizen, seatId, cohortArbanId, 3);
        if (address(walletRegistry) == address(0)) revert WalletRegistryNotSet();
        walletRegistry.createWallet(seatId);

        seatOf[citizen] = seatId;
        ownerOfSeat[seatId] = citizen;

        metaOf[seatId] = CitizenMeta({
            nationId: nationId,
            cohort_arban_id: cohortArbanId,
            civ: civ,
            dom: dom,
            exp: exp,
            ethics_hash: ethicsHash,
            exists: true
        });

        emit CitizenMinted(citizen, seatId, nationId, cohortArbanId);

        _tryInitialLockHook(seatId, reasonDoc);
    }

    /* ===================== Optional ActivationRegistry hook ===================== */

    function _tryInitialLockHook(uint256 seatId, bytes32 reasonDoc) internal {
        if (activationRegistry == address(0)) return;

        (bool ok, ) = activationRegistry.call(
            abi.encodeWithSignature("setInitialLocked(uint256,bytes32)", seatId, reasonDoc)
        );

        emit InitialLockHookCalled(seatId, ok);
    }
}
