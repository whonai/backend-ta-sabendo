import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import * as bcrypt from 'bcrypt'
import { JwtService } from '@nestjs/jwt'

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async register(data: { email: string; password: string; name: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } })
    if (existing) throw new ConflictException('Email já cadastrado')
    const hashed = await bcrypt.hash(data.password, 10)
    const user = await this.prisma.user.create({ data: { email: data.email, password: hashed, name: data.name } })
    const token = this.jwt.sign({ sub: user.id, role: user.role })
    return { user: { id: user.id, email: user.email, name: user.name, role: user.role }, token }
  }

  async validateUser(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({ where: { email } })
    if (!user) return null
    const ok = await bcrypt.compare(pass, user.password)
    if (!ok) return null
    return user
  }

  async login(user: { id: string; email: string; role: string }) {
    const token = this.jwt.sign({ sub: user.id, role: user.role })
    return { user, token }
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true, role: true, neighborhood: true, badges: true, trustworthinessScore: true } })
    if (!user) throw new NotFoundException('Usuário não encontrado')
    return user
  }
}
