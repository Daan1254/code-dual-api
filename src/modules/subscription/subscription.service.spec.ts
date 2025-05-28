import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../core/database/prisma.service';
import { SubscriptionService } from './subscription.service';

// Mock Stripe SDK methods
const mockStripe = {
  products: {
    list: jest.fn(),
    retrieve: jest.fn(),
  },
  customers: {
    retrieve: jest.fn(),
    create: jest.fn(),
  },
  checkout: {
    sessions: {
      create: jest.fn(),
    },
  },
  subscriptions: {
    update: jest.fn(),
  },
  billingPortal: {
    sessions: {
      create: jest.fn(),
    },
  },
};

jest.mock('stripe', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => mockStripe),
  };
});

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let prismaService: PrismaService;

  // Mock environment variables
  const originalEnv = process.env;

  beforeEach(async () => {
    // Set up environment variables
    process.env = {
      ...originalEnv,
      STRIPE_SECRET_KEY: 'sk_test_mock_key',
      STRIPE_ACCOUNT_ID: 'acct_mock_account',
      FRONT_END_URL: 'http://localhost:3000',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should throw error if STRIPE_SECRET_KEY is not set', () => {
      delete process.env.STRIPE_SECRET_KEY;

      expect(() => {
        new SubscriptionService(prismaService);
      }).toThrow('STRIPE_SECRET_KEY or STRIPE_ACCOUNT_ID is not set');
    });

    it('should throw error if STRIPE_ACCOUNT_ID is not set', () => {
      delete process.env.STRIPE_ACCOUNT_ID;

      expect(() => {
        new SubscriptionService(prismaService);
      }).toThrow('STRIPE_SECRET_KEY or STRIPE_ACCOUNT_ID is not set');
    });
  });

  describe('getSubscriptions', () => {
    it('should return list of available subscriptions', async () => {
      const mockStripeProducts = {
        data: [
          {
            id: 'prod_123',
            name: 'Premium Plan',
            description: 'Premium features',
            default_price: {
              id: 'price_123',
              unit_amount: 999,
              currency: 'eur',
            },
          },
          {
            id: 'prod_456',
            name: 'Basic Plan',
            description: 'Basic features',
            default_price: {
              id: 'price_456',
              unit_amount: 499,
              currency: 'eur',
            },
          },
        ],
      };

      mockStripe.products.list.mockResolvedValue(mockStripeProducts);

      const result = await service.getSubscriptions();

      expect(mockStripe.products.list).toHaveBeenCalledWith({
        active: true,
        expand: ['data.default_price'],
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        status: 'available',
      });
    });

    it('should handle empty subscription list', async () => {
      mockStripe.products.list.mockResolvedValue({ data: [] });

      const result = await service.getSubscriptions();

      expect(result).toEqual([]);
    });
  });

  describe('getCurrentSubscription', () => {
    it('should return null if user has no stripe customer ID', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        stripeCustomerId: null,
      });

      const result = await service.getCurrentSubscription('user123');

      expect(result).toBeNull();
    });

    it('should return null if user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getCurrentSubscription('user123');

      expect(result).toBeNull();
    });

    it('should return current subscription for user with active subscription', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        stripeCustomerId: 'cus_123',
      };

      const mockCustomer = {
        subscriptions: {
          data: [
            {
              id: 'sub_123',
              status: 'active',
              items: {
                data: [
                  {
                    price: {
                      product: 'prod_123',
                    },
                  },
                ],
              },
            },
          ],
        },
      };

      const mockProduct = {
        id: 'prod_123',
        name: 'Premium Plan',
        default_price: {
          unit_amount: 999,
          currency: 'eur',
        },
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockStripe.customers.retrieve.mockResolvedValue(mockCustomer);
      mockStripe.products.retrieve.mockResolvedValue(mockProduct);

      const result = await service.getCurrentSubscription('user123');

      expect(result).toMatchObject({
        status: 'active',
      });
      expect(mockStripe.products.retrieve).toHaveBeenCalledWith('prod_123', {
        expand: ['default_price'],
      });
    });

    it('should return null if customer has no active subscriptions', async () => {
      const mockUser = {
        id: 'user123',
        stripeCustomerId: 'cus_123',
      };

      const mockCustomer = {
        subscriptions: {
          data: [],
        },
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockStripe.customers.retrieve.mockResolvedValue(mockCustomer);

      const result = await service.getCurrentSubscription('user123');

      expect(result).toBeNull();
    });
  });

  describe('createCheckoutSession', () => {
    it('should create checkout session for new customer', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        stripeCustomerId: null,
      };

      const mockCustomer = {
        id: 'cus_123',
        email: 'test@example.com',
      };

      const mockSession = {
        url: 'https://checkout.stripe.com/session123',
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockStripe.customers.create.mockResolvedValue(mockCustomer);
      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession);

      const result = await service.createCheckoutSession('user123');

      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
      });
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_123',
        mode: 'subscription',
        line_items: [
          {
            price: 'price_1RQR6vBob58MyrDKKHM4hFJg',
            quantity: 1,
          },
        ],
        success_url: 'http://localhost:3000/dashboard/subscriptions',
        cancel_url: 'http://localhost:3000/dashboard/subscriptions',
      });
      expect(result).toEqual({ url: 'https://checkout.stripe.com/session123' });
    });

    it('should create checkout session for existing customer', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        stripeCustomerId: 'cus_existing',
      };

      const mockCustomer = {
        id: 'cus_existing',
        email: 'test@example.com',
      };

      const mockSession = {
        url: 'https://checkout.stripe.com/session123',
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockStripe.customers.retrieve.mockResolvedValue(mockCustomer);
      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession);

      const result = await service.createCheckoutSession('user123');

      expect(mockStripe.customers.retrieve).toHaveBeenCalledWith(
        'cus_existing',
      );
      expect(mockStripe.customers.create).not.toHaveBeenCalled();
      expect(result).toEqual({ url: 'https://checkout.stripe.com/session123' });
    });

    it('should throw error if user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.createCheckoutSession('user123')).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('changeSubscription', () => {
    it('should successfully change subscription', async () => {
      const mockUser = {
        id: 'user123',
        stripeCustomerId: 'cus_123',
      };

      const mockCustomer = {
        subscriptions: {
          data: [
            {
              id: 'sub_123',
              items: {
                data: [{ id: 'si_123' }],
              },
            },
          ],
        },
      };

      const mockUpdatedSubscription = {
        id: 'sub_123',
        status: 'active',
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockStripe.customers.retrieve.mockResolvedValue(mockCustomer);
      mockStripe.subscriptions.update.mockResolvedValue(
        mockUpdatedSubscription,
      );

      const result = await service.changeSubscription('user123', 'price_new');

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_123', {
        items: [
          {
            id: 'si_123',
            price: 'price_new',
          },
        ],
        proration_behavior: 'create_prorations',
      });
      expect(result).toEqual({
        message: 'Subscription updated successfully',
        subscriptionId: 'sub_123',
      });
    });

    it('should throw BadRequestException if user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.changeSubscription('user123', 'price_new'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if user has no stripe customer ID', async () => {
      const mockUser = {
        id: 'user123',
        stripeCustomerId: null,
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.changeSubscription('user123', 'price_new'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no active subscription found', async () => {
      const mockUser = {
        id: 'user123',
        stripeCustomerId: 'cus_123',
      };

      const mockCustomer = {
        subscriptions: {
          data: [],
        },
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockStripe.customers.retrieve.mockResolvedValue(mockCustomer);

      await expect(
        service.changeSubscription('user123', 'price_new'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelSubscription', () => {
    it('should successfully cancel subscription', async () => {
      const mockUser = {
        id: 'user123',
        stripeCustomerId: 'cus_123',
      };

      const mockCustomer = {
        subscriptions: {
          data: [
            {
              id: 'sub_123',
            },
          ],
        },
      };

      const mockCanceledSubscription = {
        id: 'sub_123',
        cancel_at_period_end: true,
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockStripe.customers.retrieve.mockResolvedValue(mockCustomer);
      mockStripe.subscriptions.update.mockResolvedValue(
        mockCanceledSubscription,
      );

      const result = await service.cancelSubscription('user123');

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_123', {
        cancel_at_period_end: true,
      });
      expect(result).toEqual({
        message:
          'Subscription will be canceled at the end of the billing period',
        subscriptionId: 'sub_123',
      });
    });

    it('should throw error if user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.cancelSubscription('user123')).rejects.toThrow(
        'User not found or no stripe customer ID',
      );
    });

    it('should throw error if no active subscription found', async () => {
      const mockUser = {
        id: 'user123',
        stripeCustomerId: 'cus_123',
      };

      const mockCustomer = {
        subscriptions: {
          data: [],
        },
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockStripe.customers.retrieve.mockResolvedValue(mockCustomer);

      await expect(service.cancelSubscription('user123')).rejects.toThrow(
        'No active subscription found',
      );
    });
  });

  describe('createCheckoutSessionForSubscription', () => {
    it('should create checkout session for specific subscription and new customer', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        stripeCustomerId: null,
      };

      const mockCustomer = {
        id: 'cus_123',
        email: 'test@example.com',
      };

      const mockSession = {
        url: 'https://checkout.stripe.com/session123',
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockStripe.customers.create.mockResolvedValue(mockCustomer);
      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession);

      const result = await service.createCheckoutSessionForSubscription(
        'user123',
        'price_specific',
      );

      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
      });
      expect(prismaService.user.update as jest.Mock).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: { stripeCustomerId: 'cus_123' },
      });
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_123',
        mode: 'subscription',
        line_items: [
          {
            price: 'price_specific',
            quantity: 1,
          },
        ],
        success_url: 'http://localhost:3000/dashboard/subscriptions',
        cancel_url: 'http://localhost:3000/dashboard/subscriptions',
      });
      expect(result).toEqual({ url: 'https://checkout.stripe.com/session123' });
    });

    it('should create checkout session for existing customer', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        stripeCustomerId: 'cus_existing',
      };

      const mockCustomer = {
        id: 'cus_existing',
        email: 'test@example.com',
      };

      const mockSession = {
        url: 'https://checkout.stripe.com/session123',
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockStripe.customers.retrieve.mockResolvedValue(mockCustomer);
      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession);

      const result = await service.createCheckoutSessionForSubscription(
        'user123',
        'price_specific',
      );

      expect(mockStripe.customers.retrieve).toHaveBeenCalledWith(
        'cus_existing',
      );
      expect(mockStripe.customers.create).not.toHaveBeenCalled();
      expect(prismaService.user.update as jest.Mock).not.toHaveBeenCalled();
      expect(result).toEqual({ url: 'https://checkout.stripe.com/session123' });
    });

    it('should throw error if user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createCheckoutSessionForSubscription(
          'user123',
          'price_specific',
        ),
      ).rejects.toThrow('User not found');
    });
  });

  describe('createCustomerPortalSession', () => {
    it('should create customer portal session', async () => {
      const mockUser = {
        id: 'user123',
        stripeCustomerId: 'cus_123',
      };

      const mockSession = {
        url: 'https://billing.stripe.com/session123',
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockStripe.billingPortal.sessions.create.mockResolvedValue(mockSession);

      const result = await service.createCustomerPortalSession('user123');

      expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_123',
        return_url: 'http://localhost:3000/dashboard',
      });
      expect(result).toEqual({ url: 'https://billing.stripe.com/session123' });
    });

    it('should throw error if user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createCustomerPortalSession('user123'),
      ).rejects.toThrow('User not found or no stripe customer ID');
    });

    it('should throw error if user has no stripe customer ID', async () => {
      const mockUser = {
        id: 'user123',
        stripeCustomerId: null,
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.createCustomerPortalSession('user123'),
      ).rejects.toThrow('User not found or no stripe customer ID');
    });
  });
});
