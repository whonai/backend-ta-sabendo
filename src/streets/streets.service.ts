import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class StreetsService {
  constructor(private prisma: PrismaService) {}

  async getMainAvenues() {
    const names = ['Av. Getúlio Vargas', 'Av. Fraga Maia', 'Av. Maria Quitéria', 'Av. João Durval Carneiro', 'Av. Nóide Cerqueira']
    return this.prisma.streetSegment.findMany({ where: { name: { in: names } } })
  }
}
