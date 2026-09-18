import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { EventsModule } from './events/events.module'
import { UrbanReportsModule } from './urban-reports/urban-reports.module'
import { StreetsModule } from './streets/streets.module'
import { CityModule } from './city/city.module'
import { AdminModule } from './admin/admin.module'
import { VenuesModule } from './venues/venues.module'
import { PulseModule } from './pulse/pulse.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    EventsModule,
    UrbanReportsModule,
    StreetsModule,
    CityModule,
    PulseModule,
    VenuesModule,
    AdminModule
  ]
})
export class AppModule {}
