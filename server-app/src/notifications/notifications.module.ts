import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { Stock } from '../entities/stock.entity';
import { ActivityLogModule } from '../activity-log/activity-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Stock]),
    ActivityLogModule, // adding ActivityLogModule just in case NotificationsService uses it
  ],
  providers: [NotificationsService]
})
export class NotificationsModule {}
