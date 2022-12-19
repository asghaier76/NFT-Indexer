import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ethers } from 'ethers';
import { erc721Abi } from 'src/abi/erc721';

@Processor('uri')
export class UriProcessor {
  private readonly logger = new Logger(UriProcessor.name);

  @Process('uri')
  handleTransfer(job: Job) {
    // console.log(job.data)
    // this.logger.debug('Start process transfer event...');
    const abi = erc721Abi;
    const iface = new ethers.utils.Interface(abi);
    // console.log('log');
    let events = iface.parseLog(job.data.log);
    // console.log(events);
    // this.logger.debug('Finish process transfer event');
  }
}
