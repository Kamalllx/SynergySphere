import request from 'supertest';
import app from '../src/app';

describe('Health Check Endpoints', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
        environment: 'test',
        services: {
          database: expect.any(String),
          redis: expect.any(String),
        },
      });

      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeGreaterThan(0);
    });
  });

  describe('GET /health/detailed', () => {
    it('should return detailed health information', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
        environment: 'test',
        system: {
          platform: expect.any(String),
          arch: expect.any(String),
          nodeVersion: expect.any(String),
          memory: {
            rss: expect.any(String),
            heapTotal: expect.any(String),
            heapUsed: expect.any(String),
            external: expect.any(String),
          },
        },
        services: {
          database: expect.any(String),
          redis: expect.any(String),
        },
      });
    });
  });
});