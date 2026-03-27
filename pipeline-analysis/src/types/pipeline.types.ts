// pipeline-analysis/src/types/pipeline.types.ts
export interface PipelineConfig {
  id: string;
  name: string;
  type: PipelineType;
  version: string;
  createdAt: Date;
  updatedAt: Date;
  stages: PipelineStage[];
  environment: EnvironmentConfig;
  requirements: Requirement[];
}

export type PipelineType = 'cicd' | 'data-etl' | 'ml-training' | 'deployment' | 'other';

export interface PipelineStage {
  id: string;
  name: string;
  type: StageType;
  order: number;
  status: StageStatus;
  dependencies: string[];
  config: StageConfig;
  metrics?: StageMetrics;
}

export type StageType = 'analyze' | 'build' | 'test' | 'deploy' | 'validate' | 'notify';

export type StageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface StageConfig {
  timeout: number;
  retries: number;
  parallel: boolean;
  conditions: Condition[];
  artifacts: ArtifactConfig[];
}

export interface Condition {
  type: 'file-exists' | 'env-var' | 'command-output' | 'api-response';
  target: string;
  expected: string;
  operator: 'equals' | 'contains' | 'matches' | 'greater-than' | 'less-than';
}

export interface ArtifactConfig {
  name: string;
  path: string;
  type: 'file' | 'directory' | 'stream';
  retention: number;
  compression: boolean;
}

export interface StageMetrics {
  duration: number;
  startTime: Date;
  endTime: Date;
  memoryUsage: number;
  cpuUsage: number;
  artifactsGenerated: number;
  warningsCount: number;
  errorsCount: number;
}

export interface EnvironmentConfig {
  provider: CloudProvider;
  region: string;
  vpcId?: string;
  subnetIds?: string[];
  securityGroupIds?: string[];
  instanceType?: string;
  storageClass?: string;
}

export type CloudProvider = 'aws' | 'gcp' | 'azure' | 'on-prem' | 'hybrid';

export interface Requirement {
  id: string;
  type: RequirementType;
  description: string;
  priority: Priority;
  status: RequirementStatus;
  validatedAt?: Date;
}

export type RequirementType = 'authentication' | 'rate-limiting' | 'database' | 'compliance' | 'performance' | 'security';

export type Priority = 'critical' | 'high' | 'medium' | 'low';

export type RequirementStatus = 'pending' | 'in-progress' | 'completed' | 'blocked';

export interface AnalysisResult {
  pipelineId: string;
  analyzedAt: Date;
  status: AnalysisStatus;
  findings: Finding[];
  recommendations: Recommendation[];
  metrics: AnalysisMetrics;
  risks: Risk[];
  complianceReport?: ComplianceReport;
}

export type AnalysisStatus = 'success' | 'partial' | 'failed';

export interface Finding {
  id: string;
  severity: Severity;
  category: FindingCategory;
  title: string;
  description: string;
  location: string;
  evidence: string;
  remediation?: string;
}

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type FindingCategory = 'security' | 'performance' | 'reliability' | 'cost' | 'maintainability' | 'compliance';

export interface Recommendation {
  id: string;
  priority: Priority;
  title: string;
  description: string;
  effort: EffortLevel;
  impact: ImpactLevel;
  implementationSteps: string[];
}

export type EffortLevel = 'low' | 'medium' | 'high';

export type ImpactLevel = 'low' | 'medium' | 'high';

export interface AnalysisMetrics {
  totalStages: number;
  completedStages: number;
  failedStages: number;
  skippedStages: number;
  averageDuration: number;
  totalDuration: number;
  successRate: number;
  resourceUtilization: ResourceUtilization;
}

export interface ResourceUtilization {
  cpuAverage: number;
  memoryAverage: number;
  storageUsed: number;
  networkThroughput: number;
}

export interface Risk {
  id: string;
  type: RiskType;
  severity: Severity;
  probability: Probability;
  impact: ImpactLevel;
  description: string;
  mitigation: string[];
  owner?: string;
}

export type RiskType = 'technical' | 'security' | 'operational' | 'financial' | 'compliance';

export type Probability = 'low' | 'medium' | 'high';

export interface ComplianceReport {
  standard: string;
  version: string;
  assessedAt: Date;
  controls: Control[];
  overallStatus: ComplianceStatus;
  gaps: ComplianceGap[];
}

export type ComplianceStatus = 'compliant' | 'partially-compliant' | 'non-compliant';

export interface Control {
  id: string;
  name: string;
  description: string;
  status: ControlStatus;
  evidence?: string;
  lastChecked: Date;
}

export type ControlStatus = 'pass' | 'fail' | 'not-applicable' | 'manual-review';

export interface ComplianceGap {
  controlId: string;
  gap: string;
  severity: Severity;
  remediationPlan: string;
  targetDate?: Date;
}

export interface AnalysisRequest {
  pipelineId: string;
  options?: AnalysisOptions;
}

export interface AnalysisOptions {
  deepScan?: boolean;
  includeCompliance?: boolean;
  securityScan?: boolean;
  performanceProfile?: boolean;
  costAnalysis?: boolean;
}

export interface AnalysisContext {
  requestId: string;
  pipelineId: string;
  startTime: Date;
  options: AnalysisOptions;
  progress: number;
  currentStage: string;
  logs: LogEntry[];
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';