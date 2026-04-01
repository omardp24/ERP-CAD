// src/auth/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export type JwtPayload = {
  sub: number;
  email: string;
  role: string; // el rol que uses: 'ADMIN', 'USER', etc.
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'erp-cad-super-secret-2025', // usa el mismo que en el login
    });
  }

  async validate(payload: JwtPayload) {
    // Lo que retornes aquí es lo que se inyecta como req.user
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
