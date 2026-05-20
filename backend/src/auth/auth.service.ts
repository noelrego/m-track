import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { compare, hash } from 'bcryptjs';
import { Model } from 'mongoose';
import { AppLogger } from '../common';
import type { JwtPayload, LoginDto, LoginResponseDto, LoginUserDto } from '../common';
import { User, UserDocument, UserRole, UserStatus } from '../schemas/auth.schema';

interface RootAdminSeedResult {
  created: boolean;
  user: {
    id: string;
    username: string;
    emailId: string;
    role: UserRole;
    isRootAdmin: boolean;
    status: UserStatus;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly logger: AppLogger,
  ) {}

  async login(loginDto: LoginDto): Promise<LoginResponseDto & { token: string }> {
    let user: UserDocument | null;

    try {
      user = await this.userModel
        .findOne({ username: loginDto.username })
        .select('+passwordHash')
        .exec();
    } catch (error) {
      this.logger.error(error, 'Login lookup failed', { username: loginDto.username });
      throw error;
    }

    if (
      !user ||
      user.status !== UserStatus.Active ||
      !(await compare(loginDto.password, user.passwordHash))
    ) {
      this.logger.warn('Login rejected', { username: loginDto.username });
      throw new UnauthorizedException('Invalid username or password');
    }

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      emailId: user.emailId,
      role: user.role,
      isRootAdmin: user.isRootAdmin,
    };

    return {
      user: this.toLoginUser(user),
      token: await this.jwtService.signAsync(payload),
    };
  }

  async getCurrentUser(userId: string): Promise<LoginUserDto> {
    try {
      const user = await this.userModel
        .findOne({ _id: userId, status: UserStatus.Active })
        .exec();

      if (!user) {
        throw new UnauthorizedException('Invalid session');
      }

      return this.toLoginUser(user);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error(error, 'Current user lookup failed', { userId });
      throw error;
    }
  }

  async seedRootAdminFromEnv(): Promise<RootAdminSeedResult> {
    this.logger.info('Root admin seed started');

    try {
      const existingRootAdmin = await this.userModel.findOne({ isRootAdmin: true }).exec();

      if (existingRootAdmin) {
        this.logger.info('Root admin already exists');

        return {
          created: false,
          user: this.toSeedResultUser(existingRootAdmin),
        };
      }

      const username = this.normalizeRequiredEnv('ROOT_ADMIN_USERNAME').toLowerCase();
      const emailId = this.normalizeRequiredEnv('ROOT_ADMIN_EMAIL').toLowerCase();
      const password = this.configService.getOrThrow<string>('ROOT_ADMIN_PASSWORD');
      const firstName = this.normalizeRequiredEnv('ROOT_ADMIN_FIRST_NAME');
      const lastName = this.normalizeOptionalEnv('ROOT_ADMIN_LAST_NAME');

      const existingUser = await this.userModel
        .exists({
          $or: [{ username }, { emailId }],
        })
        .exec();

      if (existingUser) {
        this.logger.warn('Root admin seed rejected because username or email exists', {
          username,
          emailId,
        });

        throw new ConflictException(
          'Cannot create root admin because username or email already exists',
        );
      }

      if (password.length < 12) {
        throw new Error('ROOT_ADMIN_PASSWORD must be at least 12 characters');
      }

      const passwordHash = await hash(password, 12);
      const rootAdmin = await this.userModel.create({
        username,
        emailId,
        passwordHash,
        firstName,
        lastName,
        role: UserRole.Admin,
        isRootAdmin: true,
        status: UserStatus.Active,
      });

      this.logger.info('Root admin created successfully');

      return {
        created: true,
        user: this.toSeedResultUser(rootAdmin),
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      if (this.isDuplicateKeyError(error)) {
        this.logger.warn('Root admin seed duplicate key conflict');
        throw new ConflictException('Root admin already exists');
      }

      this.logger.error(error, 'Root admin seed failed');
      throw error;
    }
  }

  private normalizeRequiredEnv(key: string): string {
    const value = this.configService.getOrThrow<string>(key).trim();

    if (!value) {
      throw new Error(`${key} cannot be empty`);
    }

    return value;
  }

  private normalizeOptionalEnv(key: string): string | undefined {
    const value = this.configService.get<string>(key)?.trim();

    return value || undefined;
  }

  private toSeedResultUser(user: UserDocument): RootAdminSeedResult['user'] {
    return {
      id: user.id,
      username: user.username,
      emailId: user.emailId,
      role: user.role,
      isRootAdmin: user.isRootAdmin,
      status: user.status,
    };
  }

  private toLoginUser(user: UserDocument): LoginUserDto {
    return {
      username: user.username,
      emailId: user.emailId,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isRootAdmin: user.isRootAdmin,
    };
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 11000
    );
  }
}
