import { IsOptional, IsString, IsNumber, IsEnum } from 'class-validator'
import { EventCategory, EventStatus } from '@prisma/client'

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  title?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsEnum(EventCategory)
  category?: EventCategory

  @IsOptional()
  @IsString()
  venueName?: string

  @IsOptional()
  @IsString()
  address?: string

  @IsOptional()
  @IsString()
  neighborhood?: string

  @IsOptional()
  @IsNumber()
  latitude?: number

  @IsOptional()
  @IsNumber()
  longitude?: number

  @IsOptional()
  @IsString()
  startTime?: string

  @IsOptional()
  @IsString()
  endTime?: string

  @IsOptional()
  @IsString()
  dayLabel?: string

  @IsOptional()
  @IsString()
  price?: string

  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus
}
