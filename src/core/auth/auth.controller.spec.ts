import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { SignInDto } from './dto/signin.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    signIn: jest.fn(),
    register: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  describe('signIn', () => {
    const signInDto: SignInDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should return access token on successful login', async () => {
      const expectedResult = { access_token: 'jwt-token-123' };

      (mockAuthService.signIn as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.signIn(signInDto);

      expect(result).toEqual(expectedResult);
      expect(mockAuthService.signIn).toHaveBeenCalledWith(signInDto);
      expect(mockAuthService.signIn).toHaveBeenCalledTimes(1);
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      (mockAuthService.signIn as jest.Mock).mockRejectedValue(
        new UnauthorizedException('User not found'),
      );

      await expect(controller.signIn(signInDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(controller.signIn(signInDto)).rejects.toThrow(
        'User not found',
      );

      expect(mockAuthService.signIn).toHaveBeenCalledWith(signInDto);
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      (mockAuthService.signIn as jest.Mock).mockRejectedValue(
        new UnauthorizedException('Invalid password'),
      );

      await expect(controller.signIn(signInDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(controller.signIn(signInDto)).rejects.toThrow(
        'Invalid password',
      );

      expect(mockAuthService.signIn).toHaveBeenCalledWith(signInDto);
    });

    it('should handle service errors gracefully', async () => {
      (mockAuthService.signIn as jest.Mock).mockRejectedValue(
        new Error('Database connection error'),
      );

      await expect(controller.signIn(signInDto)).rejects.toThrow(
        'Database connection error',
      );

      expect(mockAuthService.signIn).toHaveBeenCalledWith(signInDto);
    });

    it('should call signIn with correct email and password', async () => {
      const expectedResult = { access_token: 'jwt-token-123' };
      (mockAuthService.signIn as jest.Mock).mockResolvedValue(expectedResult);

      await controller.signIn(signInDto);

      expect(mockAuthService.signIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'newuser@example.com',
      username: 'newuser',
      password: 'password123',
      passwordConfirmation: 'password123',
    };

    it('should return access token on successful registration', async () => {
      const expectedResult = { access_token: 'jwt-token-456' };

      (mockAuthService.register as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.register(registerDto);

      expect(result).toEqual(expectedResult);
      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
      expect(mockAuthService.register).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException when user already exists', async () => {
      (mockAuthService.register as jest.Mock).mockRejectedValue(
        new BadRequestException('User already exists'),
      );

      await expect(controller.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.register(registerDto)).rejects.toThrow(
        'User already exists',
      );

      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
    });

    it('should throw BadRequestException when password confirmation does not match', async () => {
      (mockAuthService.register as jest.Mock).mockRejectedValue(
        new BadRequestException('Password confirmation does not match'),
      );

      await expect(controller.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.register(registerDto)).rejects.toThrow(
        'Password confirmation does not match',
      );

      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
    });

    it('should throw BadRequestException when username already exists', async () => {
      (mockAuthService.register as jest.Mock).mockRejectedValue(
        new BadRequestException('Username already exists'),
      );

      await expect(controller.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.register(registerDto)).rejects.toThrow(
        'Username already exists',
      );

      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
    });

    it('should handle service errors gracefully', async () => {
      (mockAuthService.register as jest.Mock).mockRejectedValue(
        new Error('Database connection error'),
      );

      await expect(controller.register(registerDto)).rejects.toThrow(
        'Database connection error',
      );

      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
    });

    it('should call register with all required fields', async () => {
      const expectedResult = { access_token: 'jwt-token-456' };
      (mockAuthService.register as jest.Mock).mockResolvedValue(expectedResult);

      await controller.register(registerDto);

      expect(mockAuthService.register).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'password123',
        passwordConfirmation: 'password123',
      });
    });

    it('should handle empty request body gracefully', async () => {
      const emptyDto = {} as RegisterDto;

      (mockAuthService.register as jest.Mock).mockRejectedValue(
        new BadRequestException('Validation failed'),
      );

      await expect(controller.register(emptyDto)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockAuthService.register).toHaveBeenCalledWith(emptyDto);
    });

    it('should handle partial request body gracefully', async () => {
      const partialDto = {
        email: 'test@example.com',
        username: 'testuser',
      } as RegisterDto;

      (mockAuthService.register as jest.Mock).mockRejectedValue(
        new BadRequestException('Validation failed'),
      );

      await expect(controller.register(partialDto)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockAuthService.register).toHaveBeenCalledWith(partialDto);
    });
  });

  describe('controller structure', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have signIn method', () => {
      expect(controller.signIn).toBeDefined();
      expect(typeof controller.signIn).toBe('function');
    });

    it('should have register method', () => {
      expect(controller.register).toBeDefined();
      expect(typeof controller.register).toBe('function');
    });
  });
});
