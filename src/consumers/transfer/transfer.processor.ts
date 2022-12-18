import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ethers } from 'ethers';
import { erc721Abi } from 'src/abi/erc721';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TransferEvent, TransferEventDocument, TokenType } from 'src/models/transferEvent';

@Processor('transfer')
export class TransferProcessor {
  private readonly logger = new Logger(TransferProcessor.name);

  constructor(@InjectModel(TransferEvent.name) private transferEvent: Model<TransferEventDocument>) {}

  @Process('transfer')
  async handleTransfer(job: Job) {
    const logItem = job.data.log;
    const abi = erc721Abi;
    const iface = new ethers.utils.Interface(abi);
    const parsedEvent = iface.parseLog(job.data.log);

    try {
      const event = new this.transferEvent({
        from: parsedEvent.args[0],
        to: parsedEvent.args[1],
        tokenId: parsedEvent.args[2].toString(),
        contractAddress: logItem.address,
        txHash: logItem.transactionHash,
        blockHash: logItem.blockHash,
        tokenType: TokenType.ERC721,
        amount: 1,
        txIndex: logItem.transactionIndex,
        blockNumber: logItem.blockNumber,
      });
      await this.transferEvent
        .updateOne(
          {
            from: parsedEvent.args[0],
            to: parsedEvent.args[1],
            tokenId: parsedEvent.args[2].toString(),
            contractAddress: logItem.address,
            txHash: logItem.transactionHash,
          },
          event,
          { upsert: true }
        )
        .exec();
    } catch (err) {
      this.logger.error(`error in processing job for txnHash ${logItem.transactionHash} in block# ${logItem.blockNumber} `);
    }
  }
}
