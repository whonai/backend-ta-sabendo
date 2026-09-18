import { Body, Controller, Get, Post, Param, UseGuards, Req, Patch } from '@nestjs/common'
import { UpdateStatusDto } from './dto/update-status.dto'
import { UrbanReportsService } from './urban-reports.service'
import { CreateReportDto } from './dto/create-report.dto'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'

@Controller('urban-reports')
export class UrbanReportsController {
  constructor(private svc: UrbanReportsService) {}

  @Get()
  findAll() {
    return this.svc.findAll()
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateReportDto, @Req() req: any) {
    const data = { ...dto, userId: req.user.sub }
    return this.svc.create(data)
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/confirm')
  confirm(@Param('id') id: string) {
    return this.svc.confirm(id)
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/flag')
  flag(@Param('id') id: string) {
    return this.svc.flag(id)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/status')
  setStatus(@Param('id') id: string, @Body() body: UpdateStatusDto) {
    return this.svc.setStatus(id, body.status)
  }
}
