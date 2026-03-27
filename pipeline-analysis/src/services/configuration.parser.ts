// pipeline-analysis/src/services/configuration.parser.ts
import { PipelineConfig, PipelineStage, StageConfig } from '../types/pipeline.types';
import { Logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

export class ConfigurationParser {
  private readonly logger: Logger;
  private readonly supportedFormats: string[] = ['json', 'yaml', 'yml'];

  constructor() {
    this.logger = new Logger('ConfigurationParser');
  }

  async parse(configPath: string): Promise<PipelineConfig> {
    this.logger.debug('Parsing configuration', { configPath });
    
    const extension = path.extname(configPath).toLowerCase().replace('.', '');
    
    if (!this.supportedFormats.includes(extension)) {
      throw new Error(`Unsupported configuration format: ${extension}. Supported formats: ${this.supportedFormats.join(', ')}`);
    }

    const content = await this.readFile(configPath);
    const parsed = this.parseContent(content, extension);
    
    return this.validateAndTransform(parsed);
  }

  private async readFile(configPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      fs.readFile(configPath, 'utf-8', (err, data) => {
        if (err) {
          reject(new Error(`Failed to read configuration file: ${err.message}`));
        } else {
          resolve(data);
        }
      });
    });
  }

  private parseContent(content: string, format: string): Record<string, unknown> {
    switch (format) {
      case 'json':
        return JSON.parse(content);
      case 'yaml':
      case 'yml':
        return yaml.load(content) as Record<string, unknown>;
      default:
        throw new Error(`Unknown format: ${format}`);
    }
  }

  private validateAndTransform(data: Record<string, unknown>): PipelineConfig {
    this.validateRequiredFields(data);
    
    const config: PipelineConfig = {
      id: this.extractField(data, 'id', 'pipeline-unknown'),
      name: this.extractField(data, 'name', 'Unnamed Pipeline'),
      type: this.extractField(data, 'type', 'cicd'),
      version: this.extractField(data, 'version', '1.0.0'),
      createdAt: this.extractDate(data, 'createdAt', new Date()),
      updatedAt: this.extractDate(data, 'updatedAt', new Date()),
      stages: this.parseStages(data),
      environment: this.parseEnvironment(data),
      requirements: this.parseRequirements(data),
    };

    return config;
  }

  private validateRequiredFields(data: Record<string, unknown>): void {
    const requiredFields = ['id', 'name', 'stages'];
    for (const field of requiredFields) {
      if (!(field in data)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }

  private extractField(data: Record<string, unknown>, field: string, defaultValue: string): string {
    const value = data[field];
    if (value === undefined || value === null) {
      return defaultValue;
    }
    return String(value);
  }

  private extractDate(data: Record<string, unknown>, field: string, defaultValue: Date): Date {
    const value = data[field];
    if (value === undefined || value === null) {
      return defaultValue;
    }
    return new Date(String(value));
  }

  private parseStages(data: Record<string, unknown>): PipelineStage[] {
    const stagesData = data['stages'];
    if (!Array.isArray(stagesData)) {
      return [];
    }

    return stagesData.map((stageData, index) => {
      if (typeof stageData !== 'object' || stageData === null) {
        throw new Error(`Invalid stage at index ${index}`);
      }

      const stage: PipelineStage = {
        id: this.extractField(stageData as Record<string, unknown>, 'id', `stage-${index}`),
        name: this.extractField(stageData as Record<string, unknown>, 'name', `Stage ${index}`),
        type: this.extractField(stageData as Record<string, unknown>, 'type', 'build'),
        order: Number(this.extractField(stageData as Record<string, unknown>, 'order', String(index))),
        status: this.extractField(stageData as Record<string, unknown>, 'status', 'pending'),
        dependencies: this.extractArray(stageData as Record<string, unknown>, 'dependencies', []),
        config: this.parseStageConfig(stageData as Record<string, unknown>),
        metrics: this.parseStageMetrics(stageData as Record<string, unknown>),
      };

      return stage;
    });
  }

  private parseStageConfig(data: Record<string, unknown>): StageConfig {
    const configData = data['config'] as Record<string, unknown> || {};
    
    const config: StageConfig = {
      timeout: Number(this.extractField(configData, 'timeout', '300')),
      retries: Number(this.extractField(configData, 'retries', '1')),
      parallel: Boolean(this.extractField(configData, 'parallel', 'false')),
      conditions: this.parseConditions(configData),
      artifacts: this.parseArtifacts(configData),
    };

    return config;
  }

  private parseConditions(data: Record<string, unknown>): Array<{ type: string; target: string; expected: string; operator: string }> {
    const conditionsData = data['conditions'];
    if (!Array.isArray(conditionsData)) {
      return [];
    }

    return conditionsData.map((cond, index) => {
      if (typeof cond !== 'object' || cond === null) {
        return { type: 'file-exists', target: 'unknown', expected: 'true', operator: 'equals' };
      }
      return {
        type: this.extractField(cond as Record<string, unknown>, 'type', 'file-exists'),
        target: this.extractField(cond as Record<string, unknown>, 'target', 'unknown'),
        expected: this.extractField(cond as Record<string, unknown>, 'expected', 'true'),
        operator: this.extractField(cond as Record<string, unknown>, 'operator', 'equals'),
      };
    });
  }

  private parseArtifacts(data: Record<string, unknown>): Array<{ name: string; path: string; type: string; retention: number; compression: boolean }> {
    const artifactsData = data['artifacts'];
    if (!Array.isArray(artifactsData)) {
      return [];
    }

    return artifactsData.map((artifact, index) => {
      if (typeof artifact !== 'object' || artifact === null) {
        return { name: `artifact-${index}`, path: '/tmp', type: 'file', retention: 7, compression: true };
      }
      return {
        name: this.extractField(artifact as Record<string, unknown>, 'name', `artifact-${index}`),
        path: this.extractField(artifact as Record<string, unknown>, 'path', '/tmp'),
        type: this.extractField(artifact as Record<string, unknown>, 'type', 'file'),
        retention: Number(this.extractField(artifact as Record<string, unknown>, 'retention', '7')),
        compression: Boolean(this.extractField(artifact as Record<string, unknown>, 'compression', 'true')),
      };
    });
  }

  private parseStageMetrics(data: Record<string, unknown>): { duration: number; startTime: Date; endTime: Date; memoryUsage: number; cpuUsage: number; artifactsGenerated: number; warningsCount: number; errorsCount: number } | undefined {
    const metricsData = data['metrics'];
    if (!metricsData || typeof metricsData !== 'object') {
      return undefined;
    }

    return {
      duration: Number(this.extractField(metricsData as Record<string, unknown>, 'duration', '0')),
      startTime: this.extractDate(metricsData as Record<string, unknown>, 'startTime', new Date()),
      endTime: this.extractDate(metricsData as Record<string, unknown>, 'endTime', new Date()),
      memoryUsage: Number(this.extractField(metricsData as Record<string, unknown>, 'memoryUsage', '0')),
      cpuUsage: Number(this.extractField(metricsData as Record<string, unknown>, 'cpuUsage', '0')),
      artifactsGenerated: Number(this.extractField(metricsData as Record<string, unknown>, 'artifactsGenerated', '0')),
      warningsCount: Number(this.extractField(metricsData as Record<string, unknown>, 'warningsCount', '0')),
      errorsCount: Number(this.extractField(metricsData as Record<string, unknown>, 'errorsCount', '0')),
    };
  }

  private parseEnvironment(data: Record<string, unknown>): { provider: string; region: string; vpcId?: string; subnetIds?: string[]; securityGroupIds?: string[]; instanceType?: string; storageClass?: string } {
    const envData = data['environment'] as Record<string, unknown> || {};
    
    return {
      provider: this.extractField(envData, 'provider', 'aws'),
      region: this.extractField(envData, 'region', 'us-east-1'),
      vpcId: this.extractOptionalField(envData, 'vpcId'),
      subnetIds: this.extractArray(envData, 'subnetIds', []),
      securityGroupIds: this.extractArray(envData, 'securityGroupIds', []),
      instanceType: this.extractOptionalField(envData, 'instanceType'),
      storageClass: this.extractOptionalField(envData, 'storageClass'),
    };
  }

  private parseRequirements(data: Record<string, unknown>): Array<{ id: string; type: string; description: string; priority: string; status: string; validatedAt?: Date }> {
    const reqData = data['requirements'];
    if (!Array.isArray(reqData)) {
      return [];
    }

    return reqData.map((req, index) => {
      if (typeof req !== 'object' || req === null) {
        return { id: `req-${index}`, type: 'other', description: 'Unknown requirement', priority: 'medium', status: 'pending' };
      }
      return {
        id: this.extractField(req as Record<string, unknown>, 'id', `req-${index}`),
        type: this.extractField(req as Record<string, unknown>, 'type', 'other'),
        description: this.extractField(req as Record<string, unknown>, 'description', 'No description'),
        priority: this.extractField(req as Record<string, unknown>, 'priority', 'medium'),
        status: this.extractField(req as Record<string, unknown>, 'status', 'pending'),
        validatedAt: this.extractOptionalDate(req as Record<string, unknown>, 'validatedAt'),
      };
    });
  }

  private extractArray(data: Record<string, unknown>, field: string, defaultValue: unknown[]): unknown[] {
    const value = data[field];
    if (Array.isArray(value)) {
      return value;
    }
    return defaultValue;
  }

  private extractOptionalField(data: Record<string, unknown>, field: string): string | undefined {
    const value = data[field];
    if (value === undefined || value === null) {
      return undefined;
    }
    return String(value);
  }

  private extractOptionalDate(data: Record<string, unknown>, field: string): Date | undefined {
    const value = data[field];
    if (value === undefined || value === null) {
      return undefined;
    }
    return new Date(String(value));
  }

  async stringify(config: PipelineConfig, format: 'json' | 'yaml'): Promise<string> {
    switch (format) {
      case 'json':
        return JSON.stringify(config, null, 2);
      case 'yaml':
        return yaml.dump(config);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }
}