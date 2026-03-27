// pipeline-analysis/src/cli.ts
#!/usr/bin/env node
import { AnalysisService } from './services/analysis.service';
import { ReportGenerator } from './services/report.generator';
import { Logger } from './utils/logger';
import * as readline from 'readline';

const logger = new Logger('PipelineAnalysisCLI');

async function main(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const analysisService = new AnalysisService();
  const reportGenerator = new ReportGenerator();

  logger.info('Pipeline Analysis CLI started');

  // Handle analysis-complete event
  analysisService.on('analysis-complete', (result) => {
    logger.info('Analysis completed', { 
      pipelineId: result.pipelineId, 
      status: result.status,
      findingsCount: result.findings.length,
    });
  });

  // Handle analysis-error event
  analysisService.on('analysis-error', (error) => {
    logger.error('Analysis failed', { error: error instanceof Error ? error.message : 'Unknown error' });
  });

  // Example: Run analysis on a pipeline
  const pipelineId = process.argv[2] || 'pipeline-12345678';
  const options = {
    deepScan: process.argv.includes('--deep'),
    includeCompliance: process.argv.includes('--compliance'),
    securityScan: !process.argv.includes('--no-security'),
    performanceProfile: !process.argv.includes('--no-perf'),
    costAnalysis: process.argv.includes('--cost'),
  };

  logger.info('Starting analysis', { pipelineId, options });

  try {
    const result = await analysisService.analyze({
      pipelineId,
      options,
    });

    // Generate report
    const format = process.argv.includes('--html') ? 'html' : 'json';
    const report = await reportGenerator.generate(result, format);

    if (process.argv.includes('--output')) {
      const outputPath = process.argv[process.argv.indexOf('--output') + 1];
      await reportGenerator.saveToFile(report, outputPath);
      logger.info('Report saved', { path: outputPath });
    } else {
      console.log(report);
    }

    // Print summary
    console.log('\n=== Analysis Summary ===');
    console.log(`Pipeline: ${result.pipelineId}`);
    console.log(`Status: ${result.status}`);
    console.log(`Findings: ${result.findings.length}`);
    console.log(`Recommendations: ${result.recommendations.length}`);
    console.log(`Risks: ${result.risks.length}`);
    console.log(`Success Rate: ${result.metrics.successRate.toFixed(2)}%`);
    console.log(`Average Duration: ${(result.metrics.averageDuration / 1000).toFixed(2)}s`);

    if (result.complianceReport) {
      console.log(`\nCompliance: ${result.complianceReport.standard} - ${result.complianceReport.overallStatus}`);
    }

    rl.close();
    process.exit(0);
  } catch (error) {
    logger.error('Analysis failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    rl.close();
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error('CLI failed', { error: error instanceof Error ? error.message : 'Unknown error' });
  process.exit(1);
});