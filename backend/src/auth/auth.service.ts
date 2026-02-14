import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { username, email, password, displayName } = registerDto;

    // Check if user already exists
    const existingUser = await this.usersService.findByEmailOrUsername(email, username);
    if (existingUser) {
      throw new ConflictException('User with this email or username already exists');
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Create user
    const user = await this.usersService.create({
      username,
      email,
      password: hashedPassword,
      displayName: displayName || username,
    });

    // Generate JWT token
    const payload = { sub: user.id, username: user.username };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
        isOnline: user.isOnline,
        createdAt: user.createdAt,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const { identifier, password } = loginDto;

    // Find user by email or username
    const user = await this.usersService.findByEmailOrUsername(identifier, identifier);
    if (!user) {
      throw new UnauthorizedException('Incorrect email or password');
    }

    // Verify password
    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Incorrect email or password');
    }

    // Update user online status
    await this.usersService.updateOnlineStatus(user.id, true);

    // Generate JWT token
    const payload = { sub: user.id, username: user.username };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
        isOnline: true,
        createdAt: user.createdAt,
      },
    };
  }

  async validateUser(username: string, password: string) {
    const user = await this.usersService.findByEmailOrUsername(username, username);
    if (user && (await compare(password, user.password))) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async logout(userId: string) {
    // Update user offline status
    await this.usersService.updateOnlineStatus(userId, false);
    return { message: 'Logged out successfully' };
  }
}