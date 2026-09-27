import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { TripPlannerService, type TripPlanInput } from './trip-planner.service';

const coordinateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const tripPlanSchema = z
  .object({
    origin: coordinateSchema,
    destination: coordinateSchema,
    vehicle: z.object({
      batteryCapacityKwh: z.number().positive().max(250),
      efficiencyWhPerKm: z.number().min(50).max(1_000),
      startingSocPercent: z.number().min(1).max(100),
      reserveSocPercent: z.number().min(1).max(40).default(10),
      targetChargeSocPercent: z.number().min(50).max(100).default(80),
      connectorStandards: z.array(z.string().min(1)).min(1),
    }),
    preferences: z
      .object({
        minimumPowerKw: z.number().min(1).max(1_000).default(25),
        corridorMeters: z.number().int().min(500).max(50_000).default(8_000),
      })
      .default({ minimumPowerKw: 25, corridorMeters: 8_000 }),
  })
  .refine((input) => input.vehicle.targetChargeSocPercent > input.vehicle.reserveSocPercent, {
    message: 'targetChargeSocPercent must be greater than reserveSocPercent',
    path: ['vehicle', 'targetChargeSocPercent'],
  });

@ApiTags('trips')
@Controller('v1/trips')
export class TripsController {
  public constructor(private readonly planner: TripPlannerService) {}

  @Post('plan')
  @ApiOperation({ summary: 'Plan an EV trip using Google Routes and live compatible chargers' })
  public plan(
    @Body(new ZodValidationPipe(tripPlanSchema)) input: TripPlanInput,
  ): ReturnType<TripPlannerService['plan']> {
    return this.planner.plan(input);
  }
}
