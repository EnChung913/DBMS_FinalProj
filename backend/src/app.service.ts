import { Injectable, OnApplicationShutdown } from '@nestjs/common';

@Injectable()
export class AppService implements OnApplicationShutdown {
  onApplicationShutdown(signal: string) {
    console.log('Received shutdown signal:', signal);
  }
  getHello(): string {
    return 'Hello World!';
  }
}