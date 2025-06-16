import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { GameStatus } from '@prisma/client';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database/prisma.service';
import { GameGateway } from '../src/modules/game/game.gateway';

describe('GameController Integration (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let prismaService: PrismaService;
  let validAuthToken: string;
  let testUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        user: {
          create: jest.fn(),
          findUnique: jest.fn(),
        },
        game: {
          findFirst: jest.fn(),
          findUnique: jest.fn(),
          create: jest.fn(),
        },
        gameParticipant: {
          findFirst: jest.fn(),
          findUnique: jest.fn(),
          create: jest.fn(),
        },
        codeChallenge: {
          findFirst: jest.fn(),
        },
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
    prismaService = moduleFixture.get<PrismaService>(PrismaService);

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

    // Setup basic mocks for successful flow
    const mockChallenge = {
      id: 'challenge-id',
      title: 'Test Challenge',
      description: 'Test Description',
      difficulty: 'EASY',
      testCases: {},
      starterCode: 'console.log("hello")',
      solution: 'console.log("hello world")',
    };

    const mockGame = {
      id: 'game-id',
      challengeId: mockChallenge.id,
      status: GameStatus.PENDING,
      startsAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      participants: [],
      challenge: mockChallenge,
    };

    (prismaService.codeChallenge.findFirst as jest.Mock).mockResolvedValue(
      mockChallenge,
    );
    (prismaService.game.findFirst as jest.Mock).mockResolvedValue(null);
    (prismaService.game.findUnique as jest.Mock).mockResolvedValue({
      id: mockGame.id,
      challengeId: mockChallenge.id,
      status: GameStatus.PENDING,
      participants: [],
    });
    (prismaService.game.create as jest.Mock).mockResolvedValue(mockGame);
    (prismaService.gameParticipant.findFirst as jest.Mock).mockResolvedValue(
      null,
    );
    (prismaService.gameParticipant.findUnique as jest.Mock).mockResolvedValue(
      null,
    );
    (prismaService.gameParticipant.create as jest.Mock).mockResolvedValue({
      id: 'participant-id',
      gameId: mockGame.id,
      userId: testUserId,
      isHost: true,
    });
  }

  describe('POST /game', () => {
    describe('Authentication Tests', () => {
      it('should return 401 when no Authorization header is provided', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/game')
          .expect(401);

        expect(response.body).toHaveProperty('statusCode', 401);
        expect(response.body).toHaveProperty('message');
      });

      it('should return 401 when Authorization header is missing Bearer prefix', async () => {
        await request(app.getHttpServer())
          .post('/api/game')
          .set('Authorization', validAuthToken)
          .expect(401);
      });

      it('should return 401 when Authorization header has invalid format', async () => {
        await request(app.getHttpServer())
          .post('/api/game')
          .set('Authorization', 'InvalidFormat token123')
          .expect(401);
      });

      it('should return 401 when JWT token is invalid', async () => {
        await request(app.getHttpServer())
          .post('/api/game')
          .set('Authorization', 'Bearer invalid.jwt.token')
          .expect(401);
      });

      it('should return 401 when JWT token is malformed', async () => {
        await request(app.getHttpServer())
          .post('/api/game')
          .set('Authorization', 'Bearer not-a-jwt-token')
          .expect(401);
      });
    });

    describe('Request Validation Tests', () => {
      it('should accept POST request with no body (user ID comes from JWT)', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/game')
          .set('Authorization', `Bearer ${validAuthToken}`)
          .expect(201);

        expect(response.body).toBeDefined();
      });

      it('should ignore any request body fields due to no input DTO', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/game')
          .set('Authorization', `Bearer ${validAuthToken}`)
          .send({
            invalidField: 'should be ignored',
            anotherField: 123,
            nestedObject: { test: true },
          })
          .expect(201);

        expect(response.body).toBeDefined();
      });

      it('should handle empty request body', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/game')
          .set('Authorization', `Bearer ${validAuthToken}`)
          .send({})
          .expect(201);

        expect(response.body).toBeDefined();
      });
    });

    describe('Response Validation Tests', () => {
      it('should return 201 status code for successful game creation', async () => {
        await request(app.getHttpServer())
          .post('/api/game')
          .set('Authorization', `Bearer ${validAuthToken}`)
          .expect(201);
      });

      it('should return proper Content-Type header', async () => {
        await request(app.getHttpServer())
          .post('/api/game')
          .set('Authorization', `Bearer ${validAuthToken}`)
          .expect('Content-Type', /application\/json/);
      });

      it('should return game object with all required fields', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/game')
          .set('Authorization', `Bearer ${validAuthToken}`)
          .expect(201);

        // Verify response structure matches what controller returns
        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('challengeId');
        expect(response.body).toHaveProperty('status');
        expect(response.body).toHaveProperty('startsAt');
        expect(response.body).toHaveProperty('createdAt');
        expect(response.body).toHaveProperty('updatedAt');
        expect(response.body).toHaveProperty('participants');
        expect(response.body).toHaveProperty('challenge');
      });

      it('should return valid data types for all fields', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/game')
          .set('Authorization', `Bearer ${validAuthToken}`)
          .expect(201);

        expect(typeof response.body.id).toBe('string');
        expect(typeof response.body.challengeId).toBe('string');
        expect(Object.values(GameStatus)).toContain(response.body.status);
        expect(Array.isArray(response.body.participants)).toBe(true);
        expect(typeof response.body.challenge).toBe('object');

        // Test date fields can be parsed
        expect(new Date(response.body.startsAt)).toBeInstanceOf(Date);
        expect(new Date(response.body.createdAt)).toBeInstanceOf(Date);
        expect(new Date(response.body.updatedAt)).toBeInstanceOf(Date);
      });

      it('should return game with PENDING status for new games', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/game')
          .set('Authorization', `Bearer ${validAuthToken}`)
          .expect(201);

        expect(response.body.status).toBe(GameStatus.PENDING);
      });
    });

    describe('HTTP Method Validation', () => {
      it('should only accept POST method', async () => {
        const token = `Bearer ${validAuthToken}`;

        await request(app.getHttpServer())
          .get('/api/game')
          .set('Authorization', token)
          .expect(404);

        await request(app.getHttpServer())
          .put('/api/game')
          .set('Authorization', token)
          .expect(404);

        await request(app.getHttpServer())
          .delete('/api/game')
          .set('Authorization', token)
          .expect(404);

        await request(app.getHttpServer())
          .patch('/api/game')
          .set('Authorization', token)
          .expect(404);
      });
    });

    describe('Error Response Structure', () => {
      it('should return proper error structure for authentication failures', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/game')
          .expect(401);

        expect(response.body).toHaveProperty('statusCode', 401);
        expect(response.body).toHaveProperty('message');
        expect(typeof response.body.message).toBe('string');
      });

      it('should handle and return proper error for server errors', async () => {
        // Mock a service error
        (
          prismaService.codeChallenge.findFirst as jest.Mock
        ).mockRejectedValueOnce(new Error('Database connection failed'));

        const response = await request(app.getHttpServer())
          .post('/api/game')
          .set('Authorization', `Bearer ${validAuthToken}`)
          .expect(500);

        expect(response.body).toHaveProperty('statusCode', 500);

        // Reset mock
        (prismaService.codeChallenge.findFirst as jest.Mock).mockResolvedValue({
          id: 'challenge-id',
          title: 'Test Challenge',
          description: 'Test Description',
          difficulty: 'EASY',
          testCases: {},
          starterCode: 'console.log("hello")',
          solution: 'console.log("hello world")',
        });
      });
    });

    describe('Rate Limiting and Performance', () => {
      it('should handle multiple rapid requests from same user', async () => {
        // Make sequential requests instead of parallel to avoid connection issues
        for (let i = 0; i < 3; i++) {
          const response = await request(app.getHttpServer())
            .post('/api/game')
            .set('Authorization', `Bearer ${validAuthToken}`);

          expect([200, 201]).toContain(response.status);
        }
      });
    });
  });
});
