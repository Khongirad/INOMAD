/**
 * Extended ABI for AltanCoreLedger contract.
 * Includes write functions required for multi-sig emission protocol.
 *
 * NOTE: mint() and burn() can only be called by the EmissionMultiSig contract.
 * The backend never calls these directly — only via the governance workflow.
 */
export const AltanCoreLedger_ABI = [
  // ─── Read functions ────────────────────────────────────────────────────────
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function allowance(address owner, address spender) view returns (uint256)',

  // ─── Write functions (called only via EmissionMultiSig) ───────────────────
  'function mint(address to, uint256 amount)',
  'function burn(address from, uint256 amount)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',

  // ─── Events ────────────────────────────────────────────────────────────────
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
  'event Mint(address indexed to, uint256 amount)',
  'event Burn(address indexed from, uint256 amount)',
] as const;
