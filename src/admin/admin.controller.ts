import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common'
import { AdminService } from './admin.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'

@Controller('admin')
export class AdminController {
  constructor(private svc: AdminService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('metrics')
  metrics() {
    return this.svc.metrics()
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('broadcast')
  setBroadcast(@Body() body: any) {
    return this.svc.setBroadcast(body.message)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete('broadcast')
  deleteBroadcast() {
    return this.svc.setBroadcast(null)
  }
}
