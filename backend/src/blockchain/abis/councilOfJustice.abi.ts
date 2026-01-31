export const councilOfJusticeAbi = [
  {
    "type": "constructor",
    "inputs": [
      { "name": "_templeOfHeaven", "type": "address", "internalType": "address" }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "nominateMember",
    "inputs": [
      { "name": "seatId", "type": "uint256", "internalType": "uint256" },
      { "name": "legalEducationHash", "type": "bytes32", "internalType": "bytes32" },
      { "name": "specialization", "type": "string", "internalType": "string" },
      { "name": "arbanId", "type": "uint256", "internalType": "uint256" },
      { "name": "walletAddress", "type": "address", "internalType": "address" }
    ],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "approveMember",
    "inputs": [
      { "name": "memberId", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "fileCase",
    "inputs": [
      { "name": "plaintiffSeatId", "type": "uint256", "internalType": "uint256" },
      { "name": "defendantSeatId", "type": "uint256", "internalType": "uint256" },
      { "name": "caseHash", "type": "bytes32", "internalType": "bytes32" },
      { "name": "description", "type": "string", "internalType": "string" },
      { "name": "rulingType", "type": "uint8", "internalType": "enum CouncilOfJustice.RulingType" }
    ],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "assignCase",
    "inputs": [
      { "name": "caseId", "type": "uint256", "internalType": "uint256" },
      { "name": "judge", "type": "address", "internalType": "address" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "ruleOnCase",
    "inputs": [
      { "name": "caseId", "type": "uint256", "internalType": "uint256" },
      { "name": "rulingHash", "type": "bytes32", "internalType": "bytes32" },
      { "name": "rulingText", "type": "string", "internalType": "string" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "registerPrecedent",
    "inputs": [
      { "name": "caseId", "type": "uint256", "internalType": "uint256" },
      { "name": "precedentHash", "type": "bytes32", "internalType": "bytes32" },
      { "name": "summary", "type": "string", "internalType": "string" },
      { "name": "legalPrinciple", "type": "string", "internalType": "string" }
    ],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "MemberNominated",
    "inputs": [
      { "name": "memberId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "seatId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "specialization", "type": "string", "indexed": false, "internalType": "string" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "CaseFiled",
    "inputs": [
      { "name": "caseId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "plaintiffSeatId", "type": "uint256", "indexed": false, "internalType": "uint256" },
      { "name": "defendantSeatId", "type": "uint256", "indexed": false, "internalType": "uint256" },
      { "name": "rulingType", "type": "uint8", "indexed": false, "internalType": "enum CouncilOfJustice.RulingType" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PrecedentRegistered",
    "inputs": [
      { "name": "precedentId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "sourceCaseId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "judge", "type": "address", "indexed": true, "internalType": "address" }
    ],
    "anonymous": false
  }
] as const;
