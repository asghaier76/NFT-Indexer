import { Module } from '@nestjs/common';
import { UriProcessor } from './uri.processor';

@Module({
  imports: [],
  providers: [UriProcessor],
})
export class UriModule {}
