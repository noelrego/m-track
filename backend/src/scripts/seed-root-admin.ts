import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AuthService } from '../auth/auth.service';
import { AppLogger } from '../common';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, { bufferLogs: true });
  const logger = app.get(AppLogger);
  app.useLogger(logger);

  try {
    const authService = app.get(AuthService);
    const result = await authService.seedRootAdminFromEnv();
    const action = result.created ? 'created' : 'already exists';

    logger.info(`Root admin ${action}: ${result.user.username} <${result.user.emailId}>`);
  } finally {
    await app.close();
  }
}

void bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
