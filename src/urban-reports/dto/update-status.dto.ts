import { IsEnum } from 'class-validator'
import { ReportStatus } from '@prisma/client'

export class UpdateStatusDto {
  @IsEnum(ReportStatus)
  status: ReportStatus
}
