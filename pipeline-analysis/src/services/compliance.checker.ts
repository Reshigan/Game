// pipeline-analysis/src/services/compliance.checker.ts
import { PipelineConfig, ComplianceReport, Control, ComplianceGap, Severity } from '../types/pipeline.types';
import { Logger } from '../utils/logger';

export class ComplianceChecker {
  private readonly logger: Logger;
  private readonly standards: ComplianceStandard[];

  constructor() {
    this.logger = new Logger('ComplianceChecker');
    
    this.standards = [
      {
        name: 'SOC2-Type2',
        version: '2023',
        controls: [
          { id: 'soc2-cc1', name: 'Access Control', category: 'security' },
          { id: 'soc2-cc2', name: 'Data Encryption', category: 'security' },
          { id: 'soc2-cc3', name: 'Audit Logging', category: 'compliance' },
          { id: 'soc2-cc4', name: 'Change Management', category: 'operations' },
          { id: 'soc2-cc5', name: 'Backup & Recovery', category: 'operations' },
        ],
      },
      {
        name: 'GDPR',
        version: '2018',
        controls: [
          { id: 'gdpr-art5', name: 'Data Processing Principles', category: 'privacy' },
          { id: 'gdpr-art6', name: 'Lawful Basis', category: 'privacy' },
          { id: 'gdpr-art32', name: 'Security Measures', category: 'security' },
          { id: 'gdpr-art33', name: 'Breach Notification', category: 'compliance' },
        ],
      },
      {
        name: 'PCI-DSS',
        version: '4.0',
        controls: [
          { id: 'pci-req1', name: 'Network Security', category: 'security' },
          { id: 'pci-req2', name: 'System Hardening', category: 'security' },
          { id: 'pci-req3', name: 'Data Protection', category: 'security' },
          { id: 'pci-req4', name: 'Encryption', category: 'security' },
        ],
      },
    ];
  }

  async check(config: PipelineConfig, standardName?: string): Promise<ComplianceReport> {
    this.logger.debug('Starting compliance check', { pipelineId: config.id, standard: standardName });
    
    const standard = standardName 
      ? this.standards.find(s => s.name === standardName)
      : this.standards[0];

    if (!standard) {
      throw new Error(`Unknown compliance standard: ${standardName}`);
    }

    const controls: Control[] = [];
    const gaps: ComplianceGap[] = [];

    for (const stdControl of standard.controls) {
      const control = this.evaluateControl(config, stdControl);
      controls.push(control);
      
      if (control.status === 'fail') {
        gaps.push({
          controlId: control.id,
          gap: `Control "${control.name}" failed validation`,
          severity: this.determineGapSeverity(stdControl.category),
          remediationPlan: this.generateRemediationPlan(control),
          targetDate: new Date(Date.now() + 86400000 * 30),
        });
      }
    }

    const failedControls = controls.filter(c => c.status === 'fail').length;
    const totalControls = controls.length;
    
    const overallStatus = failedControls === 0 
      ? 'compliant' 
      : failedControls < totalControls / 2 
        ? 'partially-compliant' 
        : 'non-compliant';

    const report: ComplianceReport = {
      standard: standard.name,
      version: standard.version,
      assessedAt: new Date(),
      controls,
      overallStatus,
      gaps,
    };

    return report;
  }

  private evaluateControl(config: PipelineConfig, stdControl: { id: string; name: string; category: string }): Control {
    const control: Control = {
      id: stdControl.id,
      name: stdControl.name,
      description: `${stdControl.name} control for ${stdControl.category}`,
      status: 'pass',
      lastChecked: new Date(),
    };

    switch (stdControl.category) {
      case 'security':
        control.status = this.evaluateSecurityControl(config, stdControl);
        break;
      case 'compliance':
        control.status = this.evaluateComplianceControl(config, stdControl);
        break;
      case 'operations':
        control.status = this.evaluateOperationsControl(config, stdControl);
        break;
      case 'privacy':
        control.status = this.evaluatePrivacyControl(config, stdControl);
        break;
      default:
        control.status = 'manual-review';
    }

    if (control.status === 'pass') {
      control.evidence = this.generateEvidence(config, stdControl);
    }

    return control;
  }

  private evaluateSecurityControl(config: PipelineConfig, control: { id: string; name: string }): Control['status'] {
    // Check for authentication requirement
    const authReq = config.requirements.find(r => r.type === 'authentication');
    if (!authReq || authReq.status !== 'completed') {
      return 'fail';
    }

    // Check for security requirement
    const securityReq = config.requirements.find(r => r.type === 'security');
    if (!securityReq || securityReq.status === 'pending') {
      return 'fail';
    }

    // Check environment security configuration
    if (!config.environment.securityGroupIds || config.environment.securityGroupIds.length === 0) {
      if (control.id.includes('network') || control.id.includes('security')) {
        return 'fail';
      }
    }

    return 'pass';
  }

  private evaluateComplianceControl(config: PipelineConfig, control: { id: string; name: string }): Control['status'] {
    // Check for compliance requirement
    const complianceReq = config.requirements.find(r => r.type === 'compliance');
    if (!complianceReq || complianceReq.status === 'pending') {
      return 'fail';
    }

    // Check for audit logging
    const hasAuditLogging = config.stages.some(s => 
      s.config.artifacts.some(a => a.name.includes('audit') || a.name.includes('log'))
    );

    if (control.id.includes('audit') && !hasAuditLogging) {
      return 'fail';
    }

    return 'pass';
  }

  private evaluateOperationsControl(config: PipelineConfig, control: { id: string; name: string }): Control['status'] {
    // Check for proper stage configuration
    const hasTimeoutConfig = config.stages.every(s => s.config.timeout > 0);
    const hasRetryConfig = config.stages.every(s => s.config.retries >= 0);

    if (control.id.includes('change') && (!hasTimeoutConfig || !hasRetryConfig)) {
      return 'fail';
    }

    // Check for backup/recovery artifacts
    const hasBackupArtifact = config.stages.some(s => 
      s.config.artifacts.some(a => a.name.includes('backup') || a.name.includes('snapshot'))
    );

    if (control.id.includes('backup') && !hasBackupArtifact) {
      return 'not-applicable';
    }

    return 'pass';
  }

  private evaluatePrivacyControl(config: PipelineConfig, control: { id: string; name: string }): Control['status'] {
    // Check for data handling requirements
    const hasDataRequirement = config.requirements.some(r => 
      r.type === 'database' || r.type === 'security'
    );

    if (!hasDataRequirement) {
      return 'manual-review';
    }

    // Check for data retention policies
    const hasRetentionPolicy = config.stages.some(s => 
      s.config.artifacts.some(a => a.retention > 0 && a.retention < 365)
    );

    if (control.id.includes('processing') && !hasRetentionPolicy) {
      return 'fail';
    }

    return 'pass';
  }

  private generateEvidence(config: PipelineConfig, control: { id: string; name: string }): string {
    switch (true) {
      case control.id.includes('access'):
        return 'Authentication requirement completed';
      case control.id.includes('encryption'):
        return 'Security requirement in progress';
      case control.id.includes('audit'):
        return 'Pipeline logs captured for all stages';
      case control.id.includes('change'):
        return 'Stage configurations include timeout and retry';
      default:
        return 'Control evaluated successfully';
    }
  }

  private determineGapSeverity(category: string): Severity {
    switch (category) {
      case 'security':
        return 'high';
      case 'privacy':
        return 'high';
      case 'compliance':
        return 'medium';
      case 'operations':
        return 'low';
      default:
        return 'medium';
    }
  }

  private generateRemediationPlan(control: Control): string {
    switch (true) {
      case control.name.includes('Access'):
        return 'Implement OAuth2 authentication and complete requirement';
      case control.name.includes('Encryption'):
        return 'Enable encryption for all artifact storage';
      case control.name.includes('Audit'):
        return 'Add audit logging artifact collection';
      case control.name.includes('Change'):
        return 'Configure proper timeout and retry values';
      case control.name.includes('Backup'):
        return 'Implement backup artifact configuration';
      default:
        return 'Review and address control requirements';
    }
  }

  async checkAllStandards(config: PipelineConfig): Promise<ComplianceReport[]> {
    const reports: ComplianceReport[] = [];
    
    for (const standard of this.standards) {
      const report = await this.check(config, standard.name);
      reports.push(report);
    }
    
    return reports;
  }

  getComplianceScore(config: PipelineConfig, standardName?: string): number {
    const standard = standardName 
      ? this.standards.find(s => s.name === standardName)
      : this.standards[0];

    if (!standard) {
      return 0;
    }

    let passedControls = 0;
    let totalControls = standard.controls.length;

    for (const stdControl of standard.controls) {
      const control = this.evaluateControl(config, stdControl);
      if (control.status === 'pass') {
        passedControls++;
      }
    }

    return Math.round((passedControls / totalControls) * 100);
  }
}

interface ComplianceStandard {
  name: string;
  version: string;
  controls: Array<{ id: string; name: string; category: string }>;
}