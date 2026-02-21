// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * ElectionRegistry (MVP, address-voters)
 * - Creates elections with a fixed list of voter addresses + candidates (uint256)
 * - Vote: one address => one vote (per election)
 * - Finalize: returns winner by plurality
 *
 * This MVP is intentionally simple.
 * Later, electorate can be SeatSBT-based (seat owners) + scoped by Arban/Zun/Myangan/Tumen.
 */
contract ElectionRegistry {
    address public owner;

    uint256 public nextElectionId = 1;

    struct Election {
        uint64 endTs;
        bool finalized;
        uint256 winner; // candidate id
        uint256[] candidates;
        address[] voters;
    }

    mapping(uint256 => Election) public elections;

    // electionId => voter => voted?
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    // electionId => candidate => votes
    mapping(uint256 => mapping(uint256 => uint256)) public votes;

    event OwnerSet(address indexed newOwner);
    event ElectionCreated(uint256 indexed electionId, uint64 endTs, uint256[] candidates, address[] voters);
    event Voted(uint256 indexed electionId, address indexed voter, uint256 indexed candidate);
    event Finalized(uint256 indexed electionId, uint256 indexed winner, uint256 winnerVotes);

    error NotOwner();
    error BadParam();
    error NotVoter();
    error AlreadyVoted();
    error ElectionEnded();
    error ElectionNotEnded();
    error AlreadyFinalized();
    error InvalidCandidate();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address owner_) {
        if (owner_ == address(0)) revert BadParam();
        owner = owner_;
    }

    function setOwner(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert BadParam();
        owner = newOwner;
        emit OwnerSet(newOwner);
    }

    function createElection(
        uint64 endTs,
        uint256[] calldata candidates,
        address[] calldata voters_
    ) external onlyOwner returns (uint256 electionId) {
        if (endTs <= block.timestamp) revert BadParam();
        if (candidates.length == 0 || voters_.length == 0) revert BadParam();

        electionId = nextElectionId++;
        Election storage e = elections[electionId];
        e.endTs = endTs;

        // copy arrays
        for (uint256 i = 0; i < candidates.length; i++) e.candidates.push(candidates[i]);
        for (uint256 i = 0; i < voters_.length; i++) e.voters.push(voters_[i]);

        emit ElectionCreated(electionId, endTs, e.candidates, e.voters);
    }

    function isVoter(uint256 electionId, address who) public view returns (bool) {
        Election storage e = elections[electionId];
        for (uint256 i = 0; i < e.voters.length; i++) {
            if (e.voters[i] == who) return true;
        }
        return false;
    }

    function isCandidate(uint256 electionId, uint256 candidate) public view returns (bool) {
        Election storage e = elections[electionId];
        for (uint256 i = 0; i < e.candidates.length; i++) {
            if (e.candidates[i] == candidate) return true;
        }
        return false;
    }

    function voteFor(uint256 electionId, uint256 candidate) external {
        Election storage e = elections[electionId];
        if (e.finalized) revert AlreadyFinalized();
        if (block.timestamp >= e.endTs) revert ElectionEnded();
        if (!isVoter(electionId, msg.sender)) revert NotVoter();
        if (hasVoted[electionId][msg.sender]) revert AlreadyVoted();
        if (!isCandidate(electionId, candidate)) revert InvalidCandidate();

        hasVoted[electionId][msg.sender] = true;
        votes[electionId][candidate] += 1;

        emit Voted(electionId, msg.sender, candidate);
    }

    function finalize(uint256 electionId) external onlyOwner returns (uint256 winner, uint256 winnerVotes) {
        Election storage e = elections[electionId];
        if (e.finalized) revert AlreadyFinalized();
        if (block.timestamp < e.endTs) revert ElectionNotEnded();

        winner = 0;
        winnerVotes = 0;

        for (uint256 i = 0; i < e.candidates.length; i++) {
            uint256 c = e.candidates[i];
            uint256 v = votes[electionId][c];
            if (v > winnerVotes) {
                winnerVotes = v;
                winner = c;
            }
        }

        e.finalized = true;
        e.winner = winner;

        emit Finalized(electionId, winner, winnerVotes);
    }

    function getCandidates(uint256 electionId) external view returns (uint256[] memory) {
        return elections[electionId].candidates;
    }

    function getVoters(uint256 electionId) external view returns (address[] memory) {
        return elections[electionId].voters;
    }
}
