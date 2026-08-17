import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { z } from 'zod';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ZodValidationPipe } from 'src/pipes/ZodValidationPipe';
import { SettingsService } from './settings.service';

const privacySchema = z.object({
  friendRequests: z.enum(['everyone', 'friends', 'nobody']).optional(),
  teamRequests: z.enum(['everyone', 'friends', 'nobody']).optional(),
});

const userDataSchema = z.object({
  username: z.string().min(1).max(32).optional(),
  email: z.string().email().optional(),
});

const profilePictureSchema = z.object({
  profilePicture: z.string().nullable(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

const twoFactorCodeSchema = z.object({
  token: z.string().min(6).max(8),
});

const disableTwoFactorSchema = z.object({
  password: z.string().min(1),
  token: z.string().min(6).max(8),
});

const boardSchema = z.object({
  name: z.string().min(1),
  imageUrl: z.string().optional(),
  color: z.string().optional(),
});

const boardUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  imageUrl: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
});

@UseGuards(JwtAuthGuard)
@Controller('api/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getSettings(@Req() req) {
    return this.settingsService.getSettings(req.user);
  }

  @Patch('privacy')
  @UsePipes(new ZodValidationPipe(privacySchema))
  updatePrivacy(@Req() req, @Body() body: z.infer<typeof privacySchema>) {
    return this.settingsService.updatePrivacy(req.user, body);
  }

  @Patch('user-data')
  @UsePipes(new ZodValidationPipe(userDataSchema))
  updateUserData(@Req() req, @Body() body: z.infer<typeof userDataSchema>) {
    return this.settingsService.updateUserData(req.user, body);
  }

  @Patch('profile-picture')
  @UsePipes(new ZodValidationPipe(profilePictureSchema))
  setProfilePicture(
    @Req() req,
    @Body() body: z.infer<typeof profilePictureSchema>,
  ) {
    return this.settingsService.setProfilePicture(req.user, body.profilePicture);
  }

  @Post('password')
  @UsePipes(new ZodValidationPipe(passwordSchema))
  changePassword(@Req() req, @Body() body: z.infer<typeof passwordSchema>) {
    return this.settingsService.changePassword(req.user, body);
  }

  @Post('2fa/generate')
  generateTwoFactor(@Req() req) {
    return this.settingsService.generateTwoFactor(req.user);
  }

  @Post('2fa/enable')
  @UsePipes(new ZodValidationPipe(twoFactorCodeSchema))
  enableTwoFactor(@Req() req, @Body() body: z.infer<typeof twoFactorCodeSchema>) {
    return this.settingsService.enableTwoFactor(req.user, body.token);
  }

  @Post('2fa/disable')
  @UsePipes(new ZodValidationPipe(disableTwoFactorSchema))
  disableTwoFactor(
    @Req() req,
    @Body() body: z.infer<typeof disableTwoFactorSchema>,
  ) {
    return this.settingsService.disableTwoFactor(req.user, body);
  }

  @Get('boards')
  getBoards(@Req() req) {
    return this.settingsService.getSettings(req.user).then((s) => s.boards);
  }

  @Post('boards')
  @UsePipes(new ZodValidationPipe(boardSchema))
  addBoard(@Req() req, @Body() body: z.infer<typeof boardSchema>) {
    return this.settingsService.addBoard(req.user, body);
  }

  @Patch('boards/:id')
  @UsePipes(new ZodValidationPipe(boardUpdateSchema))
  updateBoard(
    @Req() req,
    @Param('id') id: string,
    @Body() body: z.infer<typeof boardUpdateSchema>,
  ) {
    return this.settingsService.updateBoard(req.user, id, body);
  }

  @Delete('boards/:id')
  deleteBoard(@Req() req, @Param('id') id: string) {
    return this.settingsService.deleteBoard(req.user, id);
  }
}
