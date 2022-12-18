import { Injectable, OnModuleInit } from '@nestjs/common';
import { ethers } from 'ethers';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';
dotenv.config();

const transferEventHash = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
// transferSingleEventHash represents the keccak256 hash of TransferSingle(address,address,address,uint256,uint256)
const transferSingleEventHash = '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62';
// transferBatchEventHash represents the keccak256 hash of TransferBatch(address,address,address,uint256[],uint256[])
const transferBatchEventHash = '0x4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb';
// uriEventHash represents the keccak256 hash of URI(string,uint256)
const uriEventHash = '0x6bb7ff708619ba0610cba295a58592e0451dee2622938c8755667688daf3529b';

@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger(AppService.name);
  provider: any;
  // transferEventHash represents the keccak256 hash of Transfer(address,address,uint256)

  constructor(
    @InjectQueue('transfer') private readonly transferQueue: Queue,
    @InjectQueue('transferSingle') private readonly transferSingleQueue: Queue,
    @InjectQueue('transferBatch') private readonly transferBatchQueue: Queue,
    @InjectQueue('uri') private readonly uriQueue: Queue,
    @InjectQueue('transferOwnership') private readonly transferOwnershipQueue: Queue,
    @InjectQueue('singleTransferOwnership') private readonly singleTransferOwnershipQueue: Queue
  ) {}

  getHello(): string {
    return 'NFT Indexing Service';
  }

  onModuleInit() {
    this.init();
  }

  async init() {
    this.provider = new ethers.providers.JsonRpcProvider(`https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`);
    this.provider.on('block', (blockNumber) => {
      const filterLog = {
        fromBlock: blockNumber,
        toBlock: blockNumber,
      };
      this.provider.getLogs(filterLog).then((logList) => {
        logList.forEach((log) => {
          switch (log.topics[0]) {
            case transferEventHash:
              if (log.topics.length > 3) {
                this.addToQueue('transfer', 'transferQueue', log);
                this.addToQueue('transferOwnership', 'transferOwnershipQueue', log);
              }
              break;
            case transferSingleEventHash:
              break;
            case transferBatchEventHash:
              break;
            case uriEventHash:
              break;
          }
        });
      });
    });
  }

  async addToQueue(queueName, queueObj, log) {
    try {
      this[queueObj].add(queueName, { log: log }, { removeOnComplete: true, attempts: 1 });
    } catch (err) {
      this.logger.error(`error in adding job to queue for txnHash ${log.transactionHash} in block# ${log.blockNumber} `);
    }
  }
}
