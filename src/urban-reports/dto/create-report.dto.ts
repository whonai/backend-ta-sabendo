import { IsNotEmpty, IsEnum, IsNumber } from 'class-validator'
import { ReportType } from '@prisma/client'

export class CreateReportDto {
  @IsEnum(ReportType)
  type: ReportType

  @IsNotEmpty()
  title: string

  @IsNotEmpty()
  description: string

  @IsNotEmpty()
  streetName: string

  @IsNotEmpty()
  neighborhood: string

  @IsNumber()
  latitude: number

  @IsNumber()
  longitude: number
}
