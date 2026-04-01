import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { UserScopeService } from './user-scope.service';

@Injectable()
export class ScopeInterceptor implements NestInterceptor {
  constructor(private scopes: UserScopeService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest();

    // Si no hay user (rutas públicas), no hacemos nada
    if (!req.user?.sub && !req.user?.id) return next.handle();

    const userId = req.user.sub ?? req.user.id;

    // Cache en req para que el mismo request no vuelva a consultar
    req.scopes = await this.scopes.getScopes(userId);

    return next.handle();
  }
}
