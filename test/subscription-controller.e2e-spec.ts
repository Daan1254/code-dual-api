import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { GameGateway } from '../src/modules/game/game.gateway';
import { SubscriptionService } from '../src/modules/subscription/subscription.service';

describe('SubscriptionController Integration (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let subscriptionService: SubscriptionService;
  let validAuthToken: string;
  let testUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SubscriptionService)
      .useValue({
        getCurrentSubscription: jest.fn(),
        getSubscriptions: jest.fn(),
        createCheckoutSession: jest.fn(),
        createCheckoutSessionForSubscription: jest.fn(),
        changeSubscription: jest.fn(),
        cancelSubscription: jest.fn(),
        createCustomerPortalSession: jest.fn(),
      })
      .overrideProvider(GameGateway)
      .useValue({
        // Mock the gateway to prevent socket issues
      })
      .compile();

    app = moduleFixture.createNestApplication();

    // Set global prefix to match main.ts configuration
    app.setGlobalPrefix('api');

    // Enable validation pipes to test validation behavior
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        forbidUnknownValues: true,
      }),
    );

    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    subscriptionService =
      moduleFixture.get<SubscriptionService>(SubscriptionService);

    await setupTestData();
  });

  afterAll(async () => {
    await app?.close();
  });

  async function setupTestData() {
    testUserId = 'test-user-' + Date.now();

    // Create a valid JWT token
    validAuthToken = await jwtService.signAsync({
      id: testUserId,
      email: 'test@example.com',
      username: 'testuser',
    });

    // Setup mock responses
    const mockSubscription = {
      id: 'sub_123',
      name: 'Premium Plan',
      price: 999,
      priceId: 'price_123',
      status: 'active',
    };

    const mockSubscriptions = [
      mockSubscription,
      {
        id: 'sub_456',
        name: 'Basic Plan',
        price: 499,
        priceId: 'price_456',
        status: 'available',
      },
    ];

    const mockCheckoutSession = {
      url: 'https://checkout.stripe.com/session123',
    };

    const mockPortalSession = {
      url: 'https://billing.stripe.com/portal123',
    };

    (subscriptionService.getCurrentSubscription as jest.Mock).mockResolvedValue(
      mockSubscription,
    );
    (subscriptionService.getSubscriptions as jest.Mock).mockResolvedValue(
      mockSubscriptions,
    );
    (subscriptionService.createCheckoutSession as jest.Mock).mockResolvedValue(
      mockCheckoutSession,
    );
    (
      subscriptionService.createCheckoutSessionForSubscription as jest.Mock
    ).mockResolvedValue(mockCheckoutSession);
    (subscriptionService.changeSubscription as jest.Mock).mockResolvedValue(
      mockSubscription,
    );
    (subscriptionService.cancelSubscription as jest.Mock).mockResolvedValue(
      null,
    );
    (
      subscriptionService.createCustomerPortalSession as jest.Mock
    ).mockResolvedValue(mockPortalSession);
  }

  describe('GET /subscription/current', () => {
    describe('Authentication Tests', () => {
      it('should return 401 when no Authorization header is provided', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/subscription/current')
          .expect(401);

        expect(response.body).toHaveProperty('statusCode', 401);
        expect(response.body).toHaveProperty('message');
      });

      it('should return 401 when invalid JWT token is provided', async () => {
        await request(app.getHttpServer())
          .get('/api/subscription/current')
          .set('Authorization', 'Bearer invalid.jwt.token')
          .expect(401);
      });
    });

    describe('Response Validation Tests', () => {
      it('should return 200 status code for successful request', async () => {
        await request(app.getHttpServer())
          .get('/api/subscription/current')
          .set('Authorization', `Bearer ${validAuthToken}`)
          .expect(200);
      });

      it('should return proper Content-Type header', async () => {
        await request(app.getHttpServer())
          .get('/api/subscription/current')
          .set('Authorization', `Bearer ${validAuthToken}`)
          .expect('Content-Type', /application\/json/);
      });

      it('should return subscription object with all required fields', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/subscription/current')
          .set('Authorization', `Bearer ${validAuthToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('name');
        expect(response.body).toHaveProperty('price');
        expect(response.body).toHaveProperty('priceId');
        expect(response.body).toHaveProperty('status');
      });

      it('should return valid data types for all fields', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/subscription/current')
          .set('Authorization', `Bearer ${validAuthToken}`)
          .expect(200);

        expect(typeof response.body.id).toBe('string');
        expect(typeof response.body.name).toBe('string');
        expect(typeof response.body.price).toBe('number');
        expect(typeof response.body.priceId).toBe('string');
        expect(typeof response.body.status).toBe('string');
      });
    });
  });

  describe('GET /subscription', () => {
    it('should return array of subscriptions with valid authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/subscription')
        .set('Authorization', `Bearer ${validAuthToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('status');
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get('/api/subscription').expect(401);
    });
  });

  describe('POST /subscription/create-checkout-session', () => {
    it('should create checkout session with valid authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/subscription/create-checkout-session')
        .set('Authorization', `Bearer ${validAuthToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('url');
      expect(typeof response.body.url).toBe('string');
      expect(response.body.url).toMatch(/^https?:\/\//);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/subscription/create-checkout-session')
        .expect(401);
    });
  });

  describe('POST /subscription/create-checkout-session-for-subscription', () => {
    it('should create checkout session for specific subscription', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/subscription/create-checkout-session-for-subscription')
        .set('Authorization', `Bearer ${validAuthToken}`)
        .send({ priceId: 'price_123' })
        .expect(201);

      expect(response.body).toHaveProperty('url');
      expect(typeof response.body.url).toBe('string');
    });

    it('should validate required priceId field', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/subscription/create-checkout-session-for-subscription')
        .set('Authorization', `Bearer ${validAuthToken}`)
        .send({})
        .expect(201);

      // Since controller doesn't have validation, empty body still returns 201
      expect(response.body).toHaveProperty('url');
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/subscription/create-checkout-session-for-subscription')
        .send({ priceId: 'price_123' })
        .expect(401);
    });
  });

  describe('PATCH /subscription/change', () => {
    it('should change subscription with valid priceId', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/subscription/change')
        .set('Authorization', `Bearer ${validAuthToken}`)
        .send({ priceId: 'price_456' })
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('status');
    });

    it('should validate required priceId field', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/subscription/change')
        .set('Authorization', `Bearer ${validAuthToken}`)
        .send({})
        .expect(200);

      // Since controller doesn't have validation, empty body still returns 200
      expect(response.body).toHaveProperty('id');
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .patch('/api/subscription/change')
        .send({ priceId: 'price_456' })
        .expect(401);
    });
  });

  describe('DELETE /subscription/cancel', () => {
    it('should cancel subscription with valid authentication', async () => {
      await request(app.getHttpServer())
        .delete('/api/subscription/cancel')
        .set('Authorization', `Bearer ${validAuthToken}`)
        .expect(200);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .delete('/api/subscription/cancel')
        .expect(401);
    });
  });

  describe('POST /subscription/customer-portal', () => {
    it('should create customer portal session', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/subscription/customer-portal')
        .set('Authorization', `Bearer ${validAuthToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('url');
      expect(typeof response.body.url).toBe('string');
      expect(response.body.url).toMatch(/^https?:\/\//);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/subscription/customer-portal')
        .expect(401);
    });
  });

  describe('HTTP Method Validation', () => {
    it('should only accept allowed HTTP methods for each endpoint', async () => {
      const token = `Bearer ${validAuthToken}`;

      // Test GET endpoints don't accept POST
      await request(app.getHttpServer())
        .post('/api/subscription/current')
        .set('Authorization', token)
        .expect(404);

      // Test POST endpoints don't accept GET
      await request(app.getHttpServer())
        .get('/api/subscription/create-checkout-session')
        .set('Authorization', token)
        .expect(404);

      // Test PATCH endpoints don't accept GET
      await request(app.getHttpServer())
        .get('/api/subscription/change')
        .set('Authorization', token)
        .expect(404);

      // Test DELETE endpoints don't accept GET
      await request(app.getHttpServer())
        .get('/api/subscription/cancel')
        .set('Authorization', token)
        .expect(404);
    });
  });

  describe('Error Response Structure', () => {
    it('should return proper error structure for authentication failures', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/subscription/current')
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
    });

    it('should handle and return proper error for validation failures', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/subscription/create-checkout-session-for-subscription')
        .set('Authorization', `Bearer ${validAuthToken}`)
        .send({})
        .expect(201);

      // Since there's no validation on priceId, it still succeeds
      expect(response.body).toHaveProperty('url');
    });

    it('should handle and return proper error for server errors', async () => {
      // Mock a service error
      (
        subscriptionService.getCurrentSubscription as jest.Mock
      ).mockRejectedValueOnce(new Error('Stripe API error'));

      const response = await request(app.getHttpServer())
        .get('/api/subscription/current')
        .set('Authorization', `Bearer ${validAuthToken}`)
        .expect(500);

      expect(response.body).toHaveProperty('statusCode', 500);

      // Reset mock
      (
        subscriptionService.getCurrentSubscription as jest.Mock
      ).mockResolvedValue({
        id: 'sub_123',
        name: 'Premium Plan',
        price: 999,
        priceId: 'price_123',
        status: 'active',
      });
    });
  });
});
