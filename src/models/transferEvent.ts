import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema} from 'mongoose';

export type TransferEventDocument = TransferEvent & Document;

export enum TokenType {
  ERC721,
  ERC1155,
  ERC20
}

@Schema({ toJSON: { virtuals: true }, toObject: { virtuals: true }})
export class TransferEvent {
  @Prop({ type: String, required: true })
  to: string;

  @Prop({ type: String, required: true })
  from: string;

  @Prop({ type: Number, required: true })
  tokenId: number;

  @Prop({ type: String, required: true })
  contractAddress: string;

  @Prop({ type: String, required: true, unique: true })
  txHash: string;

  @Prop({ type: String, required: true })
  blackHash: string;

  @Prop({ type: TokenType, required: true })
  tokenType: TokenType;

  @Prop({ type: Number, required: true, default: 1 })
  amount: number;
  
  @Prop({ type: Number, required: true})
  blockNumber: number;
}

export const TransferEventSchema = SchemaFactory.createForClass(TransferEvent);