import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BullModule } from '@nestjs/bull';
import { TransferOwnershipModule } from './consumers/transfer-ownership/transfer-ownership.module';
import { TransferModule } from './consumers/transfer/transfer.module';
import { MongooseModule } from '@nestjs/mongoose';
import { MONGO_DB_CONFIG } from './config/database';

@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379,
      },
    }),
    BullModule.registerQueue(
      {
        name: 'transfer',
      },
      {
        name: 'transferOwnership',
      }
    ),
    MongooseModule.forRoot(`${MONGO_DB_CONFIG.connectStr}?authSource=admin`, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }),
    TransferModule,
    TransferOwnershipModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
