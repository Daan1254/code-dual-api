import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../../modules/user/user.service';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { SignInDto } from './dto/signin.dto';

// Mock bcrypt module
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

import { compare, hash } from 'bcrypt';
const mockCompare = compare as any;
const mockHash = hash as any;

describe('AuthService', () => {
  let service: AuthService;
  let userService: UserService;
  let jwtService: JwtService;

  const mockUserService = {
    getUserByEmail: jest.fn(),
    isUsernameAvailable: jest.fn(),
    createUser: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  describe('signIn', () => {
    const signInDto: SignInDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should return access token for valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashedpassword',
      };

      const expectedToken = 'jwt-token-123';

      (mockUserService.getUserByEmail as jest.Mock).mockResolvedValue(mockUser);
      mockCompare.mockResolvedValue(true);
      (mockJwtService.signAsync as jest.Mock).mockResolvedValue(expectedToken);

      const result = await service.signIn(signInDto);

      expect(result).toEqual({ access_token: expectedToken });
      expect(mockUserService.getUserByEmail).toHaveBeenCalledWith(
        signInDto.email,
      );
      expect(mockCompare).toHaveBeenCalledWith(
        signInDto.password,
        mockUser.password,
      );
      expect(mockJwtService.signAsync).toHaveBeenCalledWith({
        ...mockUser,
        password: undefined,
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      (mockUserService.getUserByEmail as jest.Mock).mockResolvedValue(null);

      await expect(service.signIn(signInDto)).rejects.toThrow(
        new UnauthorizedException('User not found'),
      );

      expect(mockUserService.getUserByEmail).toHaveBeenCalledWith(
        signInDto.email,
      );
      expect(mockCompare).not.toHaveBeenCalled();
      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashedpassword',
      };

      (mockUserService.getUserByEmail as jest.Mock).mockResolvedValue(mockUser);
      mockCompare.mockResolvedValue(false);

      await expect(service.signIn(signInDto)).rejects.toThrow(
        new UnauthorizedException('Invalid password'),
      );

      expect(mockUserService.getUserByEmail).toHaveBeenCalledWith(
        signInDto.email,
      );
      expect(mockCompare).toHaveBeenCalledWith(
        signInDto.password,
        mockUser.password,
      );
      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should handle bcrypt compare errors', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashedpassword',
      };

      (mockUserService.getUserByEmail as jest.Mock).mockResolvedValue(mockUser);
      mockCompare.mockRejectedValue(new Error('Bcrypt error'));

      await expect(service.signIn(signInDto)).rejects.toThrow('Bcrypt error');

      expect(mockUserService.getUserByEmail).toHaveBeenCalledWith(
        signInDto.email,
      );
      expect(mockCompare).toHaveBeenCalledWith(
        signInDto.password,
        mockUser.password,
      );
      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'newuser@example.com',
      username: 'newuser',
      password: 'password123',
      passwordConfirmation: 'password123',
    };

    it('should register new user successfully', async () => {
      const hashedPassword = 'hashedpassword123';
      const mockCreatedUser = {
        id: 'user-123',
        email: registerDto.email,
        username: registerDto.username,
        password: hashedPassword,
      };
      const expectedToken = 'jwt-token-123';

      (mockUserService.getUserByEmail as jest.Mock).mockResolvedValue(null);
      (mockUserService.isUsernameAvailable as jest.Mock).mockResolvedValue(
        true,
      );
      mockHash.mockResolvedValue(hashedPassword);
      (mockUserService.createUser as jest.Mock).mockResolvedValue(
        mockCreatedUser,
      );
      (mockJwtService.signAsync as jest.Mock).mockResolvedValue(expectedToken);

      const result = await service.register(registerDto);

      expect(result).toEqual({ access_token: expectedToken });
      expect(mockUserService.getUserByEmail).toHaveBeenCalledWith(
        registerDto.email,
      );
      expect(mockUserService.isUsernameAvailable).toHaveBeenCalledWith(
        registerDto.username,
      );
      expect(mockHash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(mockUserService.createUser).toHaveBeenCalledWith({
        ...registerDto,
        password: hashedPassword,
      });
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(mockCreatedUser);
    });

    it('should throw BadRequestException when user already exists', async () => {
      const existingUser = {
        id: 'existing-user',
        email: registerDto.email,
        username: 'existinguser',
        password: 'hashedpassword',
      };

      (mockUserService.getUserByEmail as jest.Mock).mockResolvedValue(
        existingUser,
      );

      await expect(service.register(registerDto)).rejects.toThrow(
        new BadRequestException('User already exists'),
      );

      expect(mockUserService.getUserByEmail).toHaveBeenCalledWith(
        registerDto.email,
      );
      expect(mockUserService.isUsernameAvailable).not.toHaveBeenCalled();
      expect(mockHash).not.toHaveBeenCalled();
      expect(mockUserService.createUser).not.toHaveBeenCalled();
      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when password confirmation does not match', async () => {
      const invalidRegisterDto: RegisterDto = {
        ...registerDto,
        passwordConfirmation: 'differentpassword',
      };

      (mockUserService.getUserByEmail as jest.Mock).mockResolvedValue(null);

      await expect(service.register(invalidRegisterDto)).rejects.toThrow(
        new BadRequestException('Password confirmation does not match'),
      );

      expect(mockUserService.getUserByEmail).toHaveBeenCalledWith(
        invalidRegisterDto.email,
      );
      expect(mockUserService.isUsernameAvailable).not.toHaveBeenCalled();
      expect(mockHash).not.toHaveBeenCalled();
      expect(mockUserService.createUser).not.toHaveBeenCalled();
      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when username is not available', async () => {
      (mockUserService.getUserByEmail as jest.Mock).mockResolvedValue(null);
      (mockUserService.isUsernameAvailable as jest.Mock).mockResolvedValue(
        false,
      );

      await expect(service.register(registerDto)).rejects.toThrow(
        new BadRequestException('Username already exists'),
      );

      expect(mockUserService.getUserByEmail).toHaveBeenCalledWith(
        registerDto.email,
      );
      expect(mockUserService.isUsernameAvailable).toHaveBeenCalledWith(
        registerDto.username,
      );
      expect(mockHash).not.toHaveBeenCalled();
      expect(mockUserService.createUser).not.toHaveBeenCalled();
      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should handle bcrypt hash errors', async () => {
      (mockUserService.getUserByEmail as jest.Mock).mockResolvedValue(null);
      (mockUserService.isUsernameAvailable as jest.Mock).mockResolvedValue(
        true,
      );
      mockHash.mockRejectedValue(new Error('Hash error'));

      await expect(service.register(registerDto)).rejects.toThrow('Hash error');

      expect(mockUserService.getUserByEmail).toHaveBeenCalledWith(
        registerDto.email,
      );
      expect(mockUserService.isUsernameAvailable).toHaveBeenCalledWith(
        registerDto.username,
      );
      expect(mockHash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(mockUserService.createUser).not.toHaveBeenCalled();
      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should handle user creation errors', async () => {
      const hashedPassword = 'hashedpassword123';

      (mockUserService.getUserByEmail as jest.Mock).mockResolvedValue(null);
      (mockUserService.isUsernameAvailable as jest.Mock).mockResolvedValue(
        true,
      );
      mockHash.mockResolvedValue(hashedPassword);
      (mockUserService.createUser as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.register(registerDto)).rejects.toThrow(
        'Database error',
      );

      expect(mockUserService.getUserByEmail).toHaveBeenCalledWith(
        registerDto.email,
      );
      expect(mockUserService.isUsernameAvailable).toHaveBeenCalledWith(
        registerDto.username,
      );
      expect(mockHash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(mockUserService.createUser).toHaveBeenCalledWith({
        ...registerDto,
        password: hashedPassword,
      });
      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should handle JWT signing errors', async () => {
      const hashedPassword = 'hashedpassword123';
      const mockCreatedUser = {
        id: 'user-123',
        email: registerDto.email,
        username: registerDto.username,
        password: hashedPassword,
      };

      (mockUserService.getUserByEmail as jest.Mock).mockResolvedValue(null);
      (mockUserService.isUsernameAvailable as jest.Mock).mockResolvedValue(
        true,
      );
      mockHash.mockResolvedValue(hashedPassword);
      (mockUserService.createUser as jest.Mock).mockResolvedValue(
        mockCreatedUser,
      );
      (mockJwtService.signAsync as jest.Mock).mockRejectedValue(
        new Error('JWT error'),
      );

      await expect(service.register(registerDto)).rejects.toThrow('JWT error');

      expect(mockUserService.getUserByEmail).toHaveBeenCalledWith(
        registerDto.email,
      );
      expect(mockUserService.isUsernameAvailable).toHaveBeenCalledWith(
        registerDto.username,
      );
      expect(mockHash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(mockUserService.createUser).toHaveBeenCalledWith({
        ...registerDto,
        password: hashedPassword,
      });
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(mockCreatedUser);
    });
  });
});
