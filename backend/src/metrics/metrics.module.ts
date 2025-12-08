import { Module } from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics', // 預設就是 /metrics，可不寫
    }),
  ],
})
export class MetricsModule {}
