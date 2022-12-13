import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

@Processor('transfer')
export class TransferProcessor {
  private readonly logger = new Logger(TransferProcessor.name);

  @Process('transfer')
  handleTransfer(job: Job) {
    this.logger.debug('Start process transfer event...');
    this.logger.debug(job.data);
    this.logger.debug('Finish process transfer event');
  }
}