import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TransferEvent, TransferEventSchema } from 'src/models/transferEvent';
import { TransferSingleProcessor } from './transfer-single.processor';

@Module({
  imports: [MongooseModule.forFeature([{ name: TransferEvent.name, schema: TransferEventSchema }])],
  providers: [TransferSingleProcessor],
})
export class TransferSingleModule {}
