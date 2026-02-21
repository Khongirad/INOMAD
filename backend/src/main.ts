import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Security headers (XSS, clickjacking, MIME sniffing protection)
  app.use(helmet());
  
  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  
  // CORS configuration
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });
  
  // Global prefix
  app.setGlobalPrefix('api');

  // ═══════════════════════════════════════════
  // Swagger / OpenAPI Documentation
  // ═══════════════════════════════════════════
  const config = new DocumentBuilder()
    .setTitle('INOMAD KHURAL API')
    .setDescription(
      'Operating System for Sovereign Governance — REST API.\n\n' +
      '**Modules:** Identity & Verification, Banking (ALTAN), Arbads, Khural (Legislature), ' +
      'Justice, Land Registry, Civil Registry (ZAGS), Migration Service, Education, ' +
      'Organizations, Marketplace, Tax, Elections, and 40+ more.\n\n' +
      '**Auth:** All endpoints require Bearer JWT token unless marked public.\n\n' +
      '**Rate Limit:** 100 requests per minute per IP.',
    )
    .setVersion('1.0.0')
    .setContact('INOMAD', 'https://github.com/Khongirad/INOMAD', '')
    .setLicense('Proprietary', '')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT',
    )
    .addTag('Auth', 'Registration, login, token refresh, logout')
    .addTag('Identity', 'Citizen identity, seats, verification')
    .addTag('Verification', 'Tiered verification & emission limits')
    .addTag('Banking', 'Bank accounts, transfers, central bank')
    .addTag('Arbads', 'Family & organizational Arbads')
    .addTag('Hierarchy', 'Zun → Myangad → Tumed hierarchy')
    .addTag('Khural', 'Legislative sessions, laws')
    .addTag('Parliament', 'Tumed leader parliament')
    .addTag('Elections', 'Leader elections')
    .addTag('Justice', 'Courts, cases, rulings')
    .addTag('Land', 'Land registry & property')
    .addTag('Migration', 'Passport & citizenship')
    .addTag('ZAGS', 'Civil registry (birth, marriage, death)')
    .addTag('Tax', 'Tax system')
    .addTag('Organizations', 'Guilds, cooperatives')
    .addTag('Marketplace', 'Goods, services, jobs')
    .addTag('Education', 'Academy, licenses')
    .addTag('Gamification', 'XP, levels, achievements, quests')
    .addTag('Wallet', 'MPC wallet, protection')
    .addTag('Admin', 'Creator & admin tools')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      tagsSorter: 'alpha',
    },
    customSiteTitle: 'INOMAD KHURAL API Docs',
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  console.log(`🚀 INOMAD Backend running on: http://localhost:${port}/api`);
  console.log(`📖 Swagger API Docs: http://localhost:${port}/api/docs`);
}

bootstrap();

