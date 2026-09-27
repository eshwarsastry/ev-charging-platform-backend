import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { StationsRepository } from './stations.repository';

const nearbyQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusMeters: z.coerce.number().int().min(100).max(100_000).default(10_000),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

type NearbyQuery = z.infer<typeof nearbyQuerySchema>;

@ApiTags('stations')
@Controller('v1/stations')
export class StationsController {
  public constructor(private readonly stations: StationsRepository) {}

  @Get('nearby')
  @ApiOperation({ summary: 'Find charging stations near a coordinate' })
  @ApiQuery({ name: 'latitude', type: Number })
  @ApiQuery({ name: 'longitude', type: Number })
  public async nearby(
    @Query(new ZodValidationPipe(nearbyQuerySchema)) query: NearbyQuery,
  ): Promise<{ data: Record<string, unknown>[] }> {
    return { data: await this.stations.findNearby(query) };
  }
}
