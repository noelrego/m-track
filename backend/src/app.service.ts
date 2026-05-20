import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';

@Injectable()
export class AppService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  getRoot() {
    return {
      name: 'M-Track API',
      status: 'running',
    };
  }

  getHealth() {
    return {
      status: 'ok',
      database: this.getDatabaseStatus(),
      timestamp: new Date().toISOString(),
    };
  }

  private getDatabaseStatus() {
    if (this.connection.readyState === 1) {
      return 'connected';
    }

    if (this.connection.readyState === 2) {
      return 'connecting';
    }

    return 'disconnected';
  }
}
