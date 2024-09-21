import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationError } from 'class-validator';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './filters/http-exception/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  app.useGlobalFilters(new HttpExceptionFilter());
  app.setGlobalPrefix(process.env.NEST_PREFIX);

  // Helmet setup
  app.use(helmet());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that do not have any decorators
      forbidNonWhitelisted: true, // Throw errors if non-whitelisted values are provided
      transform: true, // Automatically transform payloads to be objects typed according to their DTO classes
      disableErrorMessages: false, // Optionally set this to true in production mode
      validateCustomDecorators: true, // Enable usage of custom decorators
      exceptionFactory: (errors: ValidationError[]) => {
        const detailedErrors = errors.map((error) => {
          return {
            property: error.property,
            constraints: error.constraints,
            children: error.children,
          };
        });
        return new BadRequestException({
          statusCode: 400,
          message: 'Validation failed',
          errors: detailedErrors,
        });
      },
    }),
  );

  // Swagger setup
  const swaggerConfig = new DocumentBuilder()
    .setTitle('SourceScan API')
    .setVersion('2.0')
    .addBearerAuth()
    .build();
  const swaggerDoc = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('/', app, swaggerDoc);

  await app.listen(process.env.NEST_PORT);
}
bootstrap();
