import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthGuard } from '../auth/auth.guard';
import { NotFoundException } from '@nestjs/common';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: any;

  const mockProfile = {
    id: 'u1',
    seatId: 'SEAT-001',
    username: 'testuser',
    gender: 'male',
    dateOfBirth: new Date('1990-01-15'),
    ethnicity: ['Mongol'],
    birthPlace: { city: 'Ulaanbaatar' },
    clan: 'Borjigin',
  };

  beforeEach(async () => {
    usersService = {
      getFullProfile: jest.fn(),
      updateProfile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  describe('GET /users/me', () => {
    it('returns authenticated user profile', async () => {
      usersService.getFullProfile.mockResolvedValue(mockProfile);
      const req = { user: { userId: 'u1' } } as any;

      const result = await controller.getMe(req);

      expect(result).toEqual(mockProfile);
      expect(usersService.getFullProfile).toHaveBeenCalledWith('u1');
    });

    it('propagates NotFoundException', async () => {
      usersService.getFullProfile.mockRejectedValue(
        new NotFoundException('User not found'),
      );
      const req = { user: { userId: 'nonexistent' } } as any;

      await expect(controller.getMe(req)).rejects.toThrow(NotFoundException);
    });
  });

  describe('PATCH /users/profile', () => {
    it('updates profile and returns { ok: true, user }', async () => {
      const updatedProfile = { ...mockProfile, clan: 'Khongirad' };
      usersService.updateProfile.mockResolvedValue(updatedProfile);
      const req = { user: { userId: 'u1' } } as any;

      const result = await controller.updateProfile(req, { clan: 'Khongirad' });

      expect(result.ok).toBe(true);
      expect(result.user.clan).toBe('Khongirad');
      expect(usersService.updateProfile).toHaveBeenCalledWith('u1', {
        clan: 'Khongirad',
      });
    });

    it('handles partial update with multiple fields', async () => {
      const dto = {
        gender: 'female',
        ethnicity: ['Buryat'],
        dateOfBirth: '1995-06-20',
      };
      usersService.updateProfile.mockResolvedValue({
        ...mockProfile,
        ...dto,
        dateOfBirth: new Date(dto.dateOfBirth),
      });
      const req = { user: { userId: 'u1' } } as any;

      const result = await controller.updateProfile(req, dto);

      expect(result.ok).toBe(true);
      expect(result.user.gender).toBe('female');
      expect(result.user.ethnicity).toEqual(['Buryat']);
    });
  });
});
