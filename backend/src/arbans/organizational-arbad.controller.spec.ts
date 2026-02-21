jest.mock('../typechain-types/factories/ArbadCompletion__factory', () => ({
  ArbadCompletion__factory: { connect: jest.fn() },
}));
jest.mock('../blockchain/abis/arbadCompletion.abi', () => ({
  ArbadCompletion_ABI: [],
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
import { OrganizationalArbadController } from './organizational-arbad.controller';
import { OrganizationalArbadService } from './organizational-arbad.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('OrganizationalArbadController', () => {
  let controller: OrganizationalArbadController;
  let service: any;
  const req = { user: { sub: 'u1', privateKey: '0xKEY' } };

  beforeEach(async () => {
    const mockService = {
      createOrganizationalArbad: jest.fn().mockResolvedValue({ arbadId: 10, txHash: '0x1' }),
      addOrgMember: jest.fn().mockResolvedValue(undefined),
      setOrgLeader: jest.fn().mockResolvedValue(undefined),
      createDepartment: jest.fn().mockResolvedValue({ deptId: 2 }),
      getOrgArbad: jest.fn().mockResolvedValue({ arbadId: 10 }),
      getOrgsByType: jest.fn().mockResolvedValue([{ arbadId: 10 }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationalArbadController],
      providers: [{ provide: OrganizationalArbadService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get(OrganizationalArbadController);
    service = module.get(OrganizationalArbadService);
  });

  it('should be defined', () => expect(controller).toBeDefined());

  it('creates org arbad', async () => {
    const r = await controller.createOrgArbad(
      { name: 'TestOrg', orgType: 1 as any }, req,
    );
    expect(r.arbadId).toBe(10);
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

  it('gets org arbad by id', async () => {
    const r = await controller.getOrgArbad(10);
    expect(r.arbadId).toBe(10);
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
