// pipeline-analysis/src/services/security.scanner.ts
import { PipelineConfig, PipelineStage, Finding } from '../types/pipeline.types';
import { Logger } from '../utils/logger';
import * as crypto from 'crypto';

export class SecurityScanner {
  private readonly logger: Logger;
  private readonly secretPatterns: RegExp[];
  private readonly insecurePatterns: RegExp[];

  constructor() {
    this.logger = new Logger('SecurityScanner');
    
    this.secretPatterns = [
      /AKIA[0-9A-Z]{16}/, // AWS Access Key
      /ghp_[a-zA-Z0-9]{36}/, // GitHub Personal Token
      /xox[baprs]-[a-zA-Z0-9-]+/, // Slack Token
      /password\s*[:=]\s*['"][^'"]+['"]/i,
      /api_key\s*[:=]\s*['"][^'"]+['"]/i,
      /secret\s*[:=]\s*['"][^'"]+['"]/i,
      /private_key\s*[:=]\s*['"][^'"]+['"]/i,
      /bearer\s+[a-zA-Z0-9-_.]+/i,
    ];

    this.insecurePatterns = [
      /http:\/\/(?!localhost)/i, // Insecure HTTP
      /ssl_verify\s*[:=]\s*false/i,
      /insecure\s*[:=]\s*true/i,
      /allow_anonymous\s*[:=]\s*true/i,
    ];
  }

  async scan(config: PipelineConfig): Promise<Finding[]> {
    this.logger.debug('Starting security scan', { pipelineId: config.id });
    
    const findings: Finding[] = [];

    // Scan for hardcoded secrets
    const secretFindings = this.scanForSecrets(config);
    findings.push(...secretFindings);

    // Scan for insecure configurations
    const insecureFindings = this.scanForInsecureConfig(config);
    findings.push(...insecureFindings);

    // Scan for missing security controls
    const controlFindings = this.scanForMissingControls(config);
    findings.push(...controlFindings);

    // Scan for compliance issues
    const complianceFindings = this.scanForComplianceIssues(config);
    findings.push(...complianceFindings);

    return findings;
  }

  private scanForSecrets(config: PipelineConfig): Finding[] {
    const findings: Finding[] = [];

    for (const stage of config.stages) {
      const configString = JSON.stringify(stage.config);
      
      for (const pattern of this.secretPatterns) {
        const matches = configString.match(pattern);
        if (matches && matches.length > 0) {
          findings.push({
            id: `sec-${stage.id}-secret-${crypto.randomBytes(4).toString('hex')}`,
            severity: 'critical',
            category: 'security',
            title: 'Hardcoded Secret Detected',
            description: `Stage "${stage.name}" contains potential hardcoded secret`,
            location: `stages[${stage.order}].config`,
            evidence: `Pattern: ${pattern.source}, Match: ${matches[0].substring(0, 10)}...`,
            remediation: 'Use environment variables or secret management service',
          });
        }
      }
    }

    // Check environment configuration
    const envString = JSON.stringify(config.environment);
    for (const pattern of this.secretPatterns) {
      const matches = envString.match(pattern);
      if (matches && matches.length > 0) {
        findings.push({
          id: `sec-env-secret-${crypto.randomBytes(4).toString('hex')}`,
          severity: 'critical',
          category: 'security',
          title: 'Hardcoded Secret in Environment',
          description: 'Environment configuration contains potential hardcoded secret',
          location: 'pipeline.environment',
          evidence: `Pattern: ${pattern.source}`,
          remediation: 'Use cloud provider secret management (AWS Secrets Manager, etc.)',
        });
      }
    }

    return findings;
  }

  private scanForInsecureConfig(config: PipelineConfig): Finding[] {
    const findings: Finding[] = [];

    for (const stage of config.stages) {
      const configString = JSON.stringify(stage.config);
      
      for (const pattern of this.insecurePatterns) {
        const matches = configString.match(pattern);
        if (matches && matches.length > 0) {
          findings.push({
            id: `sec-${stage.id}-insecure-${crypto.randomBytes(4).toString('hex')}`,
            severity: 'high',
            category: 'security',
            title: 'Insecure Configuration Detected',
            description: `Stage "${stage.name}" has insecure configuration`,
            location: `stages[${stage.order}].config`,
            evidence: `Pattern: ${pattern.source}`,
            remediation: 'Enable security features and disable insecure options',
          });
        }
      }
    }

    return findings;
  }

  private scanForMissingControls(config: PipelineConfig): Finding[] {
    const findings: Finding[] = [];

    // Check for missing authentication requirements
    const authReq = config.requirements.find(r => r.type === 'authentication');
    if (!authReq || authReq.status !== 'completed') {
      findings.push({
        id: 'sec-missing-auth',
        severity: 'critical',
        category: 'security',
        title: 'Missing Authentication Requirement',
        description: 'Pipeline does not have completed authentication requirement',
        location: 'pipeline.requirements',
        evidence: authReq ? `Status: ${authReq.status}` : 'Requirement not defined',
        remediation: 'Implement and complete authentication requirement',
      });
    }

    // Check for missing security requirements
    const securityReq = config.requirements.find(r => r.type === 'security');
    if (!securityReq || securityReq.status === 'pending') {
      findings.push({
        id: 'sec-missing-security-req',
        severity: 'high',
        category: 'security',
        title: 'Incomplete Security Requirement',
        description: 'Security requirement is not completed',
        location: 'pipeline.requirements',
        evidence: securityReq ? `Status: ${securityReq.status}` : 'Requirement not defined',
        remediation: 'Complete security requirement implementation',
      });
    }

    // Check deploy stages for approval conditions
    const deployStages = config.stages.filter(s => s.type === 'deploy');
    for (const stage of deployStages) {
      const hasApprovalCondition = stage.config.conditions.some(
        c => c.type === 'env-var' && c.target.includes('APPROVAL')
      );
      
      if (!hasApprovalCondition) {
        findings.push({
          id: `sec-${stage.id}-missing-approval`,
          severity: 'high',
          category: 'security',
          title: 'Missing Deployment Approval',
          description: `Deploy stage "${stage.name}" lacks approval condition`,
          location: `stages[${stage.order}].config.conditions`,
          evidence: 'No approval condition found',
          remediation: 'Add manual approval condition before deployment',
        });
      }
    }

    return findings;
  }

  private scanForComplianceIssues(config: PipelineConfig): Finding[] {
    const findings: Finding[] = [];

    // Check for audit logging
    const hasAuditLogging = config.stages.some(s => 
      s.config.artifacts.some(a => a.name.includes('audit') || a.name.includes('log'))
    );

    if (!hasAuditLogging) {
      findings.push({
        id: 'sec-missing-audit',
        severity: 'medium',
        category: 'compliance',
        title: 'Missing Audit Logging',
        description: 'Pipeline does not capture audit logs',
        location: 'pipeline.stages',
        evidence: 'No audit log artifacts configured',
        remediation: 'Add audit logging artifact collection',
      });
    }

    // Check for data retention policies
    const hasRetentionPolicy = config.stages.some(s => 
      s.config.artifacts.some(a => a.retention > 0 && a.retention < 365)
    );

    if (!hasRetentionPolicy) {
      findings.push({
        id: 'sec-missing-retention',
        severity: 'low',
        category: 'compliance',
        title: 'Missing Data Retention Policy',
        description: 'No data retention policies configured',
        location: 'pipeline.stages.artifacts',
        evidence: 'No retention periods defined',
        remediation: 'Configure appropriate retention periods for artifacts',
      });
    }

    return findings;
  }

  calculateSecurityScore(config: PipelineConfig): number {
    const findings = this.scanForSecrets(config);
    const insecureFindings = this.scanForInsecureConfig(config);
    const controlFindings = this.scanForMissingControls(config);
    
    const totalFindings = findings.length + insecureFindings.length + controlFindings.length;
    const criticalCount = [...findings, ...insecureFindings, ...controlFindings]
      .filter(f => f.severity === 'critical').length;
    const highCount = [...findings, ...insecureFindings, ...controlFindings]
      .filter(f => f.severity === 'high').length;

    const baseScore = 100;
    const criticalPenalty = criticalCount * 25;
    const highPenalty = highCount * 10;
    const mediumPenalty = totalFindings * 5;

    const score = Math.max(0, baseScore - criticalPenalty - highPenalty - mediumPenalty);
    return score;
  }

  generateSecurityReport(config: PipelineConfig): { score: number; findings: Finding[]; recommendations: string[] } {
    const findings = this.scan(config);
    const score = this.calculateSecurityScore(config);
    
    const recommendations: string[] = [];
    
    if (score < 50) {
      recommendations.push('Immediate security remediation required');
      recommendations.push('Engage security team for review');
    }
    
    if (findings.some(f => f.severity === 'critical')) {
      recommendations.push('Address critical findings within 24 hours');
    }
    
    if (findings.some(f => f.category === 'compliance')) {
      recommendations.push('Review compliance requirements');
    }

    return { score, findings, recommendations };
  }
}