import { Injectable, Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';

@Injectable()
export class RefreshService {
  private readonly REDIS_KEY = 'mv:student_search_mv:last_refresh';

  constructor(
    private readonly dataSource: DataSource,

    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,
  ) {}

  async shouldRefresh(): Promise<boolean> {
    const exists = await this.redis.exists(this.REDIS_KEY);
    return exists === 0;
  }

  async refreshMV() {
    console.log('Refreshing materialized view: student_search_mv');
    await this.dataSource.query(`REFRESH MATERIALIZED VIEW student_search_mv`);
    await this.redis.set(this.REDIS_KEY, '1', 'EX', 60);
  }
}
