import { Injectable, OnModuleInit } from '@nestjs/common';
import { ethers } from 'ethers';
import { erc721Abi } from './abi/erc721'
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

const transferEventHash = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
// transferSingleEventHash represents the keccak256 hash of TransferSingle(address,address,address,uint256,uint256)
const transferSingleEventHash = "0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62"
// transferBatchEventHash represents the keccak256 hash of TransferBatch(address,address,address,uint256[],uint256[])
const transferBatchEventHash = "0x4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb"
// uriEventHash represents the keccak256 hash of URI(string,uint256)
const uriEventHash = "0x6bb7ff708619ba0610cba295a58592e0451dee2622938c8755667688daf3529b"

@Injectable()
export class AppService implements OnModuleInit {
  provider: any;
  // transferEventHash represents the keccak256 hash of Transfer(address,address,uint256)

  constructor(@InjectQueue('transfer') private readonly transferQueue: Queue) {}
  getHello(): string {
    return 'Hello World!';
  }

  onModuleInit() {
    this.init()
  }

  async init() {
    this.provider = new ethers.providers.JsonRpcProvider('https://mainnet.infura.io/v3/7f84392e67df43fc81bc795f5dceeeb5');
    this.provider.on("block", (blockNumber) => {
      console.log(blockNumber)
      let filterLog = {
        fromBlock : blockNumber-1,
        toBlock : blockNumber,
        topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"]
      };
      this.provider.getLogs(filterLog).then((logList) => {
        // this.handleTransferEvent(logList[0])
        logList.forEach(log => {
          switch(log.topics[0]) {
            case transferEventHash:
              if(log.topics.length > 3) this.handleTransferEvent(log);
              break;
            case transferSingleEventHash:
              this.handleTransferSingleEvent(log);
              break;
            case transferBatchEventHash:
              this.handleTransferBatchEvent(log);
              break;
            case uriEventHash:
              this.handleUriEvent(log);
              break;
          }
        });
        
        // console.log(logList)
      });
    })
  }

  async handleTransferEvent(log) {
    const abi = erc721Abi;
    const iface = new ethers.utils.Interface(abi);
    console.log('log')
    let events = iface.parseLog(log)
    console.log('events');
    await this.transferQueue.add('transfer', 
      {event: events},
      {removeOnComplete: true, attempts: 10}
    );
    // console.log(job)
  }

  async handleTransferSingleEvent(log) {

  }

  async handleTransferBatchEvent(log) {

  }

  async handleUriEvent(log) {

  }
}
