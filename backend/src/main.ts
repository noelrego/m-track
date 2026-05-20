import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AppLogger, getAuthCookieName, shouldUseCookie } from './common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(AppLogger);
  app.useLogger(logger);

  const corsOrigin = process.env.CORS_ORIGIN;
  const globalPrefix = normalizeRoutePath(process.env.API_GLOBAL_PREFIX ?? 'api');

  logger.info('Application bootstrap started');

  app.enableCors({
    origin: corsOrigin ? corsOrigin.split(',').map((origin) => origin.trim()) : true,
    credentials: shouldUseCookie(),
  });
  app.use(cookieParser());

  if (globalPrefix) {
    app.setGlobalPrefix(globalPrefix);
    logger.debug('Global API prefix configured', { globalPrefix });
  }

  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );

  if (process.env.SWAGGER_ENABLED === 'true') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('M-Track API')
      .setDescription('Money tracking API documentation')
      .setVersion('0.1.0')
      .addBearerAuth()
      .addCookieAuth(getAuthCookieName())
      .build();
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    const swaggerPath = joinRoutePaths(
      globalPrefix,
      normalizeRoutePath(process.env.SWAGGER_PATH ?? 'docs'),
    );
    SwaggerModule.setup(swaggerPath, app, swaggerDocument);
    logger.info(`Swagger enabled at /${swaggerPath}`);
  }

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  logger.info(`Application listening on port ${port}`);
}

function normalizeRoutePath(path: string): string {
  return path.replace(/^\/+|\/+$/g, '');
}

function joinRoutePaths(...paths: string[]): string {
  return paths.filter(Boolean).join('/');
}

void bootstrap();
