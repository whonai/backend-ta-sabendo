import { Injectable, OnModuleInit } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    // Allow disabling Prisma (during migration to Mongo) by setting DISABLE_PRISMA=true
    if (process.env.DISABLE_PRISMA === 'true') {
      return
    }

    if (!process.env.DATABASE_URL) {
      // No DATABASE_URL configured; skip connecting to Prisma
      return
    }

    await this.$connect()
  }
}
