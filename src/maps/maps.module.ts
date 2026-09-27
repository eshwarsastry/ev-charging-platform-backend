import { Module } from '@nestjs/common';
import { GoogleRoutesClient } from './google-routes.client';
import { ROUTES_CLIENT } from './maps.types';

@Module({
  providers: [GoogleRoutesClient, { provide: ROUTES_CLIENT, useExisting: GoogleRoutesClient }],
  exports: [ROUTES_CLIENT],
})
export class MapsModule {}
