import { ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Patch,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';

@ApiTags('Users')
@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /users/me
   * Returns the authenticated user's full profile including demographic data.
   */
  @Get('me')
  async getMe(@Req() req: AuthenticatedRequest) {
    return this.usersService.getFullProfile(req.user.userId);
  }

  /**
   * PATCH /users/profile
   * Update the authenticated user's demographic/census data.
   * All fields are optional — only provided fields are updated.
   */
  @Patch('profile')
  async updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ) {
    const updated = await this.usersService.updateProfile(req.user.userId, dto);
    return { ok: true, user: updated };
  }
}
