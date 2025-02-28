import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe());

  const operationIdFactory = (controllerKey: string, methodKey: string) =>
    `${methodKey}`;

  const config = new DocumentBuilder()
    .setTitle('Code Dual API')
    .setDescription('The Code Dual API description')
    .setVersion('1.0')
    .addTag('code-dual')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory,
  });
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
