export const templeOfHeavenAbi = [
  {
    "type": "constructor",
    "inputs": [
      { "name": "_scientistCouncil", "type": "address", "internalType": "address" },
      { "name": "_wisdomCouncil", "type": "address", "internalType": "address" }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "submitRecord",
    "inputs": [
      { "name": "recordHash", "type": "bytes32", "internalType": "bytes32" },
      { "name": "recordType", "type": "uint8", "internalType": "enum TempleOfHeaven.RecordType" },
      { "name": "metadata", "type": "string", "internalType": "string" }
    ],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "verifyRecord",
    "inputs": [
      { "name": "recordId", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getRecord",
    "inputs": [
      { "name": "recordId", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct TempleOfHeaven.Record",
        "components": [
          { "name": "recordHash", "type": "bytes32", "internalType": "bytes32" },
          { "name": "recordType", "type": "uint8", "internalType": "enum TempleOfHeaven.RecordType" },
          { "name": "submitter", "type": "address", "internalType": "address" },
          { "name": "timestamp", "type": "uint256", "internalType": "uint256" },
          { "name": "metadata", "type": "string", "internalType": "string" },
          { "name": "verified", "type": "bool", "internalType": "bool" }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "receiveDonation",
    "inputs": [],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "getDonationBalance",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "RecordSubmitted",
    "inputs": [
      { "name": "recordId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "recordHash", "type": "bytes32", "indexed": false, "internalType": "bytes32" },
      { "name": "recordType", "type": "uint8", "indexed": false, "internalType": "enum TempleOfHeaven.RecordType" },
      { "name": "submitter", "type": "address", "indexed": true, "internalType": "address" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RecordVerified",
    "inputs": [
      { "name": "recordId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "verifier", "type": "address", "indexed": true, "internalType": "address" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "DonationReceived",
    "inputs": [
      { "name": "donor", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "amount", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  }
] as const;
