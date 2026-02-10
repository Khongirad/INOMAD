import { Test, TestingModule } from '@nestjs/testing';
import { IdentityController } from './identity.controller';
import { RegistrationService } from './registration.service';
import { VerificationService } from './verification.service';
import { IdentityBlockchainService } from './identity-blockchain.service';
import { ConfigService } from '@nestjs/config';


describe('IdentityController', () => {
  let controller: IdentityController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IdentityController],
      providers: [
        { provide: RegistrationService, useValue: { registerUser: jest.fn() } },
        { provide: VerificationService, useValue: { getStatus: jest.fn() } },
        { provide: IdentityBlockchainService, useValue: { getBlockchainStatus: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    })

    .compile();
    controller = module.get<IdentityController>(IdentityController);
  });
  it('should be defined', () => { expect(controller).toBeDefined(); });
});
