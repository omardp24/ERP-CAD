// src/auth/auth.service.ts
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';

interface RegisterDto {
  email: string;
  password: string;
  name?: string;
  role?: UserRole | string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // REGISTRO
  async register(body: RegisterDto) {
    const { email, password, name, role } = body;

    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new BadRequestException('Este email ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const finalRole: UserRole =
      (role as UserRole) && Object.values(UserRole).includes(role as UserRole)
        ? (role as UserRole)
        : UserRole.USER;

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name ?? null,
        role: finalRole,
      },
    });

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken, // 👈 CAMBIAMOS A camelCase
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  // LOGIN
  async login(dto: LoginDto) {
    console.log('LOGIN DTO =>', dto);

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);

    if (!passwordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken, // 👈 IGUAL AQUÍ
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}
