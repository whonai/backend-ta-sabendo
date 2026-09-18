import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const password = await bcrypt.hash('Admin@123456', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@tarolando.com.br' },
    update: {},
    create: {
      email: 'admin@tarolando.com.br',
      password,
      name: 'Administrador Tá Rolando',
      role: 'ADMIN'
    }
  })

  const streets = [
    { name: 'Av. Getúlio Vargas', neighborhood: 'Centro', status: 'moderate', coordinates: [[-12.260, -38.967]] },
    { name: 'Av. Fraga Maia', neighborhood: 'Centro', status: 'clear', coordinates: [[-12.257, -38.964]] },
    { name: 'Av. Maria Quitéria', neighborhood: 'Centro', status: 'clear', coordinates: [[-12.262, -38.960]] },
    { name: 'Av. João Durval Carneiro', neighborhood: 'Centro', status: 'moderate', coordinates: [[-12.255, -38.972]] },
    { name: 'Av. Nóide Cerqueira', neighborhood: 'Centro', status: 'intense', coordinates: [[-12.250, -38.970]] }
  ]

  for (const s of streets) {
    await prisma.streetSegment.upsert({
      where: { name: s.name },
      update: {},
      create: {
        name: s.name,
        neighborhood: s.neighborhood,
        status: s.status as any,
        reportCount: 0,
        coordinates: s.coordinates
      }
    })
  }

  const events = [
    {
      title: 'Varandinha - Noite de Forró',
      description: 'Forró pé de serra com bandas locais no Varandinha',
      category: 'festas',
      venueName: 'Varandinha',
      address: 'Av. Fraga Maia, Centro',
      neighborhood: 'Centro',
      latitude: -12.257,
      longitude: -38.964,
      startTime: '22:00',
      endTime: '02:00',
      dayLabel: 'Sábado',
      price: 'Grátis',
      isVerified: true,
      origin: 'platform',
      status: 'scheduled',
      createdById: admin.id
    },
    {
      title: 'Prime Music - Rock Night',
      description: 'Bandas de rock da cidade',
      category: 'shows',
      venueName: 'Prime Music',
      address: 'Rua da Hora, Centro',
      neighborhood: 'Centro',
      latitude: -12.260,
      longitude: -38.966,
      startTime: '21:00',
      endTime: '00:00',
      dayLabel: 'Sexta',
      price: 'R$ 20',
      isVerified: true,
      origin: 'platform',
      status: 'scheduled',
      createdById: admin.id
    },
    {
      title: 'Vila Container - DJ Set',
      description: 'Música eletrônica e drinks',
      category: 'dj',
      venueName: 'Vila Container',
      address: 'Praça X, Centro',
      neighborhood: 'Centro',
      latitude: -12.258,
      longitude: -38.965,
      startTime: '23:00',
      endTime: '03:00',
      dayLabel: 'Sábado',
      price: 'R$ 10',
      isVerified: true,
      origin: 'platform',
      status: 'scheduled',
      createdById: admin.id
    }
  ]

  for (const e of events) {
    await prisma.event.upsert({
      where: { title: e.title },
      update: {},
      create: e as any
    })
  }

  console.log('Seeding complete')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
