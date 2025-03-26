import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('GameController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // You'll need to implement a way to get a valid auth token
    // This is just an example - adjust according to your auth implementation
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });

    authToken = loginResponse.body.token; // Adjust according to your actual response structure
  });

  describe('/game/:id (GET)', () => {
    it('should return 401 when no auth token is provided', () => {
      return request(app.getHttpServer()).get('/game/123').expect(401);
    });

    it('should return 404 when game is not found', () => {
      return request(app.getHttpServer())
        .get('/game/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return game when it exists', async () => {
      // First create a game or use an existing one
      // This is just an example - adjust according to your actual implementation
      const gameId = '123'; // You might need to create a game first and get its ID

      const response = await request(app.getHttpServer())
        .get(`/game/${gameId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        status: expect.any(String),
        participants: expect.any(Array),
      });
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
