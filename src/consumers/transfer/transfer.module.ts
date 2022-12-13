import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { TransferProcessor } from './transfer.processor';

@Module({
  imports: [],
//   controllers: [AudioController],
  providers: [TransferProcessor],
})
export class TransferModule {}