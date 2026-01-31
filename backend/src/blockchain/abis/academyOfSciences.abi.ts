export const academyOfSciencesAbi = [
  {
    "type": "constructor",
    "inputs": [
      { "name": "_scientistCouncil", "type": "address", "internalType": "address" },
      { "name": "_templeOfHeaven", "type": "address", "internalType": "address" },
      { "name": "_treasury", "type": "address", "internalType": "address" }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "submitPatent",
    "inputs": [
      { "name": "patentHash", "type": "bytes32", "internalType": "bytes32" },
      { "name": "title", "type": "string", "internalType": "string" },
      { "name": "field", "type": "string", "internalType": "string" },
      { "name": "submitterSeatId", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "reviewPatent",
    "inputs": [
      { "name": "patentId", "type": "uint256", "internalType": "uint256" },
      { "name": "approve", "type": "bool", "internalType": "bool" },
      { "name": "notes", "type": "string", "internalType": "string" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "registerDiscovery",
    "inputs": [
      { "name": "discoveryHash", "type": "bytes32", "internalType": "bytes32" },
      { "name": "title", "type": "string", "internalType": "string" },
      { "name": "description", "type": "string", "internalType": "string" },
      { "name": "scientistSeatId", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "peerReviewDiscovery",
    "inputs": [
      { "name": "discoveryId", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "requestGrant",
    "inputs": [
      { "name": "projectTitle", "type": "string", "internalType": "string" },
      { "name": "description", "type": "string", "internalType": "string" },
      { "name": "amount", "type": "uint256", "internalType": "uint256" },
      { "name": "scientistSeatId", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "approveGrant",
    "inputs": [
      { "name": "grantId", "type": "uint256", "internalType": "uint256" },
      { "name": "approvedAmount", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getPatent",
    "inputs": [{ "name": "patentId", "type": "uint256", "internalType": "uint256" }],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct AcademyOfSciences.Patent",
        "components": [
          { "name": "patentId", "type": "uint256", "internalType": "uint256" },
          { "name": "submitterSeatId", "type": "uint256", "internalType": "uint256" },
          { "name": "patentHash", "type": "bytes32", "internalType": "bytes32" },
          { "name": "title", "type": "string", "internalType": "string" },
          { "name": "field", "type": "string", "internalType": "string" },
          { "name": "status", "type": "uint8", "internalType": "enum AcademyOfSciences.PatentStatus" },
          { "name": "submittedAt", "type": "uint256", "internalType": "uint256" },
          { "name": "reviewedAt", "type": "uint256", "internalType": "uint256" },
          { "name": "reviewer", "type": "address", "internalType": "address" },
          { "name": "reviewNotes", "type": "string", "internalType": "string" }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "PatentSubmitted",
    "inputs": [
      { "name": "patentId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "seatId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "title", "type": "string", "indexed": false, "internalType": "string" },
      { "name": "field", "type": "string", "indexed": false, "internalType": "string" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "DiscoveryRegistered",
    "inputs": [
      { "name": "discoveryId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "seatId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "title", "type": "string", "indexed": false, "internalType": "string" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "GrantRequested",
    "inputs": [
      { "name": "grantId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "seatId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "amount", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  }
] as const;
