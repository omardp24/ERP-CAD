import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return { status: 'ok', app: 'ERP CAD', version: '0.0.1' };
  }
}
