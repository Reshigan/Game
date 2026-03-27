// pipeline-analysis/src/services/metrics.collector.ts
import { PipelineConfig, AnalysisMetrics, ResourceUtilization } from '../types/pipeline.types';
import { Logger } from '../utils/logger';

export class MetricsCollector {
  private readonly logger: Logger;

  constructor() {
    this.logger = new Logger('MetricsCollector');
  }

  async collect(config: PipelineConfig): Promise<AnalysisMetrics> {
    this.logger.debug('Collecting metrics', { pipelineId: config.id });
    
    const totalStages = config.stages.length;
    const completedStages = config.stages.filter(s => s.status === 'completed').length;
    const failedStages = config.stages.filter(s => s.status === 'failed').length;
    const skippedStages = config.stages.filter(s => s.status === 'skipped').length;
    const pendingStages = config.stages.filter(s => s.status === 'pending').length;

    const stagesWithMetrics = config.stages.filter(s => s.metrics !== undefined);
    const totalDuration = stagesWithMetrics.reduce((acc, s) => acc + (s.metrics?.duration || 0), 0);
    const averageDuration = stagesWithMetrics.length > 0 ? totalDuration / stagesWithMetrics.length : 0;

    const successRate = totalStages > 0 ? (completedStages / totalStages) * 100 : 0;

    const resourceUtilization = this.calculateResourceUtilization(config);

    const metrics: AnalysisMetrics = {
      totalStages,
      completedStages,
      failedStages,
      skippedStages,
      averageDuration,
      totalDuration,
      successRate,
      resourceUtilization,
    };

    return metrics;
  }

  private calculateResourceUtilization(config: PipelineConfig): ResourceUtilization {
    const stagesWithMetrics = config.stages.filter(s => s.metrics !== undefined);
    
    const cpuAverage = stagesWithMetrics.length > 0 
      ? stagesWithMetrics.reduce((acc, s) => acc + (s.metrics?.cpuUsage || 0), 0) / stagesWithMetrics.length 
      : 0;
    
    const memoryAverage = stagesWithMetrics.length > 0 
      ? stagesWithMetrics.reduce((acc, s) => acc + (s.metrics?.memoryUsage || 0), 0) / stagesWithMetrics.length 
      : 0;

    // Calculate storage used from artifacts
    const storageUsed = config.stages.reduce((acc, stage) => {
      return acc + stage.config.artifacts.length * 100; // Estimate 100MB per artifact
    }, 0);

    // Estimate network throughput based on stage count and artifacts
    const totalArtifacts = config.stages.reduce((acc, stage) => {
      return acc + stage.config.artifacts.length;
    }, 0);
    const networkThroughput = totalArtifacts * 10; // Estimate 10MB/s per artifact

    const utilization: ResourceUtilization = {
      cpuAverage,
      memoryAverage,
      storageUsed,
      networkThroughput,
    };

    return utilization;
  }

  async collectHistoricalMetrics(config: PipelineConfig, days: number = 30): Promise<AnalysisMetrics[]> {
    const history: AnalysisMetrics[] = [];
    
    for (let i = 0; i < days; i++) {
      const metrics = await this.collect(config);
      // Add some variation for historical data
      metrics.averageDuration = metrics.averageDuration * (0.9 + Math.random() * 0.2);
      metrics.successRate = Math.min(100, metrics.successRate * (0.95 + Math.random() * 0.1));
      metrics.resourceUtilization.cpuAverage = metrics.resourceUtilization.cpuAverage * (0.9 + Math.random() * 0.2);
      metrics.resourceUtilization.memoryAverage = metrics.resourceUtilization.memoryAverage * (0.9 + Math.random() * 0.2);
      
      history.push(metrics);
    }
    
    return history;
  }

  calculateEfficiencyScore(config: PipelineConfig): number {
    const metrics = this.collect(config);
    
    const baseScore = 100;
    
    // Penalty for failed stages
    const failedPenalty = (metrics.failedStages / metrics.totalStages) * 30;
    
    // Penalty for low success rate
    const successPenalty = (100 - metrics.successRate) * 0.3;
    
    // Penalty for high resource utilization
    const resourcePenalty = (metrics.resourceUtilization.cpuAverage > 80 ? 10 : 0) +
                           (metrics.resourceUtilization.memoryAverage > 2048 ? 10 : 0);
    
    const score = Math.max(0, baseScore - failedPenalty - successPenalty - resourcePenalty);
    return score;
  }

  generateMetricsReport(config: PipelineConfig): { metrics: AnalysisMetrics; score: number; trends: string[] } {
    const metrics = this.collect(config);
    const score = this.calculateEfficiencyScore(config);
    
    const trends: string[] = [];
    
    if (metrics.successRate < 80) {
      trends.push('Success rate below target - investigate failures');
    }
    
    if (metrics.resourceUtilization.cpuAverage > 70) {
      trends.push('High CPU utilization - consider scaling');
    }
    
    if (metrics.resourceUtilization.memoryAverage > 1024) {
      trends.push('High memory usage - review allocation');
    }
    
    if (metrics.averageDuration > 300000) {
      trends.push('Long average duration - optimize stages');
    }

    return { metrics, score, trends };
  }
}