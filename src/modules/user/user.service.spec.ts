import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RegisterDto } from '../../core/auth/dto/register.dto';
import { PrismaService } from '../../core/database/prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let prismaService: PrismaService;
  let subscriptionService: SubscriptionService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockSubscriptionService = {
    getCurrentSubscription: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: SubscriptionService,
          useValue: mockSubscriptionService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prismaService = module.get<PrismaService>(PrismaService);
    subscriptionService = module.get<SubscriptionService>(SubscriptionService);

    jest.clearAllMocks();
  });

  describe('getUserByEmail', () => {
    it('should return user when found', async () => {
      const email = 'test@example.com';
      const mockUser = {
        id: 'user-123',
        email,
        username: 'testuser',
        password: 'hashedpassword',
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.getUserByEmail(email);

      expect(result).toEqual(mockUser);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
    });

    it('should return null when user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getUserByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const registerDto: RegisterDto = {
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'password123',
        passwordConfirmation: 'password123',
      };

      const mockCreatedUser = {
        id: 'user-123',
        email: registerDto.email,
        username: registerDto.username,
        password: registerDto.password,
      };

      (prismaService.user.create as jest.Mock).mockResolvedValue(
        mockCreatedUser,
      );

      const result = await service.createUser(registerDto);

      expect(result).toEqual(mockCreatedUser);
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: registerDto.email,
          password: registerDto.password,
          username: registerDto.username,
        },
      });
    });
  });

  describe('isUsernameAvailable', () => {
    it('should return true when username is available', async () => {
      (prismaService.user.count as jest.Mock).mockResolvedValue(0);

      const result = await service.isUsernameAvailable('availableuser');

      expect(result).toBe(true);
      expect(prismaService.user.count).toHaveBeenCalledWith({
        where: { username: 'availableuser' },
      });
    });

    it('should return false when username is taken', async () => {
      (prismaService.user.count as jest.Mock).mockResolvedValue(1);

      const result = await service.isUsernameAvailable('takenuser');

      expect(result).toBe(false);
      expect(prismaService.user.count).toHaveBeenCalledWith({
        where: { username: 'takenuser' },
      });
    });

    it('should return false when multiple users have same username', async () => {
      (prismaService.user.count as jest.Mock).mockResolvedValue(2);

      const result = await service.isUsernameAvailable('duplicateuser');

      expect(result).toBe(false);
    });
  });

  describe('getProfile', () => {
    it('should return user profile without subscription when no stripe customer ID', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        username: 'testuser',
        stripeCustomerId: null,
        preferredLanguage: 'JAVASCRIPT',
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.getProfile(userId);

      expect(result).toEqual({
        ...mockUser,
        subscription: null,
      });
      expect(subscriptionService.getCurrentSubscription).not.toHaveBeenCalled();
    });

    it('should return user profile with subscription when stripe customer ID exists', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        username: 'testuser',
        stripeCustomerId: 'cus_123',
        preferredLanguage: 'JAVASCRIPT',
      };

      const mockSubscription = {
        id: 'sub-123',
        status: 'active',
        name: 'Premium Plan',
        price: 999,
        currency: 'eur',
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (
        subscriptionService.getCurrentSubscription as jest.Mock
      ).mockResolvedValue(mockSubscription);

      const result = await service.getProfile(userId);

      expect(result).toEqual({
        ...mockUser,
        subscription: mockSubscription,
      });
      expect(subscriptionService.getCurrentSubscription).toHaveBeenCalledWith(
        'cus_123',
      );
    });

    it('should return user profile with null subscription when subscription service returns null', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        username: 'testuser',
        stripeCustomerId: 'cus_123',
        preferredLanguage: 'JAVASCRIPT',
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (
        subscriptionService.getCurrentSubscription as jest.Mock
      ).mockResolvedValue(null);

      const result = await service.getProfile(userId);

      expect(result).toEqual({
        ...mockUser,
        subscription: null,
      });
      expect(subscriptionService.getCurrentSubscription).toHaveBeenCalledWith(
        'cus_123',
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getProfile('nonexistent-user')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getProfile('nonexistent-user')).rejects.toThrow(
        'User not found',
      );
    });

    it('should call prisma with correct parameters', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        username: 'testuser',
        stripeCustomerId: null,
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await service.getProfile(userId);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });

    it('should handle subscription service errors gracefully', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        username: 'testuser',
        stripeCustomerId: 'cus_123',
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (
        subscriptionService.getCurrentSubscription as jest.Mock
      ).mockRejectedValue(new Error('Stripe error'));

      // The service should propagate the error from SubscriptionService
      await expect(service.getProfile(userId)).rejects.toThrow('Stripe error');
    });
  });
});
