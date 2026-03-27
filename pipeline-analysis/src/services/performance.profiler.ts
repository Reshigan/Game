// pipeline-analysis/src/services/performance.profiler.ts
import { PipelineConfig, PipelineStage, Finding } from '../types/pipeline.types';
import { Logger } from '../utils/logger';

export class PerformanceProfiler {
  private readonly logger: Logger;
  private readonly thresholds: PerformanceThresholds;

  constructor() {
    this.logger = new Logger('PerformanceProfiler');
    
    this.thresholds = {
      stageDuration: { warning: 300000, critical: 600000 }, // 5 min warning, 10 min critical
      cpuUsage: { warning: 70, critical: 90 }, // percentage
      memoryUsage: { warning: 1024, critical: 2048 }, // MB
      successRate: { warning: 90, critical: 80 }, // percentage
    };
  }

  async profile(config: PipelineConfig): Promise<Finding[]> {
    this.logger.debug('Starting performance profiling', { pipelineId: config.id });
    
    const findings: Finding[] = [];

    // Profile stage durations
    const durationFindings = this.profileStageDurations(config);
    findings.push(...durationFindings);

    // Profile resource utilization
    const resourceFindings = this.profileResourceUtilization(config);
    findings.push(...resourceFindings);

    // Profile parallelization opportunities
    const parallelFindings = this.profileParallelization(config);
    findings.push(...parallelFindings);

    // Profile bottleneck identification
    const bottleneckFindings = this.identifyBottlenecks(config);
    findings.push(...bottleneckFindings);

    return findings;
  }

  private profileStageDurations(config: PipelineConfig): Finding[] {
    const findings: Finding[] = [];

    const stagesWithMetrics = config.stages.filter(s => s.metrics !== undefined);
    
    for (const stage of stagesWithMetrics) {
      const duration = stage.metrics?.duration || 0;
      
      if (duration > this.thresholds.stageDuration.critical) {
        findings.push({
          id: `perf-${stage.id}-duration-critical`,
          severity: 'high',
          category: 'performance',
          title: 'Critical Stage Duration',
          description: `Stage "${stage.name}" exceeds critical duration threshold`,
          location: `stages[${stage.order}]`,
          evidence: `Duration: ${duration}ms, Threshold: ${this.thresholds.stageDuration.critical}ms`,
          remediation: 'Optimize stage execution or increase parallelization',
        });
      } else if (duration > this.thresholds.stageDuration.warning) {
        findings.push({
          id: `perf-${stage.id}-duration-warning`,
          severity: 'medium',
          category: 'performance',
          title: 'High Stage Duration',
          description: `Stage "${stage.name}" exceeds warning duration threshold`,
          location: `stages[${stage.order}]`,
          evidence: `Duration: ${duration}ms, Threshold: ${this.thresholds.stageDuration.warning}ms`,
          remediation: 'Review stage execution for optimization opportunities',
        });
      }
    }

    return findings;
  }

  private profileResourceUtilization(config: PipelineConfig): Finding[] {
    const findings: Finding[] = [];

    const stagesWithMetrics = config.stages.filter(s => s.metrics?.cpuUsage !== undefined);
    
    for (const stage of stagesWithMetrics) {
      const cpuUsage = stage.metrics?.cpuUsage || 0;
      const memoryUsage = stage.metrics?.memoryUsage || 0;
      
      if (cpuUsage > this.thresholds.cpuUsage.critical) {
        findings.push({
          id: `perf-${stage.id}-cpu-critical`,
          severity: 'high',
          category: 'performance',
          title: 'Critical CPU Utilization',
          description: `Stage "${stage.name}" has critical CPU utilization`,
          location: `stages[${stage.order}].metrics`,
          evidence: `CPU: ${cpuUsage}%, Threshold: ${this.thresholds.cpuUsage.critical}%`,
          remediation: 'Scale compute resources or optimize workload',
        });
      } else if (cpuUsage > this.thresholds.cpuUsage.warning) {
        findings.push({
          id: `perf-${stage.id}-cpu-warning`,
          severity: 'medium',
          category: 'performance',
          title: 'High CPU Utilization',
          description: `Stage "${stage.name}" has high CPU utilization`,
          location: `stages[${stage.order}].metrics`,
          evidence: `CPU: ${cpuUsage}%, Threshold: ${this.thresholds.cpuUsage.warning}%`,
          remediation: 'Monitor CPU usage and consider optimization',
        });
      }

      if (memoryUsage > this.thresholds.memoryUsage.critical) {
        findings.push({
          id: `perf-${stage.id}-memory-critical`,
          severity: 'high',
          category: 'performance',
          title: 'Critical Memory Utilization',
          description: `Stage "${stage.name}" has critical memory utilization`,
          location: `stages[${stage.order}].metrics`,
          evidence: `Memory: ${memoryUsage}MB, Threshold: ${this.thresholds.memoryUsage.critical}MB`,
          remediation: 'Increase memory allocation or optimize memory usage',
        });
      } else if (memoryUsage > this.thresholds.memoryUsage.warning) {
        findings.push({
          id: `perf-${stage.id}-memory-warning`,
          severity: 'medium',
          category: 'performance',
          title: 'High Memory Utilization',
          description: `Stage "${stage.name}" has high memory utilization`,
          location: `stages[${stage.order}].metrics`,
          evidence: `Memory: ${memoryUsage}MB, Threshold: ${this.thresholds.memoryUsage.warning}MB`,
          remediation: 'Review memory allocation and optimize',
        });
      }
    }

    return findings;
  }

  private profileParallelization(config: PipelineConfig): Finding[] {
    const findings: Finding[] = [];

    const sequentialStages = config.stages.filter(s => 
      s.config.parallel === false && s.dependencies.length <= 1
    );

    if (sequentialStages.length > 2) {
      const potentialSavings = sequentialStages.reduce((acc, s) => acc + (s.metrics?.duration || 0), 0);
      
      findings.push({
        id: 'perf-parallel-opportunity',
        severity: 'medium',
        category: 'performance',
        title: 'Parallelization Opportunity',
        description: 'Multiple stages could run in parallel to reduce pipeline duration',
        location: 'pipeline.stages',
        evidence: `${sequentialStages.length} sequential stages, potential savings: ${potentialSavings}ms`,
        remediation: 'Enable parallel execution for independent stages',
      });
    }

    return findings;
  }

  identifyBottlenecks(config: PipelineConfig): Finding[] {
    const findings: Finding[] = [];
    const sequentialChain = this.identifySequentialBottlenecks(config.stages);
    
    if (sequentialChain.length > 0) {
      const totalDuration = sequentialChain.reduce((acc, s) => acc + (s.metrics?.duration || 0), 0);
      const avgDuration = config.stages
        .filter(s => s.metrics !== undefined)
        .reduce((acc, s) => acc + (s.metrics?.duration || 0), 0) / 
        config.stages.filter(s => s.metrics !== undefined).length;

      if (totalDuration > avgDuration * sequentialChain.length * 1.5) {
        findings.push({
          id: 'perf-sequential-bottleneck',
          severity: 'medium',
          category: 'performance',
          title: 'Sequential Bottleneck Detected',
          description: 'Sequential stage chain creates performance bottleneck',
          location: 'pipeline.stages',
          evidence: `Chain duration: ${totalDuration}ms, Expected: ${avgDuration * sequentialChain.length}ms`,
          remediation: 'Enable parallel execution or optimize sequential stages',
        });
      }
    }

    // Identify slowest stage
    const stagesWithMetrics = config.stages.filter(s => s.metrics !== undefined);
    if (stagesWithMetrics.length > 0) {
      const slowest = stagesWithMetrics.reduce((max, s) => 
        (s.metrics?.duration || 0) > (max.metrics?.duration || 0) ? s : max
      );

      if (slowest.metrics && slowest.metrics.duration > avgDuration * 2) {
        findings.push({
          id: `perf-${slowest.id}-bottleneck`,
          severity: 'medium',
          category: 'performance',
          title: 'Stage Performance Bottleneck',
          description: `Stage "${slowest.name}" is significantly slower than average`,
          location: `stages[${slowest.order}]`,
          evidence: `Duration: ${slowest.metrics.duration}ms, Average: ${avgDuration}ms`,
          remediation: 'Profile and optimize this stage',
        });
      }
    }

    return findings;
  }

  identifySequentialBottlenecks(stages: PipelineStage[]): PipelineStage[] {
    const sequentialChain: PipelineStage[] = [];
    
    // Sort by order
    const sorted = [...stages].sort((a, b) => a.order - b.order);
    
    // Find longest sequential chain
    let currentChain: PipelineStage[] = [];
    let longestChain: PipelineStage[] = [];
    
    for (const stage of sorted) {
      if (stage.config.parallel === false) {
        currentChain.push(stage);
        if (currentChain.length > longestChain.length) {
          longestChain = [...currentChain];
        }
      } else {
        currentChain = [];
      }
    }
    
    return longestChain;
  }

  calculatePerformanceScore(config: PipelineConfig): number {
    const findings = this.profile(config);
    
    const baseScore = 100;
    const highPenalty = findings.filter(f => f.severity === 'high').length * 15;
    const mediumPenalty = findings.filter(f => f.severity === 'medium').length * 8;
    const lowPenalty = findings.filter(f => f.severity === 'low').length * 3;

    const score = Math.max(0, baseScore - highPenalty - mediumPenalty - lowPenalty);
    return score;
  }

  generatePerformanceReport(config: PipelineConfig): { score: number; findings: Finding[]; recommendations: string[] } {
    const findings = this.profile(config);
    const score = this.calculatePerformanceScore(config);
    
    const recommendations: string[] = [];
    
    if (score < 60) {
      recommendations.push('Significant performance optimization needed');
    }
    
    if (findings.some(f => f.title.includes('Duration'))) {
      recommendations.push('Review and optimize slow stages');
    }
    
    if (findings.some(f => f.title.includes('Parallel'))) {
      recommendations.push('Enable parallel execution where possible');
    }
    
    if (findings.some(f => f.title.includes('CPU') || f.title.includes('Memory'))) {
      recommendations.push('Right-size compute resources');
    }

    return { score, findings, recommendations };
  }
}

interface PerformanceThresholds {
  stageDuration: { warning: number; critical: number };
  cpuUsage: { warning: number; critical: number };
  memoryUsage: { warning: number; critical: number };
  successRate: { warning: number; critical: number };
}