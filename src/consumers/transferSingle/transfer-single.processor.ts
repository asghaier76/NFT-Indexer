import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ethers } from 'ethers';
import { erc1155Abi } from 'src/abi/erc1155';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TransferEvent, TransferEventDocument, TokenType } from 'src/models/transferEvent';

@Processor('transferSingle')
export class TransferSingleProcessor {
  private readonly logger = new Logger(TransferSingleProcessor.name);

  constructor(@InjectModel(TransferEvent.name) private transferEvent: Model<TransferEventDocument>) {}

  @Process('transferSingle')
  async handleTransfer(job: Job) {
    const logItem = job.data.log;
    const abi = erc1155Abi;
    const iface = new ethers.utils.Interface(abi);
    const parsedEvent = iface.parseLog(job.data.log);
    try {
      const event = new this.transferEvent({
        from: parsedEvent.args[1],
        to: parsedEvent.args[2],
        tokenId: parsedEvent.args[3].toString(),
        contractAddress: logItem.address,
        txHash: logItem.transactionHash,
        blockHash: logItem.blockHash,
        tokenType: TokenType.ERC1155,
        amount: parsedEvent.args[4].toString(),
        txIndex: logItem.transactionIndex,
        blockNumber: logItem.blockNumber,
      });
      await this.transferEvent
        .updateOne(
          {
            from: parsedEvent.args[1],
            to: parsedEvent.args[2],
            tokenId: parsedEvent.args[3].toString(),
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
