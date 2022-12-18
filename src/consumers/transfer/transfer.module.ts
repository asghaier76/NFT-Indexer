import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TransferEvent, TransferEventSchema } from 'src/models/transferEvent';
import { TransferProcessor } from './transfer.processor';

@Module({
  imports: [MongooseModule.forFeature([{ name: TransferEvent.name, schema: TransferEventSchema }])],
  providers: [TransferProcessor],
})
export class TransferModule {}
