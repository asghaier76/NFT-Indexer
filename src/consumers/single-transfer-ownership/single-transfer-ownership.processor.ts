import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ethers, BigNumber, Contract, providers } from 'ethers';
import { erc1155Abi } from 'src/abi/erc1155';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Ownership, OwnershipDocument, TokenType } from 'src/models/ownership';
import * as dotenv from 'dotenv';
dotenv.config();

const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';

@Processor('singleTransferOwnership')
export class SingleTransferOwnershipProcessor {
  private readonly logger = new Logger(SingleTransferOwnershipProcessor.name);
  private abi;
  constructor(@InjectModel(Ownership.name) private ownership: Model<OwnershipDocument>) {}

  @Process('singleTransferOwnership')
  async handleOwnershipUpdate(job: Job) {
    const logItem = job.data.log;
    this.abi = erc1155Abi;

    const iface = new ethers.utils.Interface(this.abi);
    const parsedEvent = iface.parseLog(job.data.log);

    if (parsedEvent.args[1] !== NULL_ADDRESS && parsedEvent.args[2] !== NULL_ADDRESS) {
      this.handleTransferEvent(logItem, parsedEvent);
    } else if (parsedEvent.args[1] === NULL_ADDRESS) {
      this.handleMintEvent(logItem, parsedEvent);
    } else {
      this.handleBurnEvent(logItem, parsedEvent);
    }
  }

  async handleTransferEvent(logItem, parsedEvent) {
    try {
      let tokenSenderExist = true;
      let tokenReceiverExist = true;

      let tokenOwnerSender = await this.ownership
        .findOne({ owner: parsedEvent.args[1], tokenId: parsedEvent.args[3].toString(), contractAddress: logItem.address })
        .exec();
      let tokenOwnerReceiver = await this.ownership
        .findOne({ owner: parsedEvent.args[2], tokenId: parsedEvent.args[3].toString(), contractAddress: logItem.address })
        .exec();

      if (!tokenOwnerSender) {
        tokenSenderExist = false;
        const provider = new providers.JsonRpcProvider(`https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`);
        const contract = new Contract(logItem.address, this.abi, provider);
        const senderBalance = await contract.balanceOf(parsedEvent.args[1], parsedEvent.args[3]);

        tokenOwnerSender = new this.ownership({
          owner: parsedEvent.args[1],
          tokenId: parsedEvent.args[3].toString(),
          contractAddress: logItem.address,
          txHash: logItem.transactionHash,
          blockHash: logItem.blockHash,
          tokenType: TokenType.ERC1155,
          amount: senderBalance.toString(),
          txIndex: logItem.transactionIndex,
          blockNumber: logItem.blockNumber,
        });
      }

      if (!tokenOwnerReceiver) {
        tokenReceiverExist = false;
        const provider = new providers.JsonRpcProvider(`https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`);
        const contract = new Contract(logItem.address, this.abi, provider);
        const receiverBalance = await contract.balanceOf(parsedEvent.args[2], parsedEvent.args[3]);

        tokenOwnerReceiver = new this.ownership({
          owner: parsedEvent.args[2],
          tokenId: parsedEvent.args[3].toString(),
          contractAddress: logItem.address,
          txHash: logItem.transactionHash,
          blockHash: logItem.blockHash,
          tokenType: TokenType.ERC1155,
          amount: receiverBalance.toString(),
          txIndex: logItem.transactionIndex,
          blockNumber: logItem.blockNumber,
        });
      }

      if (!tokenReceiverExist && !tokenSenderExist) {
        await this.ownership
          .updateOne(
            {
              owner: parsedEvent.args[1],
              tokenId: parsedEvent.args[3].toString(),
              contractAddress: logItem.address,
              txHash: logItem.transactionHash,
            },
            tokenOwnerSender,
            { upsert: true }
          )
          .exec();
        await this.ownership
          .updateOne(
            {
              owner: parsedEvent.args[2],
              tokenId: parsedEvent.args[3].toString(),
              contractAddress: logItem.address,
              txHash: logItem.transactionHash,
            },
            tokenOwnerReceiver,
            { upsert: true }
          )
          .exec();
        return;
      }

      if (!tokenSenderExist) {
        await this.ownership
          .updateOne(
            {
              owner: parsedEvent.args[1],
              tokenId: parsedEvent.args[3].toString(),
              contractAddress: logItem.address,
              txHash: logItem.transactionHash,
            },
            tokenOwnerSender,
            { upsert: true }
          )
          .exec();
        const newAmount = BigNumber.from(tokenOwnerReceiver.amount).add(parsedEvent.args[4]);
        await tokenOwnerReceiver.update({ amount: newAmount.toString() }).exec();
        return;
      }

      if (!tokenReceiverExist) {
        await this.ownership
          .updateOne(
            {
              owner: parsedEvent.args[2],
              tokenId: parsedEvent.args[3].toString(),
              contractAddress: logItem.address,
              txHash: logItem.transactionHash,
            },
            tokenOwnerReceiver,
            { upsert: true }
          )
          .exec();

        if (tokenOwnerSender.amount === parsedEvent.args[4].toString()) {
          await tokenOwnerSender.delete();
        } else {
          let newAmount = BigNumber.from(tokenOwnerSender.amount).sub(parsedEvent.args[4]);
          if (newAmount.lte(BigNumber.from(0))) {
            const provider = new providers.JsonRpcProvider(`https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`);
            const contract = new Contract(logItem.address, this.abi, provider);
            newAmount = await contract.balanceOf(parsedEvent.args[1], parsedEvent.args[3]);
          }
          await tokenOwnerSender.update({ amount: newAmount.toString() }).exec();
        }
        return;
      }

      if (tokenOwnerSender.amount === parsedEvent.args[4].toString()) {
        await tokenOwnerSender.delete();
      } else {
        let newSenderAmount = BigNumber.from(tokenOwnerSender.amount).sub(parsedEvent.args[4]);
        if (newSenderAmount.lte(BigNumber.from(0))) {
          const provider = new providers.JsonRpcProvider(`https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`);
          const contract = new Contract(logItem.address, this.abi, provider);
          newSenderAmount = await contract.balanceOf(parsedEvent.args[1], parsedEvent.args[3]);
        }
        const newReceiverAmount = BigNumber.from(tokenOwnerReceiver.amount).add(parsedEvent.args[4]);
        await tokenOwnerSender.update({ amount: newSenderAmount.toString() }).exec();
        await tokenOwnerReceiver.update({ amount: newReceiverAmount.toString() }).exec();
      }
    } catch (err) {
      console.log(err);
      this.logger.error(`error in processing job for txnHash ${logItem.transactionHash} in block# ${logItem.blockNumber} `);
    }
  }

  async handleMintEvent(logItem, parsedEvent) {
    try {
      let token = await this.ownership
        .findOne({ owner: parsedEvent.args[2], tokenId: parsedEvent.args[3].toString(), contractAddress: logItem.address })
        .exec();

      if (token) {
        const newAmount = BigNumber.from(token.amount).add(parsedEvent.args[4]);
        await token.update({ amount: newAmount.toString() }).exec();
        return;
      }

      const provider = new providers.JsonRpcProvider(`https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`);
      const contract = new Contract(logItem.address, this.abi, provider);
      const balance = await contract.balanceOf(parsedEvent.args[2], parsedEvent.args[3]);

      const newToken = new this.ownership({
        owner: parsedEvent.args[2],
        tokenId: parsedEvent.args[3].toString(),
        contractAddress: logItem.address,
        txHash: logItem.transactionHash,
        blockHash: logItem.blockHash,
        tokenType: TokenType.ERC1155,
        amount: balance.toString(),
        txIndex: logItem.transactionIndex,
        blockNumber: logItem.blockNumber,
      });

      await this.ownership
        .updateOne(
          {
            owner: parsedEvent.args[2],
            tokenId: parsedEvent.args[3].toString(),
            contractAddress: logItem.address,
            txHash: logItem.transactionHash,
          },
          newToken,
          { upsert: true }
        )
        .exec();
    } catch (err) {
      console.log(err);
      this.logger.error(`error in processing job for txnHash ${logItem.transactionHash} in block# ${logItem.blockNumber} `);
    }
  }

  async handleBurnEvent(logItem, parsedEvent) {
    try {
      let token = await this.ownership
        .findOne({ owner: parsedEvent.args[1], tokenId: parsedEvent.args[3].toString(), contractAddress: logItem.address })
        .exec();

      if (!token) {
        const provider = new providers.JsonRpcProvider(`https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`);
        const contract = new Contract(logItem.address, this.abi, provider);
        const balance = await contract.balanceOf(parsedEvent.args[1], parsedEvent.args[3]);

        if (balance.toString() === '0') return;

        const newToken = new this.ownership({
          owner: parsedEvent.args[1],
          tokenId: parsedEvent.args[3].toString(),
          contractAddress: logItem.address,
          txHash: logItem.transactionHash,
          blockHash: logItem.blockHash,
          tokenType: TokenType.ERC1155,
          amount: balance.toString(),
          txIndex: logItem.transactionIndex,
          blockNumber: logItem.blockNumber,
        });

        await this.ownership
          .updateOne(
            {
              owner: parsedEvent.args[1],
              tokenId: parsedEvent.args[3].toString(),
              contractAddress: logItem.address,
              txHash: logItem.transactionHash,
            },
            newToken,
            { upsert: true }
          )
          .exec();

        return;
      }

      if (token.amount === parsedEvent.args[4].toString()) {
        await token.delete();
      } else {
        let newAmount = BigNumber.from(token.amount).sub(parsedEvent.args[4]);
        if (newAmount.lte(BigNumber.from(0))) {
          const provider = new providers.JsonRpcProvider(`https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`);
          const contract = new Contract(logItem.address, this.abi, provider);
          newAmount = await contract.balanceOf(parsedEvent.args[1], parsedEvent.args[3]);
        }
        await token.update({ amount: newAmount.toString() }).exec();
      }
    } catch (err) {
      console.log(err);
      this.logger.error(`error in processing job for txnHash ${logItem.transactionHash} in block# ${logItem.blockNumber} `);
    }
  }
}
