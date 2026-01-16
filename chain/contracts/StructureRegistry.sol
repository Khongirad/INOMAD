// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Zun.sol";
import "./Myangan.sol";
import "./Tumen.sol";

/**
 * StructureRegistry — тонкий реестр связей + лидерство + апдейтеры (для документов).
 * MVP:
 *  - 10 Arban    -> 1 Zun
 *  - 10 Zun      -> 1 Myangan
 *  - 10 Myangan  -> 1 Tumen
 *
 * Железобетонная подпись:
 *  - Zun подписывают лидеры Arbans (10 лидеров)
 *  - Myangan подписывают лидеры Zun
 *  - Tumen подписывают лидеры Myangan
 *
 * Delegation-by-Document:
 *  - документы после финализации дергают apply*() через authorizedUpdater
 */
contract StructureRegistry {
    // ====== CONFIG ======
    address public owner;
    address public organization; // можно оставить 0x0 на MVP

    // ====== UPDATERS (documents executors) ======
    mapping(address => bool) public authorizedUpdater;

    // ====== ZUN STORAGE ======
    uint256 public nextZunId = 1;

    mapping(uint256 => uint256) public zunOfArban;          // arbanId -> zunId
    mapping(uint256 => address) public zunAddress;          // zunId -> Zun address
    mapping(uint256 => uint256[10]) private _zunChildren;   // zunId -> arbanIds[10]

    // ====== MYANGAN STORAGE ======
    uint256 public nextMyanganId = 1;

    mapping(uint256 => uint256) public myanganOfZun;          // zunId -> myanganId
    mapping(uint256 => address) public myanganAddress;        // myanganId -> Myangan address
    mapping(uint256 => uint256[10]) private _myanganChildren; // myanganId -> zunIds[10]

    // ====== TUMEN STORAGE ======
    uint256 public nextTumenId = 1;

    mapping(uint256 => uint256) public tumenOfMyangan;        // myanganId -> tumenId
    mapping(uint256 => address) public tumenAddress;          // tumenId -> Tumen address
    mapping(uint256 => uint256[10]) private _tumenChildren;   // tumenId -> myanganIds[10]

    // ====== LEADERS (delegated signers) ======
    mapping(uint256 => address) public arbanLeader;   // arbanId -> citizen (leader of Arban)
    mapping(uint256 => address) public zunLeader;     // zunId -> citizen (leader of Zun)
    mapping(uint256 => address) public myanganLeader; // myanganId -> citizen (leader of Myangan)
    mapping(uint256 => address) public tumenLeader;   // tumenId -> citizen (leader of Tumen)

    // ====== EVENTS ======
    event ZunRegistered(uint256 indexed zunId, address indexed zun, uint256[10] arbanIds, address leader);
    event MyanganRegistered(uint256 indexed myanganId, address indexed myangan, uint256[10] zunIds, address leader);
    event TumenRegistered(uint256 indexed tumenId, address indexed tumen, uint256[10] myanganIds, address leader);

    // level: 1=Arban, 2=Zun, 3=Myangan, 4=Tumen
    event LeaderAssigned(uint8 indexed level, uint256 indexed id, address indexed leader);
    event LeaderApplied(uint8 indexed level, uint256 indexed id, address indexed leader);

    event UpdaterSet(address indexed updater, bool allowed);

    // ====== ERRORS ======
    error NotOwner();
    error NotUpdater();

    // Zun errors
    error InvalidArbanId();
    error DuplicateArbanId();
    error ArbanAlreadyInZun(uint256 arbanId, uint256 existingZunId);
    error ZunNotFound(uint256 zunId);

    // Myangan errors
    error InvalidZunId();
    error DuplicateZunId();
    error ZunNotInRegistry(uint256 zunId);
    error ZunAlreadyInMyangan(uint256 zunId, uint256 existingMyanganId);
    error MyanganNotFound(uint256 myanganId);

    // Tumen errors
    error InvalidMyanganId();
    error DuplicateMyanganId();
    error MyanganNotInRegistry(uint256 myanganId);
    error MyanganAlreadyInTumen(uint256 myanganId, uint256 existingTumenId);
    error TumenNotFound(uint256 tumenId);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyUpdater() {
        if (!authorizedUpdater[msg.sender]) revert NotUpdater();
        _;
    }

    constructor(address organization_) {
        owner = msg.sender;
        organization = organization_;
    }

    function setOwner(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    function setOrganization(address organization_) external onlyOwner {
        organization = organization_;
    }

    // ====== UPDATER ADMIN ======
    function setUpdater(address upd, bool ok) external onlyOwner {
        authorizedUpdater[upd] = ok;
        emit UpdaterSet(upd, ok);
    }

    // ====== VIEW ======
    function getZunChildren(uint256 zunId) external view returns (uint256[10] memory) {
        if (zunAddress[zunId] == address(0)) revert ZunNotFound(zunId);
        return _zunChildren[zunId];
    }

    function getMyanganChildren(uint256 myanganId) external view returns (uint256[10] memory) {
        if (myanganAddress[myanganId] == address(0)) revert MyanganNotFound(myanganId);
        return _myanganChildren[myanganId];
    }

    function getTumenChildren(uint256 tumenId) external view returns (uint256[10] memory) {
        if (tumenAddress[tumenId] == address(0)) revert TumenNotFound(tumenId);
        return _tumenChildren[tumenId];
    }

    // ====== CORE: 10 Arban -> Zun ======
    function registerZun(uint256[10] memory arbanIds, address leader)
        external
        onlyOwner
        returns (uint256 zunId)
    {
        for (uint256 i = 0; i < 10; i++) {
            uint256 a = arbanIds[i];
            if (a == 0) revert InvalidArbanId();

            for (uint256 j = i + 1; j < 10; j++) {
                if (a == arbanIds[j]) revert DuplicateArbanId();
            }

            uint256 existing = zunOfArban[a];
            if (existing != 0) revert ArbanAlreadyInZun(a, existing);
        }

        zunId = nextZunId++;
        Zun zun = new Zun(address(this), organization, zunId, arbanIds, leader);

        zunAddress[zunId] = address(zun);
        _zunChildren[zunId] = arbanIds;

        for (uint256 i = 0; i < 10; i++) {
            zunOfArban[arbanIds[i]] = zunId;
        }

        emit ZunRegistered(zunId, address(zun), arbanIds, leader);
    }

    // ====== CORE: 10 Zun -> Myangan ======
    function registerMyangan(uint256[10] memory zunIds, address leader)
        external
        onlyOwner
        returns (uint256 myanganId)
    {
        for (uint256 i = 0; i < 10; i++) {
            uint256 z = zunIds[i];
            if (z == 0) revert InvalidZunId();

            for (uint256 j = i + 1; j < 10; j++) {
                if (z == zunIds[j]) revert DuplicateZunId();
            }

            if (zunAddress[z] == address(0)) revert ZunNotInRegistry(z);

            uint256 existing = myanganOfZun[z];
            if (existing != 0) revert ZunAlreadyInMyangan(z, existing);
        }

        myanganId = nextMyanganId++;
        Myangan myangan = new Myangan(address(this), organization, myanganId, zunIds, leader);

        myanganAddress[myanganId] = address(myangan);
        _myanganChildren[myanganId] = zunIds;

        for (uint256 i = 0; i < 10; i++) {
            myanganOfZun[zunIds[i]] = myanganId;
        }

        emit MyanganRegistered(myanganId, address(myangan), zunIds, leader);
    }

    // ====== CORE: 10 Myangan -> Tumen ======
    function registerTumen(uint256[10] memory myanganIds, address leader)
        external
        onlyOwner
        returns (uint256 tumenId)
    {
        for (uint256 i = 0; i < 10; i++) {
            uint256 m = myanganIds[i];
            if (m == 0) revert InvalidMyanganId();

            for (uint256 j = i + 1; j < 10; j++) {
                if (m == myanganIds[j]) revert DuplicateMyanganId();
            }

            if (myanganAddress[m] == address(0)) revert MyanganNotInRegistry(m);

            uint256 existing = tumenOfMyangan[m];
            if (existing != 0) revert MyanganAlreadyInTumen(m, existing);
        }

        tumenId = nextTumenId++;
        Tumen tumen = new Tumen(address(this), organization, tumenId, myanganIds, leader);

        tumenAddress[tumenId] = address(tumen);
        _tumenChildren[tumenId] = myanganIds;

        for (uint256 i = 0; i < 10; i++) {
            tumenOfMyangan[myanganIds[i]] = tumenId;
        }

        emit TumenRegistered(tumenId, address(tumen), myanganIds, leader);
    }

    // ====== LEADER SETTERS (MVP: onlyOwner manual) ======
    function setArbanLeader(uint256 arbanId, address leader) external onlyOwner {
        arbanLeader[arbanId] = leader;
        emit LeaderAssigned(1, arbanId, leader);
    }

    function setZunLeaderCitizen(uint256 zunId, address leader) external onlyOwner {
        if (zunAddress[zunId] == address(0)) revert ZunNotFound(zunId);
        zunLeader[zunId] = leader;
        emit LeaderAssigned(2, zunId, leader);
    }

    function setMyanganLeaderCitizen(uint256 myanganId, address leader) external onlyOwner {
        if (myanganAddress[myanganId] == address(0)) revert MyanganNotFound(myanganId);
        myanganLeader[myanganId] = leader;
        emit LeaderAssigned(3, myanganId, leader);
    }

    function setTumenLeaderCitizen(uint256 tumenId, address leader) external onlyOwner {
        if (tumenAddress[tumenId] == address(0)) revert TumenNotFound(tumenId);
        tumenLeader[tumenId] = leader;
        emit LeaderAssigned(4, tumenId, leader);
    }

    // ====== APPLY LEADER (by finalized documents via authorizedUpdater) ======
    function applyZunLeader(uint256 zunId, address leader) external onlyUpdater {
        if (zunAddress[zunId] == address(0)) revert ZunNotFound(zunId);
        zunLeader[zunId] = leader;
        emit LeaderApplied(2, zunId, leader);
    }

    function applyMyanganLeader(uint256 myanganId, address leader) external onlyUpdater {
        if (myanganAddress[myanganId] == address(0)) revert MyanganNotFound(myanganId);
        myanganLeader[myanganId] = leader;
        emit LeaderApplied(3, myanganId, leader);
    }

    function applyTumenLeader(uint256 tumenId, address leader) external onlyUpdater {
        if (tumenAddress[tumenId] == address(0)) revert TumenNotFound(tumenId);
        tumenLeader[tumenId] = leader;
        emit LeaderApplied(4, tumenId, leader);
    }

    function applyArbanLeader(uint256 arbanId, address leader) external onlyUpdater {
        // для Arbans пока нет existence-check по контракту: оставляем свободно, но можно позже добавить ArbanRegistry
        arbanLeader[arbanId] = leader;
        emit LeaderApplied(1, arbanId, leader);
    }
}
