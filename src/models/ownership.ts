import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type OwnershipDocument = Ownership & Document;

export enum TokenType {
  ERC721,
  ERC1155,
  ERC20,
}

@Schema({ toJSON: { virtuals: true }, toObject: { virtuals: true } })
export class Ownership {
  @Prop({ type: String, required: true })
  owner: string;

  @Prop({ type: String, required: true })
  tokenId: string;

  @Prop({ type: String, required: true })
  contractAddress: string;

  @Prop({ type: String, required: true })
  txHash: string;

  @Prop({ type: Number, enum: TokenType, required: true })
  tokenType: TokenType;

  @Prop({ type: String, required: true, min: 1 })
  amount: string;

  @Prop({ type: Number, required: true })
  blockNumber: number;
}

export const OwnershipSchema = SchemaFactory.createForClass(Ownership);
