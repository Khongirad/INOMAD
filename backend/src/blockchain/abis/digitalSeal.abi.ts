export const digitalSealAbi = [
  {
    "type": "constructor",
    "inputs": [
      { "name": "_signer1", "type": "address", "internalType": "address" },
      { "name": "_signer2", "type": "address", "internalType": "address" }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "THRESHOLD",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint8", "internalType": "uint8" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "approvalCount",
    "inputs": [{ "name": "", "type": "bytes32", "internalType": "bytes32" }],
    "outputs": [{ "name": "", "type": "uint8", "internalType": "uint8" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "approvals",
    "inputs": [
      { "name": "", "type": "bytes32", "internalType": "bytes32" },
      { "name": "", "type": "address", "internalType": "address" }
    ],
    "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "approve",
    "inputs": [{ "name": "txHash", "type": "bytes32", "internalType": "bytes32" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "documents",
    "inputs": [{ "name": "", "type": "bytes32", "internalType": "bytes32" }],
    "outputs": [
      { "name": "documentHash", "type": "bytes32", "internalType": "bytes32" },
      { "name": "createdAt", "type": "uint256", "internalType": "uint256" },
      { "name": "executedAt", "type": "uint256", "internalType": "uint256" },
      { "name": "exists", "type": "bool", "internalType": "bool" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "execute",
    "inputs": [
      { "name": "txHash", "type": "bytes32", "internalType": "bytes32" },
      { "name": "data", "type": "bytes", "internalType": "bytes" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "executed",
    "inputs": [{ "name": "", "type": "bytes32", "internalType": "bytes32" }],
    "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getDocument",
    "inputs": [{ "name": "txHash", "type": "bytes32", "internalType": "bytes32" }],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct DigitalSeal.SealedDocument",
        "components": [
          { "name": "documentHash", "type": "bytes32", "internalType": "bytes32" },
          { "name": "createdAt", "type": "uint256", "internalType": "uint256" },
          { "name": "executedAt", "type": "uint256", "internalType": "uint256" },
          { "name": "exists", "type": "bool", "internalType": "bool" }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hasApproved",
    "inputs": [
      { "name": "txHash", "type": "bytes32", "internalType": "bytes32" },
      { "name": "signer", "type": "address", "internalType": "address" }
    ],
    "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isSigner",
    "inputs": [{ "name": "addr", "type": "address", "internalType": "address" }],
    "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "revoke",
    "inputs": [{ "name": "txHash", "type": "bytes32", "internalType": "bytes32" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "signers",
    "inputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "outputs": [{ "name": "", "type": "address", "internalType": "address" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "verify",
    "inputs": [{ "name": "txHash", "type": "bytes32", "internalType": "bytes32" }],
    "outputs": [
      { "name": "approved", "type": "bool", "internalType": "bool" },
      { "name": "isExecuted", "type": "bool", "internalType": "bool" },
      { "name": "approvals_", "type": "uint8", "internalType": "uint8" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "Approved",
    "inputs": [
      { "name": "txHash", "type": "bytes32", "indexed": true, "internalType": "bytes32" },
      { "name": "approver", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "totalApprovals", "type": "uint8", "indexed": false, "internalType": "uint8" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Executed",
    "inputs": [
      { "name": "txHash", "type": "bytes32", "indexed": true, "internalType": "bytes32" },
      { "name": "timestamp", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Revoked",
    "inputs": [
      { "name": "txHash", "type": "bytes32", "indexed": true, "internalType": "bytes32" },
      { "name": "revoker", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "totalApprovals", "type": "uint8", "indexed": false, "internalType": "uint8" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SealCreated",
    "inputs": [
      { "name": "signer1", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "signer2", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "timestamp", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "AlreadyApproved",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AlreadyExecuted",
    "inputs": []
  },
  {
    "type": "error",
    "name": "DocumentNotFound",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InsufficientApprovals",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotASigner",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotApproved",
    "inputs": []
  }
] as const;
