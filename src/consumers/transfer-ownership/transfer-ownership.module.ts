import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Ownership, OwnershipSchema } from 'src/models/ownership';
import { TransferOwnershipProcessor } from './transfer-ownership.processor';

@Module({
  imports: [MongooseModule.forFeature([{ name: Ownership.name, schema: OwnershipSchema }])],
  providers: [TransferOwnershipProcessor],
})
export class TransferOwnershipModule {}
