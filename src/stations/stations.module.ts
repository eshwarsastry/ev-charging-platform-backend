import { Module } from '@nestjs/common';
import { StationsController } from './stations.controller';
import { StationsRepository } from './stations.repository';

@Module({
  controllers: [StationsController],
  providers: [StationsRepository],
  exports: [StationsRepository],
})
export class StationsModule {}
