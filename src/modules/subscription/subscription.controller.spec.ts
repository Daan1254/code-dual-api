import { Test, TestingModule } from '@nestjs/testing';
import { RequestWithAuth } from '../../core/auth/auth.guard';
import { SubscriptionDto } from './dto/subscription.dto';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';

describe('SubscriptionController', () => {
  let controller: SubscriptionController;
  let service: SubscriptionService;

  const mockSubscriptionService = {
    getCurrentSubscription: jest.fn(),
    getSubscriptions: jest.fn(),
    createCheckoutSession: jest.fn(),
    createCheckoutSessionForSubscription: jest.fn(),
    changeSubscription: jest.fn(),
    cancelSubscription: jest.fn(),
    createCustomerPortalSession: jest.fn(),
  };

  const mockRequest: RequestWithAuth = {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      username: 'testuser',
    },
  } as RequestWithAuth;

  const mockSubscriptionDto: SubscriptionDto = {
    id: 'prod_test123',
    name: 'Pro Plan',
    price: 1500,
    priceId: 'price_test123',
    status: 'active',
  };

  const mockSubscriptions: SubscriptionDto[] = [
    {
      id: 'prod_basic',
      name: 'Basic Plan',
      price: 999,
      priceId: 'price_basic',
      status: 'available',
    },
    {
      id: 'prod_pro',
      name: 'Pro Plan',
      price: 1500,
      priceId: 'price_pro',
      status: 'available',
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionController],
      providers: [
        {
          provide: SubscriptionService,
          useValue: mockSubscriptionService,
        },
      ],
    })
      .overrideGuard(require('../../core/auth/auth.guard').AuthGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    controller = module.get<SubscriptionController>(SubscriptionController);
    service = module.get<SubscriptionService>(SubscriptionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCurrentSubscription', () => {
    it('should return current subscription for authenticated user', async () => {
      mockSubscriptionService.getCurrentSubscription.mockResolvedValue(
        mockSubscriptionDto,
      );

      const result = await controller.getCurrentSubscription(mockRequest);

      expect(service.getCurrentSubscription).toHaveBeenCalledWith(
        'test-user-id',
      );
      expect(result).toEqual(mockSubscriptionDto);
    });

    it('should return null when user has no subscription', async () => {
      mockSubscriptionService.getCurrentSubscription.mockResolvedValue(null);

      const result = await controller.getCurrentSubscription(mockRequest);

      expect(service.getCurrentSubscription).toHaveBeenCalledWith(
        'test-user-id',
      );
      expect(result).toBeNull();
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      mockSubscriptionService.getCurrentSubscription.mockRejectedValue(error);

      await expect(
        controller.getCurrentSubscription(mockRequest),
      ).rejects.toThrow('Service error');
      expect(service.getCurrentSubscription).toHaveBeenCalledWith(
        'test-user-id',
      );
    });
  });

  describe('getSubscriptions', () => {
    it('should return all available subscriptions', async () => {
      mockSubscriptionService.getSubscriptions.mockResolvedValue(
        mockSubscriptions,
      );

      const result = await controller.getSubscriptions();

      expect(service.getSubscriptions).toHaveBeenCalled();
      expect(result).toEqual(mockSubscriptions);
      expect(result).toHaveLength(2);
    });

    it('should handle empty subscriptions list', async () => {
      mockSubscriptionService.getSubscriptions.mockResolvedValue([]);

      const result = await controller.getSubscriptions();

      expect(service.getSubscriptions).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should handle service errors', async () => {
      const error = new Error('Failed to fetch subscriptions');
      mockSubscriptionService.getSubscriptions.mockRejectedValue(error);

      await expect(controller.getSubscriptions()).rejects.toThrow(
        'Failed to fetch subscriptions',
      );
    });
  });

  describe('createCheckoutSession', () => {
    it('should create checkout session for authenticated user', async () => {
      const mockCheckoutResponse = { url: 'https://checkout.stripe.com/test' };
      mockSubscriptionService.createCheckoutSession.mockResolvedValue(
        mockCheckoutResponse,
      );

      const result = await controller.createCheckoutSession(mockRequest);

      expect(service.createCheckoutSession).toHaveBeenCalledWith(
        'test-user-id',
      );
      expect(result).toEqual(mockCheckoutResponse);
    });

    it('should handle stripe checkout errors', async () => {
      const error = new Error('Stripe checkout failed');
      mockSubscriptionService.createCheckoutSession.mockRejectedValue(error);

      await expect(
        controller.createCheckoutSession(mockRequest),
      ).rejects.toThrow('Stripe checkout failed');
    });
  });

  describe('createCheckoutSessionForSubscription', () => {
    it('should create checkout session for specific subscription', async () => {
      const priceId = 'price_test123';
      const mockCheckoutResponse = {
        url: 'https://checkout.stripe.com/test-specific',
      };
      mockSubscriptionService.createCheckoutSessionForSubscription.mockResolvedValue(
        mockCheckoutResponse,
      );

      const result = await controller.createCheckoutSessionForSubscription(
        mockRequest,
        priceId,
      );

      expect(service.createCheckoutSessionForSubscription).toHaveBeenCalledWith(
        'test-user-id',
        priceId,
      );
      expect(result).toEqual(mockCheckoutResponse);
    });

    it('should handle invalid price ID', async () => {
      const invalidPriceId = 'invalid_price';
      const error = new Error('Invalid price ID');
      mockSubscriptionService.createCheckoutSessionForSubscription.mockRejectedValue(
        error,
      );

      await expect(
        controller.createCheckoutSessionForSubscription(
          mockRequest,
          invalidPriceId,
        ),
      ).rejects.toThrow('Invalid price ID');
    });
  });

  describe('changeSubscription', () => {
    it('should successfully change subscription', async () => {
      const newPriceId = 'price_new123';
      const mockChangeResponse = {
        message: 'Subscription updated successfully',
        subscriptionId: 'sub_test123',
      };
      mockSubscriptionService.changeSubscription.mockResolvedValue(
        mockChangeResponse,
      );

      const result = await controller.changeSubscription(
        mockRequest,
        newPriceId,
      );

      expect(service.changeSubscription).toHaveBeenCalledWith(
        'test-user-id',
        newPriceId,
      );
      expect(result).toEqual(mockChangeResponse);
    });

    it('should handle change subscription with no active subscription', async () => {
      const priceId = 'price_test123';
      const error = new Error('No active subscription found');
      mockSubscriptionService.changeSubscription.mockRejectedValue(error);

      await expect(
        controller.changeSubscription(mockRequest, priceId),
      ).rejects.toThrow('No active subscription found');
    });

    it('should handle stripe customer not found', async () => {
      const priceId = 'price_test123';
      const error = new Error('User not found or no stripe customer ID');
      mockSubscriptionService.changeSubscription.mockRejectedValue(error);

      await expect(
        controller.changeSubscription(mockRequest, priceId),
      ).rejects.toThrow('User not found or no stripe customer ID');
    });
  });

  describe('cancelSubscription', () => {
    it('should successfully cancel subscription', async () => {
      const mockCancelResponse = {
        message:
          'Subscription will be canceled at the end of the billing period',
        subscriptionId: 'sub_test123',
      };
      mockSubscriptionService.cancelSubscription.mockResolvedValue(
        mockCancelResponse,
      );

      const result = await controller.cancelSubscription(mockRequest);

      expect(service.cancelSubscription).toHaveBeenCalledWith('test-user-id');
      expect(result).toEqual(mockCancelResponse);
    });

    it('should handle cancel with no active subscription', async () => {
      const error = new Error('No active subscription found');
      mockSubscriptionService.cancelSubscription.mockRejectedValue(error);

      await expect(controller.cancelSubscription(mockRequest)).rejects.toThrow(
        'No active subscription found',
      );
    });

    it('should handle user without stripe customer ID', async () => {
      const error = new Error('User not found or no stripe customer ID');
      mockSubscriptionService.cancelSubscription.mockRejectedValue(error);

      await expect(controller.cancelSubscription(mockRequest)).rejects.toThrow(
        'User not found or no stripe customer ID',
      );
    });
  });

  describe('createCustomerPortalSession', () => {
    it('should create customer portal session successfully', async () => {
      const mockPortalResponse = {
        url: 'https://billing.stripe.com/session/test',
      };
      mockSubscriptionService.createCustomerPortalSession.mockResolvedValue(
        mockPortalResponse,
      );

      const result = await controller.createCustomerPortalSession(mockRequest);

      expect(service.createCustomerPortalSession).toHaveBeenCalledWith(
        'test-user-id',
      );
      expect(result).toEqual(mockPortalResponse);
    });

    it('should handle user without stripe customer ID', async () => {
      const error = new Error('User not found or no stripe customer ID');
      mockSubscriptionService.createCustomerPortalSession.mockRejectedValue(
        error,
      );

      await expect(
        controller.createCustomerPortalSession(mockRequest),
      ).rejects.toThrow('User not found or no stripe customer ID');
    });

    it('should handle stripe portal creation errors', async () => {
      const error = new Error('Failed to create customer portal session');
      mockSubscriptionService.createCustomerPortalSession.mockRejectedValue(
        error,
      );

      await expect(
        controller.createCustomerPortalSession(mockRequest),
      ).rejects.toThrow('Failed to create customer portal session');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete subscription flow', async () => {
      // 1. User starts with no subscription
      mockSubscriptionService.getCurrentSubscription.mockResolvedValueOnce(
        null,
      );
      let currentSub = await controller.getCurrentSubscription(mockRequest);
      expect(currentSub).toBeNull();

      // 2. User views available subscriptions
      mockSubscriptionService.getSubscriptions.mockResolvedValueOnce(
        mockSubscriptions,
      );
      const availableSubscriptions = await controller.getSubscriptions();
      expect(availableSubscriptions).toHaveLength(2);

      // 3. User creates checkout session for a subscription
      const checkoutResponse = { url: 'https://checkout.stripe.com/test' };
      mockSubscriptionService.createCheckoutSessionForSubscription.mockResolvedValueOnce(
        checkoutResponse,
      );
      const checkout = await controller.createCheckoutSessionForSubscription(
        mockRequest,
        'price_pro',
      );
      expect(checkout.url).toContain('checkout.stripe.com');

      // 4. After payment, user has active subscription
      mockSubscriptionService.getCurrentSubscription.mockResolvedValueOnce({
        ...mockSubscriptionDto,
        status: 'active',
      });
      currentSub = await controller.getCurrentSubscription(mockRequest);
      expect(currentSub?.status).toBe('active');

      // 5. User can access customer portal
      const portalResponse = { url: 'https://billing.stripe.com/session/test' };
      mockSubscriptionService.createCustomerPortalSession.mockResolvedValueOnce(
        portalResponse,
      );
      const portal = await controller.createCustomerPortalSession(mockRequest);
      expect(portal.url).toContain('billing.stripe.com');
    });

    it('should handle subscription change flow', async () => {
      // User has active subscription
      mockSubscriptionService.getCurrentSubscription.mockResolvedValueOnce(
        mockSubscriptionDto,
      );
      const currentSub = await controller.getCurrentSubscription(mockRequest);
      expect(currentSub?.name).toBe('Pro Plan');

      // User changes to different plan
      const changeResponse = {
        message: 'Subscription updated successfully',
        subscriptionId: 'sub_new123',
      };
      mockSubscriptionService.changeSubscription.mockResolvedValueOnce(
        changeResponse,
      );
      const result = await controller.changeSubscription(
        mockRequest,
        'price_enterprise',
      );
      expect(result.message).toBe('Subscription updated successfully');
    });

    it('should handle subscription cancellation flow', async () => {
      // User has active subscription
      mockSubscriptionService.getCurrentSubscription.mockResolvedValueOnce(
        mockSubscriptionDto,
      );
      const currentSub = await controller.getCurrentSubscription(mockRequest);
      expect(currentSub?.status).toBe('active');

      // User cancels subscription
      const cancelResponse = {
        message:
          'Subscription will be canceled at the end of the billing period',
        subscriptionId: 'sub_test123',
      };
      mockSubscriptionService.cancelSubscription.mockResolvedValueOnce(
        cancelResponse,
      );
      const result = await controller.cancelSubscription(mockRequest);
      expect(result.message).toContain(
        'canceled at the end of the billing period',
      );
    });
  });
});
