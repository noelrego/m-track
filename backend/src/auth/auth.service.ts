import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { compare, hash } from 'bcryptjs';
import { Model } from 'mongoose';
import type { JwtPayload, LoginDto, RegisterDto } from '../common';
import { User, UserDocument } from '../schemas/auth.schema';

@Injectable()
export class AuthService {
  private readonly jwtExpiresIn: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {
    this.jwtExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '1h');
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.userModel
      .exists({
        $or: [{ username: registerDto.username }, { emailId: registerDto.emailid }],
      })
      .exec();

    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    let user: UserDocument;

    try {
      const passwordHash = await hash(registerDto.password, 12);
      user = await this.userModel.create({
        username: registerDto.username,
        emailId: registerDto.emailid,
        passwordHash,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
      });
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException('Username or email already exists');
      }

      throw error;
    }

    return {
      id: user.id,
      username: user.username,
      emailId: user.emailId,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.userModel
      .findOne({ username: loginDto.username })
      .select('+passwordHash')
      .exec();

    if (!user || !(await compare(loginDto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      emailId: user.emailId,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      tokenType: 'Bearer',
      expiresIn: this.jwtExpiresIn,
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
