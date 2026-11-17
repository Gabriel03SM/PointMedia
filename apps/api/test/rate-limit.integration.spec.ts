import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApp } from '../src/app';
import { environmentSchema } from '../src/config';

describe('limite real de tentativas HTTP', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const config = environmentSchema.parse(process.env);
    if (config.NODE_ENV !== 'test' || !new URL(config.DATABASE_URL).pathname.endsWith('_test'))
      throw new Error('Banco de teste obrigatório.');
    app = await createApp(config, 2);
  });
  afterAll(async () => {
    if (app) await app.close();
  });
  it('retorna 429 e Retry-After, preservando leitura de saúde', async () => {
    for (let i = 0; i < 2; i++)
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Pointmedia-Request', '1')
        .send({})
        .expect(400);
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('X-Pointmedia-Request', '1')
      .send({})
      .expect(429);
    expect(response.headers['retry-after']).toBeDefined();
    await request(app.getHttpServer()).get('/api/health/live').expect(200);
  });
});
