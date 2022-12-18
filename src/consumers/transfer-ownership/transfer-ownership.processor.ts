import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ethers } from 'ethers';
import { erc721Abi } from 'src/abi/erc721';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Ownership, OwnershipDocument, TokenType } from 'src/models/ownership';

const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';

@Processor('transferOwnership')
export class TransferOwnershipProcessor {
  private readonly logger = new Logger(TransferOwnershipProcessor.name);

  constructor(@InjectModel(Ownership.name) private ownership: Model<OwnershipDocument>) {}

  @Process('transferOwnership')
  async handleOwnershipUpdate(job: Job) {
    const logItem = job.data.log;
    const abi = erc721Abi;

    const iface = new ethers.utils.Interface(abi);
    const parsedEvent = iface.parseLog(job.data.log);

    if (parsedEvent.args[0] !== NULL_ADDRESS && parsedEvent.args[1] !== NULL_ADDRESS) {
      this.handleTransferEvent(logItem, parsedEvent);
    } else if (parsedEvent.args[0] === NULL_ADDRESS) {
      this.handleMintEvent(logItem, parsedEvent);
    } else {
      this.handleBurnEvent(logItem, parsedEvent);
    }
  }

  async handleTransferEvent(logItem, parsedEvent) {
    try {
      await this.ownership
        .findOneAndDelete({ owner: parsedEvent.args[0], tokenId: parsedEvent.args[2].toString(), contractAddress: logItem.address })
        .exec();
      const newToken = new this.ownership({
        owner: parsedEvent.args[1],
        tokenId: parsedEvent.args[2].toString(),
        contractAddress: logItem.address,
        txHash: logItem.transactionHash,
        blockHash: logItem.blockHash,
        tokenType: TokenType.ERC721,
        amount: 1,
        txIndex: logItem.transactionIndex,
        blockNumber: logItem.blockNumber,
      });

      await this.ownership
        .updateOne(
          {
            owner: parsedEvent.args[1],
            tokenId: parsedEvent.args[2].toString(),
            contractAddress: logItem.address,
            txHash: logItem.transactionHash,
          },
          newToken,
          { upsert: true }
        )
        .exec();
    } catch (err) {
      this.logger.error(`error in processing job for txnHash ${logItem.transactionHash} in block# ${logItem.blockNumber} `);
    }
  }

  async handleMintEvent(logItem, parsedEvent) {
    try {
      const newToken = new this.ownership({
        owner: parsedEvent.args[1],
        tokenId: parsedEvent.args[2].toString(),
        contractAddress: logItem.address,
        txHash: logItem.transactionHash,
        blockHash: logItem.blockHash,
        tokenType: TokenType.ERC721,
        amount: 1,
        txIndex: logItem.transactionIndex,
        blockNumber: logItem.blockNumber,
      });
      await this.ownership
        .updateOne(
          {
            owner: parsedEvent.args[1],
            tokenId: parsedEvent.args[2].toString(),
            contractAddress: logItem.address,
            txHash: logItem.transactionHash,
          },
          newToken,
          { upsert: true }
        )
        .exec();
    } catch (err) {
      this.logger.error(`error in processing job for txnHash ${logItem.transactionHash} in block# ${logItem.blockNumber} `);
    }
  }

  async handleBurnEvent(logItem, parsedEvent) {
    try {
      await this.ownership
        .findOneAndDelete({ owner: parsedEvent.args[0], tokenId: parsedEvent.args[2].toString(), contractAddress: logItem.address })
        .exec();
    } catch (err) {
      this.logger.error(`error in processing job for txnHash ${logItem.transactionHash} in block# ${logItem.blockNumber} `);
    }
  }
}
