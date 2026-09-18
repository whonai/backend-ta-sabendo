import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, Req } from '@nestjs/common'
import { EventsService } from './events.service'
import { CreateEventDto } from './dto/create-event.dto'
import { UpdateEventDto } from './dto/update-event.dto'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'

@Controller('events')
export class EventsController {
  constructor(private svc: EventsService) {}

  @Get()
  findAll(@Query() query: any) {
    return this.svc.findAll(query)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateEventDto, @Req() req: any) {
    const data = { ...dto, createdById: req.user.sub, isVerified: true }
    return this.svc.create(data)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateEventDto) {
    return this.svc.update(id, body)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id)
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/rsvp')
  rsvp(@Param('id') id: string, @Req() req: any) {
    return this.svc.rsvp(id, req.user.sub)
  }
}
