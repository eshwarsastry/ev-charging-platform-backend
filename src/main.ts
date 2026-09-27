import 'reflect-metadata';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';
import type { Environment } from './config/env';

async function bootstrap(): Promise<void> {
  const adapter = new FastifyAdapter({
    trustProxy: ['loopback', 'linklocal', 'uniquelocal'],
    logger: { level: process.env.LOG_LEVEL ?? 'info', redact: ['req.headers.authorization'] },
  });
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    bufferLogs: true,
  });
  const config = app.get(ConfigService<Environment, true>);

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });
  app.enableCors({
    origin: config
      .get('CORS_ORIGINS', { infer: true })
      .split(',')
      .map((origin) => origin.trim()),
    credentials: true,
  });
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();

  const fastify = app.getHttpAdapter().getInstance();
  fastify.addHook('onSend', (request, reply, _payload, done) => {
    void reply.header('x-request-id', request.id);
    done();
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('OHMCharge API')
    .setDescription('EV charger aggregation, route planning and payment orchestration')
    .setVersion('0.1.0')
    .addApiKey({ type: 'apiKey', name: 'x-admin-api-key', in: 'header' }, 'admin-api-key')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  await app.listen({ port: config.get('PORT', { infer: true }), host: '0.0.0.0' });
}

void bootstrap();
