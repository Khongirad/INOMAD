import { BlockchainService } from '../../src/blockchain/blockchain.service';

/**
 * Creates a mock BlockchainService for testing.
 */
export function createMockBlockchainService(): any {
  const mockContract = {
    target: '0xMockContractAddress',
    interface: { parseLog: jest.fn() },
    connect: jest.fn().mockReturnThis(),
    submitRecord: jest.fn(),
    verifyRecord: jest.fn(),
    getDonationBalance: jest.fn(),
    receiveDonation: jest.fn(),
    quoteTax: jest.fn(),
    collectTax: jest.fn(),
    TAX_BPS: jest.fn(),
    REPUBLIC_BPS: jest.fn(),
    CONFED_BPS: jest.fn(),
  };

  return {
    isEnabled: jest.fn().mockReturnValue(true),
    isReady: jest.fn().mockReturnValue(true),
    getProvider: jest.fn().mockReturnValue({
      getBlockNumber: jest.fn().mockResolvedValue(100),
    }),
    getWallet: jest.fn().mockReturnValue({
      getAddress: jest.fn().mockResolvedValue('0xMockWalletAddress'),
      connect: jest.fn().mockReturnThis(),
    }),
    verifySeatOwnership: jest.fn().mockResolvedValue(true),
    getTaxEngineContract: jest.fn().mockReturnValue(mockContract),
    getArbanRegistryContract: jest.fn().mockReturnValue(mockContract),
    getSeatSBTContract: jest.fn().mockReturnValue(mockContract),
  };
}
