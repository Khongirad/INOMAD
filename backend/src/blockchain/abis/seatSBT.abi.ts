/**
 * Extended ABI for SeatSBT contract.
 * Includes mintSeat() for on-chain verification.
 *
 * SeatSBT is a Soul-Bound Token (non-transferable NFT).
 * Each verified citizen receives exactly one SeatSBT.
 * Minting is triggered by the backend after a guarantor verification — it cannot
 * be called by users directly.
 */
export const SeatSBT_ABI = [
  // ─── Read functions ────────────────────────────────────────────────────────
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function seatIdOf(uint256 tokenId) view returns (string)',
  'function tokenIdOfAddress(address owner) view returns (uint256)',
  'function isVerified(address account) view returns (bool)',

  // ─── Write functions (backend-controlled, called after guarantor approval) ─
  'function mintSeat(address to, string calldata seatId) returns (uint256 tokenId)',
  'function revokeSeat(uint256 tokenId, string calldata reason)',

  // ─── Events ────────────────────────────────────────────────────────────────
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'event SeatMinted(address indexed to, uint256 indexed tokenId, string seatId)',
  'event SeatRevoked(uint256 indexed tokenId, string reason)',
] as const;

/**
 * ABI for EmissionMultiSig contract.
 * Used by backend to query proposal state and push transactions to the governance contract.
 */
export const EmissionMultiSig_ABI = [
  // ─── Read functions ────────────────────────────────────────────────────────
  'function governor() view returns (address)',
  'function quorumRequired() view returns (uint256)',
  'function timelockDuration() view returns (uint256)',
  'function proposalCount() view returns (uint256)',
  'function isBoardMember(address) view returns (bool)',
  'function getBoardMembers() view returns (address[])',
  'function hasApproved(uint256 proposalId, address member) view returns (bool)',
  'function getTimelockRemaining(uint256 proposalId) view returns (uint256)',
  'function getProposal(uint256 proposalId) view returns (tuple(uint256 id, uint8 proposalType, uint256 amount, address recipientOrSource, string reason, string legalBasis, uint8 status, address proposer, uint256 approvalsCount, uint256 createdAt, uint256 quorumReachedAt, uint256 executableAfter, uint256 executedAt, address executedBy))',

  // ─── Write functions ───────────────────────────────────────────────────────
  'function createProposal(uint8 proposalType, uint256 amount, address recipientOrSource, string calldata reason, string calldata legalBasis) returns (uint256 proposalId)',
  'function approveProposal(uint256 proposalId)',
  'function executeProposal(uint256 proposalId)',
  'function rejectProposal(uint256 proposalId, string calldata reason)',

  // ─── Events ────────────────────────────────────────────────────────────────
  'event ProposalCreated(uint256 indexed proposalId, address indexed proposer, uint8 proposalType, uint256 amount, string reason)',
  'event ProposalApproved(uint256 indexed proposalId, address indexed approver, uint256 approvalsCount)',
  'event QuorumReached(uint256 indexed proposalId, uint256 executableAfter)',
  'event ProposalExecuted(uint256 indexed proposalId, address indexed executor, uint256 amount)',
  'event ProposalRejected(uint256 indexed proposalId, address indexed rejector, string reason)',
] as const;
