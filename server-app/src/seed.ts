import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Role } from './common/enums/role.enum';
import { Logger } from '@nestjs/common';

async function seed() {
  const logger = new Logger('Seed');
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const userRepo = app.get<Repository<User>>(getRepositoryToken(User));

    // Check if admin already exists
    const existingAdmin = await userRepo.findOne({
      where: { email: 'admin@salesvault.com' },
    });

    if (existingAdmin) {
      logger.warn('Admin user already exists. Skipping seed.');
      await app.close();
      return;
    }

    const passwordHash = await bcrypt.hash('Admin@123456', 12);

    const admin = userRepo.create({
      name: 'System Admin',
      email: 'admin@salesvault.com',
      password_hash: passwordHash,
      role: Role.ADMIN,
      is_active: true,
    });

    await userRepo.save(admin);

    logger.log('✅ Admin user created successfully!');
    logger.log('   Email: admin@salesvault.com');
    logger.log('   Password: Admin@123456');
    logger.log('   ⚠️  Change this password immediately after first login!');
  } catch (error) {
    logger.error('Seed failed:', error);
  } finally {
    await app.close();
  }
}

seed();
