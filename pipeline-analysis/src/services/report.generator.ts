// pipeline-analysis/src/services/report.generator.ts
import { AnalysisResult, AnalysisStatus } from '../types/pipeline.types';
import { Logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

export class ReportGenerator {
  private readonly logger: Logger;

  constructor() {
    this.logger = new Logger('ReportGenerator');
  }

  async generate(result: AnalysisResult, format: 'json' | 'html' | 'pdf'): Promise<string> {
    this.logger.debug('Generating report', { pipelineId: result.pipelineId, format });
    
    switch (format) {
      case 'json':
        return this.generateJson(result);
      case 'html':
        return this.generateHtml(result);
      case 'pdf':
        return this.generatePdfPlaceholder(result);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private generateJson(result: AnalysisResult): string {
    return JSON.stringify(result, null, 2);
  }

  private generateHtml(result: AnalysisResult): string {
    const statusColor = this.getStatusColor(result.status);
    const findingsHtml = this.generateFindingsHtml(result.findings);
    const recommendationsHtml = this.generateRecommendationsHtml(result.recommendations);
    const risksHtml = this.generateRisksHtml(result.risks);

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pipeline Analysis Report - ${result.pipelineId}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { border-bottom: 2px solid ${statusColor}; padding-bottom: 20px; margin-bottom: 30px; }
        .status { display: inline-block; padding: 8px 16px; border-radius: 4px; color: white; font-weight: bold; background: ${statusColor}; }
        .section { margin: 30px 0; }
        .section-title { font-size: 24px; color: #333; margin-bottom: 15px; border-left: 4px solid ${statusColor}; padding-left: 15px; }
        .card { background: #f9f9f9; padding: 20px; margin: 10px 0; border-radius: 4px; border-left: 4px solid #ddd; }
        .card.critical { border-left-color: #dc3545; }
        .card.high { border-left-color: #fd7e14; }
        .card.medium { border-left-color: #ffc107; }
        .card.low { border-left-color: #17a2b8; }
        .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: #f9f9f9; padding: 20px; border-radius: 4px; text-align: center; }
        .metric-value { font-size: 32px; font-weight: bold; color: #333; }
        .metric-label { color: #666; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f5f5f5; font-weight: bold; }
        .timestamp { color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Pipeline Analysis Report</h1>
            <p>Pipeline ID: ${result.pipelineId}</p>
            <p class="timestamp">Analyzed at: ${result.analyzedAt.toISOString()}</p>
            <span class="status">Status: ${result.status.toUpperCase()}</span>
        </div>

        <div class="section">
            <h2 class="section-title">Analysis Metrics</h2>
            <div class="metric-grid">
                <div class="metric-card">
                    <div class="metric-value">${result.metrics.totalStages}</div>
                    <div class="metric-label">Total Stages</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${result.metrics.completedStages}</div>
                    <div class="metric-label">Completed</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${result.metrics.failedStages}</div>
                    <div class="metric-label">Failed</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${result.metrics.successRate.toFixed(1)}%</div>
                    <div class="metric-label">Success Rate</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${(result.metrics.averageDuration / 1000).toFixed(1)}s</div>
                    <div class="metric-label">Avg Duration</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${result.metrics.resourceUtilization.cpuAverage.toFixed(1)}%</div>
                    <div class="metric-label">Avg CPU</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">Findings (${result.findings.length})</h2>
            ${findingsHtml}
        </div>

        <div class="section">
            <h2 class="section-title">Recommendations (${result.recommendations.length})</h2>
            ${recommendationsHtml}
        </div>

        <div class="section">
            <h2 class="section-title">Risks (${result.risks.length})</h2>
            ${risksHtml}
        </div>

        ${result.complianceReport ? `
        <div class="section">
            <h2 class="section-title">Compliance Report</h2>
            <p>Standard: ${result.complianceReport.standard} v${result.complianceReport.version}</p>
            <p>Status: ${result.complianceReport.overallStatus}</p>
            <p>Gaps: ${result.complianceReport.gaps.length}</p>
        </div>
        ` : ''}
    </div>
</body>
</html>
    `;

    return html;
  }

  private getStatusColor(status: AnalysisStatus): string {
    switch (status) {
      case 'success':
        return '#28a745';
      case 'partial':
        return '#ffc107';
      case 'failed':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  }

  private generateFindingsHtml(findings: Array<{ id: string; severity: string; category: string; title: string; description: string; location: string; evidence: string; remediation?: string }>): string {
    if (findings.length === 0) {
      return '<p>No findings detected.</p>';
    }

    return findings.map(finding => `
      <div class="card ${finding.severity}">
        <h3>${finding.title}</h3>
        <p><strong>Severity:</strong> ${finding.severity}</p>
        <p><strong>Category:</strong> ${finding.category}</p>
        <p><strong>Description:</strong> ${finding.description}</p>
        <p><strong>Location:</strong> ${finding.location}</p>
        <p><strong>Evidence:</strong> ${finding.evidence}</p>
        ${finding.remediation ? `<p><strong>Remediation:</strong> ${finding.remediation}</p>` : ''}
      </div>
    `).join('');
  }

  private generateRecommendationsHtml(recommendations: Array<{ id: string; priority: string; title: string; description: string; effort: string; impact: string; implementationSteps: string[] }>): string {
    if (recommendations.length === 0) {
      return '<p>No recommendations generated.</p>';
    }

    return recommendations.map(rec => `
      <div class="card">
        <h3>${rec.title}</h3>
        <p><strong>Priority:</strong> ${rec.priority}</p>
        <p><strong>Description:</strong> ${rec.description}</p>
        <p><strong>Effort:</strong> ${rec.effort} | <strong>Impact:</strong> ${rec.impact}</p>
        <h4>Implementation Steps:</h4>
        <ol>
          ${rec.implementationSteps.map(step => `<li>${step}</li>`).join('')}
        </ol>
      </div>
    `).join('');
  }

  private generateRisksHtml(risks: Array<{ id: string; type: string; severity: string; probability: string; impact: string; description: string; mitigation: string[]; owner?: string }>): string {
    if (risks.length === 0) {
      return '<p>No risks identified.</p>';
    }

    return risks.map(risk => `
      <div class="card ${risk.severity}">
        <h3>${risk.description}</h3>
        <p><strong>Type:</strong> ${risk.type}</p>
        <p><strong>Severity:</strong> ${risk.severity}</p>
        <p><strong>Probability:</strong> ${risk.probability}</p>
        <p><strong>Impact:</strong> ${risk.impact}</p>
        ${risk.owner ? `<p><strong>Owner:</strong> ${risk.owner}</p>` : ''}
        <h4>Mitigation:</h4>
        <ul>
          ${risk.mitigation.map(m => `<li>${m}</li>`).join('')}
        </ul>
      </div>
    `).join('');
  }

  private generatePdfPlaceholder(result: AnalysisResult): string {
    // In production, this would use a PDF library like pdfkit or puppeteer
    // For this implementation, return a placeholder message
    return `PDF report generation for pipeline ${result.pipelineId} would require a PDF library. 
    HTML report can be converted to PDF using browser print functionality or server-side PDF generation.`;
  }

  async saveToFile(content: string, filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    
    return new Promise((resolve, reject) => {
      fs.mkdir(dir, { recursive: true }, (err) => {
        if (err && err.code !== 'EEXIST') {
          reject(err);
          return;
        }
        
        fs.writeFile(filePath, content, 'utf-8', (writeErr) => {
          if (writeErr) {
            reject(writeErr);
          } else {
            resolve();
          }
        });
      });
    });
  }
}