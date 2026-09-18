import { IsNotEmpty, IsOptional, IsString, IsEnum, IsNumber } from 'class-validator'
import { EventCategory } from '@prisma/client'

export class CreateEventDto {
  @IsNotEmpty()
  title: string

  @IsOptional()
  description?: string

  @IsEnum(EventCategory)
  category: EventCategory

  @IsNotEmpty()
  venueName: string

  @IsNotEmpty()
  address: string

  @IsNotEmpty()
  neighborhood: string

  @IsNumber()
  latitude: number

  @IsNumber()
  longitude: number

  @IsString()
  startTime: string

  @IsOptional()
  endTime?: string

  @IsString()
  dayLabel: string

  @IsString()
  price: string
}
