import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BullModule } from '@nestjs/bull';
import { TransferOwnershipModule } from './consumers/transfer-ownership/transfer-ownership.module';
import { TransferModule } from './consumers/transfer/transfer.module';
import { TransferSingleModule } from './consumers/transferSingle/transfer-single.module';
import { TransferBatchModule } from './consumers/transferBatch/transfer-batch.module';
import { UriModule } from './consumers/uri/uri.module';
import { MongooseModule } from '@nestjs/mongoose';
import { MONGO_DB_CONFIG } from './config/database';
import { SingleTransferOwnershipModule } from './consumers/single-transfer-ownership/single-transfer-ownership.module';

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
        name: 'transferSingle',
      },
      {
        name: 'transferBatch',
      },
      {
        name: 'uri',
      },
      {
        name: 'transferOwnership',
      },
      {
        name: 'singleTransferOwnership',
      }
    ),
    MongooseModule.forRoot(`${MONGO_DB_CONFIG.connectStr}?authSource=admin`, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }),
    TransferModule,
    TransferSingleModule,
    TransferBatchModule,
    TransferOwnershipModule,
    SingleTransferOwnershipModule,
    UriModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
