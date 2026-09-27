import { Module } from '@nestjs/common';
import { MapsModule } from '../maps/maps.module';
import { StationsModule } from '../stations/stations.module';
import { TripPlannerService } from './trip-planner.service';
import { TripsController } from './trips.controller';

@Module({
  imports: [MapsModule, StationsModule],
  controllers: [TripsController],
  providers: [TripPlannerService],
})
export class TripsModule {}
