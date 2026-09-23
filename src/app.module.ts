import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
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
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ta_rolando'),
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
