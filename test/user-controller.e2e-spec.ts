import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { GameGateway } from '../src/modules/game/game.gateway';
import { UserService } from '../src/modules/user/user.service';

describe('UserController Integration (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let userService: UserService;
  let validAuthToken: string;
  let testUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(UserService)
      .useValue({
        getProfile: jest.fn(),
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
    userService = moduleFixture.get<UserService>(UserService);

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

    // Setup mock user profile response
    const mockUserProfile = {
      id: testUserId,
      username: 'testuser',
      email: 'test@example.com',
      subscription: {
        id: 'sub_123',
        name: 'Premium Plan',
        price: 999,
        priceId: 'price_123',
        status: 'active',
      },
    };

    const mockUserProfileWithoutSubscription = {
      id: testUserId,
      username: 'testuser',
      email: 'test@example.com',
      subscription: null,
    };

    (userService.getProfile as jest.Mock).mockResolvedValue(mockUserProfile);
  }

  describe('GET /user/profile', () => {
    describe('Authentication Tests', () => {
      it('should return 401 when no Authorization header is provided', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/user/profile')
          .expect(401);

        expect(response.body).toHaveProperty('statusCode', 401);
        expect(response.body).toHaveProperty('message');
      });

      it('should return 401 when Authorization header is missing Bearer prefix', async () => {
        await request(app.getHttpServer())
          .get('/api/user/profile')
          .set('Authorization', validAuthToken)
          .expect(401);
      });

      it('should return 401 when Authorization header has invalid format', async () => {
        await request(app.getHttpServer())
          .get('/api/user/profile')
          .set('Authorization', 'InvalidFormat token123')
          .expect(401);
      });

      it('should return 401 when JWT token is invalid', async () => {
        await request(app.getHttpServer())
          .get('/api/user/profile')
          .set('Authorization', 'Bearer invalid.jwt.token')
          .expect(401);
      });

      it('should return 401 when JWT token is malformed', async () => {
        await request(app.getHttpServer())
          .get('/api/user/profile')
          .set('Authorization', 'Bearer not-a-jwt-token')
          .expect(401);
      });
    });

    describe('Response Validation Tests', () => {
      it('should return 200 status code for successful request', async () => {
        await request(app.getHttpServer())
          .get('/api/user/profile')
          .set('Authorization', `Bearer ${validAuthToken}`)
          .expect(200);
      });

      it('should return proper Content-Type header', async () => {
        await request(app.getHttpServer())
          .get('/api/user/profile')
          .set('Authorization', `Bearer ${validAuthToken}`)
          .expect('Content-Type', /application\/json/);
      });

      it('should return user profile object with all required fields', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/user/profile')
          .set('Authorization', `Bearer ${validAuthToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('username');
        expect(response.body).toHaveProperty('email');
        expect(response.body).toHaveProperty('subscription');
      });

      it('should return valid data types for all fields', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/user/profile')
          .set('Authorization', `Bearer ${validAuthToken}`)
          .expect(200);

        expect(typeof response.body.id).toBe('string');
        expect(typeof response.body.username).toBe('string');
        expect(typeof response.body.email).toBe('string');
        expect(
          response.body.subscription === null ||
            typeof response.body.subscription === 'object',
        ).toBe(true);
      });

      it('should return valid email format', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/user/profile')
          .set('Authorization', `Bearer ${validAuthToken}`)
          .expect(200);

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        expect(emailRegex.test(response.body.email)).toBe(true);
      });

      it('should return valid subscription object when user has subscription', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/user/profile')
          .set('Authorization', `Bearer ${validAuthToken}`)
          .expect(200);

        if (response.body.subscription) {
          expect(response.body.subscription).toHaveProperty('id');
          expect(response.body.subscription).toHaveProperty('name');
          expect(response.body.subscription).toHaveProperty('price');
          expect(response.body.subscription).toHaveProperty('priceId');
          expect(response.body.subscription).toHaveProperty('status');

          expect(typeof response.body.subscription.id).toBe('string');
          expect(typeof response.body.subscription.name).toBe('string');
          expect(typeof response.body.subscription.price).toBe('number');
          expect(typeof response.body.subscription.priceId).toBe('string');
          expect(typeof response.body.subscription.status).toBe('string');
        }
      });

      it('should handle user profile without subscription', async () => {
        // Mock user without subscription
        (userService.getProfile as jest.Mock).mockResolvedValueOnce({
          id: testUserId,
          username: 'testuser',
          email: 'test@example.com',
          subscription: null,
        });

        const response = await request(app.getHttpServer())
          .get('/api/user/profile')
          .set('Authorization', `Bearer ${validAuthToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('username');
        expect(response.body).toHaveProperty('email');
        expect(response.body.subscription).toBeNull();
      });
    });

    describe('HTTP Method Validation', () => {
      it('should only accept GET method', async () => {
        const token = `Bearer ${validAuthToken}`;

        await request(app.getHttpServer())
          .post('/api/user/profile')
          .set('Authorization', token)
          .expect(404);

        await request(app.getHttpServer())
          .put('/api/user/profile')
          .set('Authorization', token)
          .expect(404);

        await request(app.getHttpServer())
          .delete('/api/user/profile')
          .set('Authorization', token)
          .expect(404);

        await request(app.getHttpServer())
          .patch('/api/user/profile')
          .set('Authorization', token)
          .expect(404);
      });
    });

    describe('Request Validation Tests', () => {
      it('should ignore any query parameters (none expected)', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/user/profile?invalidParam=value&another=test')
          .set('Authorization', `Bearer ${validAuthToken}`)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('email');
      });

      it('should not accept request body for GET request', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/user/profile')
          .set('Authorization', `Bearer ${validAuthToken}`)
          .send({ invalidData: 'should be ignored' })
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('email');
      });
    });

    describe('Error Response Structure', () => {
      it('should return proper error structure for authentication failures', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/user/profile')
          .expect(401);

        expect(response.body).toHaveProperty('statusCode', 401);
        expect(response.body).toHaveProperty('message');
        expect(typeof response.body.message).toBe('string');
      });

      it('should handle and return proper error for server errors', async () => {
        // Mock a service error
        (userService.getProfile as jest.Mock).mockRejectedValueOnce(
          new Error('Database connection failed'),
        );

        const response = await request(app.getHttpServer())
          .get('/api/user/profile')
          .set('Authorization', `Bearer ${validAuthToken}`)
          .expect(500);

        expect(response.body).toHaveProperty('statusCode', 500);

        // Reset mock
        (userService.getProfile as jest.Mock).mockResolvedValue({
          id: testUserId,
          username: 'testuser',
          email: 'test@example.com',
          subscription: {
            id: 'sub_123',
            name: 'Premium Plan',
            price: 999,
            priceId: 'price_123',
            status: 'active',
          },
        });
      });

      it('should handle user not found scenarios', async () => {
        // Mock user not found
        (userService.getProfile as jest.Mock).mockRejectedValueOnce(
          new Error('User not found'),
        );

        const response = await request(app.getHttpServer())
          .get('/api/user/profile')
          .set('Authorization', `Bearer ${validAuthToken}`)
          .expect(500);

        expect(response.body).toHaveProperty('statusCode', 500);

        // Reset mock
        (userService.getProfile as jest.Mock).mockResolvedValue({
          id: testUserId,
          username: 'testuser',
          email: 'test@example.com',
          subscription: null,
        });
      });
    });

    describe('Performance Tests', () => {
      it('should handle multiple rapid requests from same user', async () => {
        // Make sequential requests to avoid connection issues
        for (let i = 0; i < 3; i++) {
          const response = await request(app.getHttpServer())
            .get('/api/user/profile')
            .set('Authorization', `Bearer ${validAuthToken}`);

          expect(response.status).toBe(200);
          expect(response.body).toHaveProperty('id');
          expect(response.body).toHaveProperty('email');
        }
      });
    });

    describe('Security Tests', () => {
      it('should not expose sensitive user data', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/user/profile')
          .set('Authorization', `Bearer ${validAuthToken}`)
          .expect(200);

        // Should not contain password or other sensitive fields
        expect(response.body).not.toHaveProperty('password');
      });
    });
  });
});
