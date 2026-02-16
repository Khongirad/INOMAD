jest.mock('../typechain-types/factories/ArbanCompletion__factory', () => ({
  ArbanCompletion__factory: { connect: jest.fn() },
}));
jest.mock('../blockchain/abis/arbanCompletion.abi', () => ({
  ArbanCompletion_ABI: [],
  OrganizationType: {
    NONE: 0, EXECUTIVE: 1, JUDICIAL: 2, BANKING: 3,
    PRIVATE_COMPANY: 4, STATE_COMPANY: 5, GUILD: 6,
    SCIENTIFIC_COUNCIL: 7, EKHE_KHURAL: 8,
  },
}));
jest.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: jest.fn(),
    Wallet: jest.fn().mockImplementation(() => ({})),
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationalArbanController } from './organizational-arban.controller';
import { OrganizationalArbanService } from './organizational-arban.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('OrganizationalArbanController', () => {
  let controller: OrganizationalArbanController;
  let service: any;
  const req = { user: { sub: 'u1', privateKey: '0xKEY' } };

  beforeEach(async () => {
    const mockService = {
      createOrganizationalArban: jest.fn().mockResolvedValue({ arbanId: 10, txHash: '0x1' }),
      addOrgMember: jest.fn().mockResolvedValue(undefined),
      setOrgLeader: jest.fn().mockResolvedValue(undefined),
      createDepartment: jest.fn().mockResolvedValue({ deptId: 2 }),
      getOrgArban: jest.fn().mockResolvedValue({ arbanId: 10 }),
      getOrgsByType: jest.fn().mockResolvedValue([{ arbanId: 10 }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationalArbanController],
      providers: [{ provide: OrganizationalArbanService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get(OrganizationalArbanController);
    service = module.get(OrganizationalArbanService);
  });

  it('should be defined', () => expect(controller).toBeDefined());

  it('creates org arban', async () => {
    const r = await controller.createOrgArban(
      { name: 'TestOrg', orgType: 1 as any }, req,
    );
    expect(r.arbanId).toBe(10);
  });

  it('adds org member', async () => {
    const r = await controller.addOrgMember(10, { seatId: 's2' }, req);
    expect(r.success).toBe(true);
  });

  it('sets org leader', async () => {
    const r = await controller.setOrgLeader(10, { leaderSeatId: 's1' }, req);
    expect(r.success).toBe(true);
  });

  it('creates department', async () => {
    const r = await controller.createDepartment(10, { deptName: 'Engineering' }, req);
    expect(r).toBeDefined();
  });

  it('gets org arban by id', async () => {
    const r = await controller.getOrgArban(10);
    expect(r.arbanId).toBe(10);
  });

  it('gets orgs by type', async () => {
    const r = await controller.getOrgsByType('EXECUTIVE');
    expect(service.getOrgsByType).toHaveBeenCalled();
  });

  it('gets orgs by unknown type defaults to NONE', async () => {
    await controller.getOrgsByType('UNKNOWN');
    expect(service.getOrgsByType).toHaveBeenCalledWith(0); // NONE
  });
});
