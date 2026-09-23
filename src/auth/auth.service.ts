import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { JwtService } from '@nestjs/jwt'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { UserDocument } from '../mongo/schemas/user.schema'

@Injectable()
export class AuthService {
  constructor(@InjectModel('User') private userModel: Model<UserDocument>, private jwt: JwtService) {}

  async register(data: { email: string; password: string; name: string }) {
    const existing = await this.userModel.findOne({ email: data.email }).lean()
    if (existing) throw new ConflictException('Email já cadastrado')
    const hashed = await bcrypt.hash(data.password, 10)
    const created = await this.userModel.create({ email: data.email, password: hashed, name: data.name })
    const user = created.toJSON()
    const token = this.jwt.sign({ sub: user.id, role: user.role })
    return { user: { id: user.id, email: user.email, name: user.name, role: user.role }, token }
  }

  async validateUser(email: string, pass: string) {
    const user = await this.userModel.findOne({ email }).lean()
    if (!user?.password) return null
    try {
      const ok = await bcrypt.compare(pass, user.password)
      if (!ok) return null
      return user
    } catch {
      return null
    }
  }

  async login(user: { id: string; email: string; role: string }) {
    const token = this.jwt.sign({ sub: user.id, role: user.role })
    return { user, token }
  }

  async me(userId: string) {
    const user = await this.userModel.findById(userId).select('id email name role neighborhood badges trustworthinessScore').lean()
    if (!user) throw new NotFoundException('Usuário não encontrado')
    return user
  }
}
