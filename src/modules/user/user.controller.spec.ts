import { Test, TestingModule } from '@nestjs/testing';
import { RequestWithAuth } from '../../core/auth/auth.guard';
import { UserDto } from '../../core/auth/dto/user.dto';
import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('UserController', () => {
  let controller: UserController;
  let service: UserService;

  const mockUserService = {
    getProfile: jest.fn(),
  };

  const mockRequest: RequestWithAuth = {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      username: 'testuser',
    },
  } as RequestWithAuth;

  const mockUserDto: UserDto = {
    id: 'test-user-id',
    email: 'test@example.com',
    username: 'testuser',
    subscription: undefined,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    })
      .overrideGuard(require('../../core/auth/auth.guard').AuthGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    controller = module.get<UserController>(UserController);
    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      mockUserService.getProfile.mockResolvedValue(mockUserDto);

      const result = await controller.getProfile(mockRequest);

      expect(service.getProfile).toHaveBeenCalledWith('test-user-id');
      expect(result).toEqual(mockUserDto);
    });

    it('should handle user with different email format', async () => {
      const userWithDifferentEmail: UserDto = {
        id: 'user-2',
        email: 'john.doe+test@company.co.uk',
        username: 'johndoe',
        subscription: undefined,
      };

      const requestWithDifferentUser: RequestWithAuth = {
        user: {
          id: 'user-2',
          email: 'john.doe+test@company.co.uk',
          username: 'johndoe',
        },
      } as RequestWithAuth;

      mockUserService.getProfile.mockResolvedValue(userWithDifferentEmail);

      const result = await controller.getProfile(requestWithDifferentUser);

      expect(service.getProfile).toHaveBeenCalledWith('user-2');
      expect(result).toEqual(userWithDifferentEmail);
      expect(result.email).toContain('+');
      expect(result.email).toContain('.co.uk');
    });

    it('should handle user with special characters in username', async () => {
      const userWithSpecialChars: UserDto = {
        id: 'user-3',
        email: 'special@example.com',
        username: 'user_123-test',
        subscription: undefined,
      };

      const requestWithSpecialUser: RequestWithAuth = {
        user: {
          id: 'user-3',
          email: 'special@example.com',
          username: 'user_123-test',
        },
      } as RequestWithAuth;

      mockUserService.getProfile.mockResolvedValue(userWithSpecialChars);

      const result = await controller.getProfile(requestWithSpecialUser);

      expect(service.getProfile).toHaveBeenCalledWith('user-3');
      expect(result.username).toContain('_');
      expect(result.username).toContain('-');
    });

    it('should handle user with subscription', async () => {
      const userWithSubscription: UserDto = {
        id: 'user-with-sub',
        email: 'subscriber@example.com',
        username: 'subscriber',
        subscription: {
          id: 'prod_premium',
          name: 'Premium Plan',
          price: 1999,
          priceId: 'price_premium123',
          status: 'active',
        },
      };

      const requestWithSubscriber: RequestWithAuth = {
        user: {
          id: 'user-with-sub',
          email: 'subscriber@example.com',
          username: 'subscriber',
        },
      } as RequestWithAuth;

      mockUserService.getProfile.mockResolvedValue(userWithSubscription);

      const result = await controller.getProfile(requestWithSubscriber);

      expect(service.getProfile).toHaveBeenCalledWith('user-with-sub');
      expect(result.subscription).toBeDefined();
      expect(result.subscription?.name).toBe('Premium Plan');
      expect(result.subscription?.status).toBe('active');
    });

    it('should handle service errors', async () => {
      const error = new Error('Failed to fetch user profile');
      mockUserService.getProfile.mockRejectedValue(error);

      await expect(controller.getProfile(mockRequest)).rejects.toThrow(
        'Failed to fetch user profile',
      );
      expect(service.getProfile).toHaveBeenCalledWith('test-user-id');
    });

    it('should handle user not found error', async () => {
      const error = new Error('User not found');
      mockUserService.getProfile.mockRejectedValue(error);

      await expect(controller.getProfile(mockRequest)).rejects.toThrow(
        'User not found',
      );
      expect(service.getProfile).toHaveBeenCalledWith('test-user-id');
    });

    it('should handle database connection error', async () => {
      const error = new Error('Database connection failed');
      mockUserService.getProfile.mockRejectedValue(error);

      await expect(controller.getProfile(mockRequest)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should handle user without subscription', async () => {
      const userWithoutSubscription: UserDto = {
        id: 'user-free',
        email: 'free@example.com',
        username: 'freeuser',
        subscription: undefined,
      };

      const requestWithFreeUser: RequestWithAuth = {
        user: {
          id: 'user-free',
          email: 'free@example.com',
          username: 'freeuser',
        },
      } as RequestWithAuth;

      mockUserService.getProfile.mockResolvedValue(userWithoutSubscription);

      const result = await controller.getProfile(requestWithFreeUser);

      expect(result.subscription).toBeUndefined();
      expect(result.username).toBe('freeuser');
    });

    it('should handle long username', async () => {
      const userWithLongName: UserDto = {
        id: 'user-5',
        email: 'long@example.com',
        username: 'this_is_a_very_long_username_that_might_be_used_in_testing',
        subscription: undefined,
      };

      const requestWithLongUser: RequestWithAuth = {
        user: {
          id: 'user-5',
          email: 'long@example.com',
          username:
            'this_is_a_very_long_username_that_might_be_used_in_testing',
        },
      } as RequestWithAuth;

      mockUserService.getProfile.mockResolvedValue(userWithLongName);

      const result = await controller.getProfile(requestWithLongUser);

      expect(result.username.length).toBeGreaterThan(20);
      expect(result.username).toBe(
        'this_is_a_very_long_username_that_might_be_used_in_testing',
      );
    });
  });
});
