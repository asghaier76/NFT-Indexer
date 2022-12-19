import { Module } from '@nestjs/common';
import { TransferBatchProcessor } from './transfer-batch.processor';
import { MongooseModule } from '@nestjs/mongoose';
import { TransferEvent, TransferEventSchema } from 'src/models/transferEvent';

@Module({
  imports: [MongooseModule.forFeature([{ name: TransferEvent.name, schema: TransferEventSchema }])],
  providers: [TransferBatchProcessor],
})
export class TransferBatchModule {}
