import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ethers } from 'ethers';
import { erc1155Abi } from 'src/abi/erc1155';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TransferEvent, TransferEventDocument, TokenType } from 'src/models/transferEvent';

@Processor('transferBatch')
export class TransferBatchProcessor {
  private readonly logger = new Logger(TransferBatchProcessor.name);

  constructor(@InjectModel(TransferEvent.name) private transferEvent: Model<TransferEventDocument>) {}

  @Process('transferBatch')
  async handleTransfer(job: Job) {
    const logItem = job.data.log;
    const abi = erc1155Abi;
    const iface = new ethers.utils.Interface(abi);
    const parsedEvent = iface.parseLog(job.data.log);
    let events = [];
    for (let i = 0; i < parsedEvent.args[3].length; i++) {
      const event = new this.transferEvent({
        from: parsedEvent.args[1],
        to: parsedEvent.args[2],
        tokenId: parsedEvent.args[3][i].toString(),
        contractAddress: logItem.address,
        txHash: logItem.transactionHash,
        blockHash: logItem.blockHash,
        tokenType: TokenType.ERC1155,
        amount: parsedEvent.args[4][i].toString(),
        txIndex: logItem.transactionIndex,
        blockNumber: logItem.blockNumber,
      });
      events.push(event);
    }
    try {
      await this.transferEvent.insertMany(events);
    } catch (err) {
      this.logger.error(`error in processing job for txnHash ${logItem.transactionHash} in block# ${logItem.blockNumber} `);
    }
  }
}
