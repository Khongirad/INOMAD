// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ITumenAuthority {
    function isTumenLeader(address who) external view returns (bool);
}

interface ILawRegistry {
    function createLaw(string calldata title) external returns (uint256 lawId);
    function addVersion(uint256 lawId, bytes32 contentHash, string calldata uri) external;
    function activateVersion(uint256 lawId, uint256 version) external;
}

contract KhuralLawProcess {
    error NotTumenLeader();
    error InvalidInput();
    error ProposalNotFound();
    error AlreadyVoted();
    error NotExecutable();
    error AlreadyExecuted();

    event ProposalCreated(uint256 indexed proposalId, uint256 indexed lawId, string title, bytes32 contentHash, string uri);
    event Voted(uint256 indexed proposalId, address indexed voter, bool support);
    event Executed(uint256 indexed proposalId, uint256 indexed lawId, uint256 activatedVersion);

    struct Proposal {
        uint256 lawId;         // 0 means create new law
        string title;          // used when lawId == 0
        bytes32 contentHash;
        string uri;
        uint64 createdAt;
        uint64 executeAfter;   // timelock
        uint32 forVotes;
        uint32 againstVotes;
        bool executed;
        bool exists;
    }

    ITumenAuthority public tumenAuth; // can be a contract later (ElectionRegistry/SeatSBT logic)
    ILawRegistry public lawRegistry;

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public voted;

    // MVP params
    uint32 public quorum;            // minimal total votes
    uint32 public superMajorityBps;  // 6667 = 2/3
    uint64 public timelockSeconds;   // e.g. 1 day

    constructor(address _tumenAuth, address _lawRegistry, uint32 _quorum, uint32 _superMajorityBps, uint64 _timelockSeconds) {
        if (_tumenAuth == address(0) || _lawRegistry == address(0)) revert InvalidInput();
        if (_superMajorityBps == 0 || _superMajorityBps > 10000) revert InvalidInput();
        tumenAuth = ITumenAuthority(_tumenAuth);
        lawRegistry = ILawRegistry(_lawRegistry);
        quorum = _quorum;
        superMajorityBps = _superMajorityBps;
        timelockSeconds = _timelockSeconds;
    }

    modifier onlyTumen() {
        if (!tumenAuth.isTumenLeader(msg.sender)) revert NotTumenLeader();
        _;
    }

    function proposeNewLaw(string calldata title, bytes32 contentHash, string calldata uri) external onlyTumen returns (uint256 pid) {
        if (bytes(title).length == 0) revert InvalidInput();
        if (contentHash == bytes32(0)) revert InvalidInput();
        pid = ++proposalCount;
        proposals[pid] = Proposal({
            lawId: 0,
            title: title,
            contentHash: contentHash,
            uri: uri,
            createdAt: uint64(block.timestamp),
            executeAfter: uint64(block.timestamp) + timelockSeconds,
            forVotes: 0,
            againstVotes: 0,
            executed: false,
            exists: true
        });
        emit ProposalCreated(pid, 0, title, contentHash, uri);
    }

    function proposeAmendLaw(uint256 lawId, bytes32 contentHash, string calldata uri) external onlyTumen returns (uint256 pid) {
        if (lawId == 0) revert InvalidInput();
        if (contentHash == bytes32(0)) revert InvalidInput();
        pid = ++proposalCount;
        proposals[pid] = Proposal({
            lawId: lawId,
            title: "",
            contentHash: contentHash,
            uri: uri,
            createdAt: uint64(block.timestamp),
            executeAfter: uint64(block.timestamp) + timelockSeconds,
            forVotes: 0,
            againstVotes: 0,
            executed: false,
            exists: true
        });
        emit ProposalCreated(pid, lawId, "", contentHash, uri);
    }

    function vote(uint256 proposalId, bool support) external onlyTumen {
        Proposal storage p = proposals[proposalId];
        if (!p.exists) revert ProposalNotFound();
        if (voted[proposalId][msg.sender]) revert AlreadyVoted();
        voted[proposalId][msg.sender] = true;

        if (support) p.forVotes += 1;
        else p.againstVotes += 1;

        emit Voted(proposalId, msg.sender, support);
    }

    function canExecute(uint256 proposalId) public view returns (bool ok) {
        Proposal storage p = proposals[proposalId];
        if (!p.exists || p.executed) return false;
        if (block.timestamp < p.executeAfter) return false;

        uint256 total = uint256(p.forVotes) + uint256(p.againstVotes);
        if (total < quorum) return false;

        // supermajority: forVotes / total >= superMajorityBps / 10000
        return uint256(p.forVotes) * 10000 >= total * uint256(superMajorityBps);
    }

    function execute(uint256 proposalId) external onlyTumen {
        Proposal storage p = proposals[proposalId];
        if (!p.exists) revert ProposalNotFound();
        if (p.executed) revert AlreadyExecuted();
        if (!canExecute(proposalId)) revert NotExecutable();

        p.executed = true;

        uint256 lawId = p.lawId;

        if (lawId == 0) {
            lawId = lawRegistry.createLaw(p.title);
        }

        // Add new version then activate it (latest version = "1" for new law, or next for existing)
        lawRegistry.addVersion(lawId, p.contentHash, p.uri);

        // We cannot read latestVersion from interface without adding a getter.
        // MVP assumption: registry activates "the version just added" via separate admin path.
        // To keep fully on-chain, add a getter or emit version in LawRegistry later.
        // For now, we activate version = 1 for new law; for amendments you'll need to activate manually.
        uint256 activatedVersion = (p.lawId == 0) ? 1 : 0;
        if (activatedVersion != 0) {
            lawRegistry.activateVersion(lawId, activatedVersion);
        }

        emit Executed(proposalId, lawId, activatedVersion);
    }
}
