import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { hash } from 'bcryptjs';
import { isValidObjectId, Model } from 'mongoose';
import {
  AdminUserResponseDto,
  AppLogger,
  CreateAdminUserDto,
  UpdateAdminUserDto,
} from '../common';
import { User, UserDocument, UserRole, UserStatus } from '../schemas/auth.schema';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly logger: AppLogger,
  ) {}

  async createUser(
    createUserDto: CreateAdminUserDto,
    createdByUserId: string,
  ): Promise<AdminUserResponseDto> {
    this.logger.debug('Admin create user requested', {
      username: createUserDto.username,
      emailId: createUserDto.emailid,
      role: createUserDto.role,
      createdByUserId,
    });

    try {
      await this.ensureUsernameAndEmailAreAvailable(
        createUserDto.username,
        createUserDto.emailid,
      );

      const passwordHash = await hash(createUserDto.password, 12);
      const user = await this.userModel.create({
        username: createUserDto.username,
        emailId: createUserDto.emailid,
        passwordHash,
        firstName: createUserDto.firstName ?? createUserDto.username,
        lastName: createUserDto.lastName,
        role: createUserDto.role,
        isRootAdmin: false,
        status: UserStatus.Active,
        createdByUserId,
      });

      this.logger.info('Admin user created successfully');

      return this.toAdminUserResponse(user);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      if (this.isDuplicateKeyError(error)) {
        this.logger.warn('Admin create user duplicate key conflict', {
          username: createUserDto.username,
          emailId: createUserDto.emailid,
        });

        throw new ConflictException('Username or email already exists');
      }

      this.logger.error(error, 'Admin create user failed', {
        username: createUserDto.username,
        emailId: createUserDto.emailid,
      });

      throw error;
    }
  }

  async listUsers(): Promise<AdminUserResponseDto[]> {
    try {
      const users = await this.userModel.find().sort({ createdAt: -1 }).exec();

      return users.map((user) => this.toAdminUserResponse(user));
    } catch (error) {
      this.logger.error(error, 'Admin list users failed');
      throw error;
    }
  }

  async getUser(userId: string): Promise<AdminUserResponseDto> {
    const user = await this.findUserOrThrow(userId);

    return this.toAdminUserResponse(user);
  }

  async updateUser(
    userId: string,
    updateUserDto: UpdateAdminUserDto,
  ): Promise<AdminUserResponseDto> {
    const user = await this.findUserOrThrow(userId);

    if (user.isRootAdmin) {
      throw new ForbiddenException('Root admin cannot be modified from admin routes');
    }

    try {
      if (updateUserDto.username || updateUserDto.emailid) {
        await this.ensureUsernameAndEmailAreAvailable(
          updateUserDto.username ?? user.username,
          updateUserDto.emailid ?? user.emailId,
          user.id,
        );
      }

      if (updateUserDto.username) {
        user.username = updateUserDto.username;
      }

      if (updateUserDto.emailid) {
        user.emailId = updateUserDto.emailid;
      }

      if (updateUserDto.firstName) {
        user.firstName = updateUserDto.firstName;
      }

      if (updateUserDto.lastName !== undefined) {
        user.lastName = updateUserDto.lastName;
      }

      if (updateUserDto.role) {
        user.role = updateUserDto.role;
      }

      if (updateUserDto.password) {
        user.passwordHash = await hash(updateUserDto.password, 12);
      }

      const updatedUser = await user.save();
      this.logger.info('Admin user updated successfully');

      return this.toAdminUserResponse(updatedUser);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      if (this.isDuplicateKeyError(error)) {
        this.logger.warn('Admin update user duplicate key conflict', { userId });
        throw new ConflictException('Username or email already exists');
      }

      this.logger.error(error, 'Admin update user failed', { userId });
      throw error;
    }
  }

  async deactivateUser(
    userId: string,
    requesterUserId: string,
  ): Promise<AdminUserResponseDto> {
    const user = await this.findUserOrThrow(userId);

    if (user.isRootAdmin) {
      throw new ForbiddenException('Root admin cannot be deactivated');
    }

    if (user.id === requesterUserId) {
      throw new ForbiddenException('Admin cannot deactivate own user');
    }

    try {
      user.status = UserStatus.Disabled;
      const updatedUser = await user.save();
      this.logger.info('Admin user deactivated successfully');

      return this.toAdminUserResponse(updatedUser);
    } catch (error) {
      this.logger.error(error, 'Admin deactivate user failed', { userId });
      throw error;
    }
  }

  private async findUserOrThrow(userId: string): Promise<UserDocument> {
    if (!isValidObjectId(userId)) {
      throw new NotFoundException('User not found');
    }

    try {
      const user = await this.userModel.findById(userId).exec();

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(error, 'Admin find user failed', { userId });
      throw error;
    }
  }

  private async ensureUsernameAndEmailAreAvailable(
    username: string,
    emailId: string,
    currentUserId?: string,
  ): Promise<void> {
    const existingUser = await this.userModel
      .findOne({
        $or: [{ username }, { emailId }],
      })
      .exec();

    if (existingUser && existingUser.id !== currentUserId) {
      throw new ConflictException('Username or email already exists');
    }
  }

  private toAdminUserResponse(user: UserDocument): AdminUserResponseDto {
    return {
      id: user.id,
      username: user.username,
      emailId: user.emailId,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isRootAdmin: user.isRootAdmin,
      status: user.status,
      createdByUserId: user.createdByUserId,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
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
