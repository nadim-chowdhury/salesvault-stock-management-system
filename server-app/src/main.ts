import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Helmet: sets security-related HTTP headers
  app.use(helmet());

  // CORS: whitelist only allowed origins
  const corsOrigins = configService
    .get<string>('CORS_ORIGINS', '')
    .split(',')
    .map((origin: string) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Idempotency-Key',
      'X-Requested-With',
    ],
    credentials: true,
    maxAge: 86400,
  });

  // Validation — reject unknown properties, strip them, auto-transform
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  app.setGlobalPrefix('api/v1');

  // Swagger / OpenAPI Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('SalesVault API')
    .setDescription(
      'Production-ready Stock Management System API for salespersons. ' +
        'Features JWT authentication, RBAC, immutable audit trail, ' +
        'transaction-safe sales, and real-time stock control.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT access token',
      },
      'JWT-auth',
    )
    .addTag('Health', 'API health check')
    .addTag('Auth', 'Authentication & session management')
    .addTag('Users', 'User management (ADMIN only)')
    .addTag('Products', 'Product catalog management')
    .addTag('Warehouses', 'Warehouse management')
    .addTag('Stock', 'Stock & assignment management')
    .addTag('Sales', 'Sales transactions')
    .addTag('Activity Logs', 'Immutable audit trail')
    .addTag('Dashboard', 'Analytics & dashboards')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      tagsSorter: 'alpha',
    },
  });

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);

  logger.log(`🚀 SalesVault API running on: http://localhost:${port}/api/v1`);
  logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
  logger.log(
    `🔒 Environment: ${configService.get<string>('NODE_ENV', 'development')}`,
  );
}

bootstrap();
