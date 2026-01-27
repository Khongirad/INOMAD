// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IStructureRegistryCE {
    function tumenLeader(uint256 tumenId) external view returns (address);
    function tumenAddress(uint256 tumenId) external view returns (address);
}

interface IChairmanRegistry {
    function setChairman(address newChairman) external;
}

contract ChairmanElection {
    IStructureRegistryCE public immutable registry;
    IChairmanRegistry public immutable chairmanRegistry;

    uint256[] public tumenIds; // совет туменов, участвующий в этих выборах
    uint256 public immutable createdAt;

    bool public finalized;
    address public winner;

    mapping(address => uint256) public votesFor;     // candidate -> votes
    mapping(address => bool) public hasVoted;        // voter(leader) -> voted?

    event Voted(uint256 indexed tumenId, address indexed leader, address indexed candidate);
    event Finalized(address indexed winner, uint256 votes);

    error FinalizedAlready();
    error NotTumenLeader();
    error AlreadyVoted();
    error InvalidCandidate();
    error NoWinner();

    constructor(address registry_, address chairmanRegistry_, uint256[] memory tumenIds_) {
        registry = IStructureRegistryCE(registry_);
        chairmanRegistry = IChairmanRegistry(chairmanRegistry_);
        tumenIds = tumenIds_;
        createdAt = block.timestamp;
    }

    function tumenCount() external view returns (uint256) {
        return tumenIds.length;
    }

    function _isLeaderOfAnyTumen(address leader, uint256 tumenId) internal view returns (bool) {
        if (registry.tumenAddress(tumenId) == address(0)) return false; // tumen must exist
        return registry.tumenLeader(tumenId) == leader && leader != address(0);
    }

    function vote(uint256 tumenId, address candidate) external {
        if (finalized) revert FinalizedAlready();
        if (candidate == address(0)) revert InvalidCandidate();
        if (hasVoted[msg.sender]) revert AlreadyVoted();
        if (!_isLeaderOfAnyTumen(msg.sender, tumenId)) revert NotTumenLeader();

        // ограничиваем голос только туменами, входящими в совет (список tumenIds)
        bool allowed = false;
        for (uint256 i = 0; i < tumenIds.length; i++) {
            if (tumenIds[i] == tumenId) { allowed = true; break; }
        }
        if (!allowed) revert NotTumenLeader();

        hasVoted[msg.sender] = true;
        votesFor[candidate] += 1;

        emit Voted(tumenId, msg.sender, candidate);
    }

    function finalize() external {
        if (finalized) revert FinalizedAlready();

        // простое большинство: winner должен набрать > total/2
        uint256 total = tumenIds.length;
        uint256 bestVotes = 0;
        address best = address(0);

        // скан кандидатов: в Solidity нет списка ключей mapping,
        // поэтому MVP: финализатор перед финализацией должен знать кандидата.
        // Решение: финализация по переданному кандидату.
        // Для простоты и железобетона — используем finalizeCandidate().
        revert NoWinner();
    }

    // MVP: финализация по конкретному кандидату, если он набрал большинство
    function finalizeCandidate(address candidate) external {
        if (finalized) revert FinalizedAlready();
        if (candidate == address(0)) revert InvalidCandidate();

        uint256 total = tumenIds.length;
        uint256 v = votesFor[candidate];

        if (v <= total / 2) revert NoWinner(); // строго > 50%

        finalized = true;
        winner = candidate;

        // назначаем Chairman
        chairmanRegistry.setChairman(candidate);

        emit Finalized(candidate, v);
    }
}
