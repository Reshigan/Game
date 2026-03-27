// pipeline-analysis/src/services/dependency.analyzer.ts
import { PipelineStage } from '../types/pipeline.types';
import { Logger } from '../utils/logger';

interface DependencyGraph {
  nodes: Map<string, PipelineStage>;
  edges: Map<string, string[]>;
}

interface CircularDependency {
  cycle: string[];
}

interface MissingDependency {
  stage: string;
  missing: string;
}

export class DependencyAnalyzer {
  private readonly logger: Logger;

  constructor() {
    this.logger = new Logger('DependencyAnalyzer');
  }

  buildGraph(stages: PipelineStage[]): DependencyGraph {
    const nodes = new Map<string, PipelineStage>();
    const edges = new Map<string, string[]>();

    for (const stage of stages) {
      nodes.set(stage.id, stage);
      edges.set(stage.id, stage.dependencies);
    }

    return { nodes, edges };
  }

  detectCircularDependencies(stages: PipelineStage[]): CircularDependency[] {
    const graph = this.buildGraph(stages);
    const cycles: CircularDependency[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const detectCycle = (nodeId: string, path: string[]): void => {
      if (recursionStack.has(nodeId)) {
        const cycleStart = path.indexOf(nodeId);
        const cycle = path.slice(cycleStart);
        cycles.push({ cycle });
        return;
      }

      if (visited.has(nodeId)) {
        return;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const dependencies = graph.edges.get(nodeId) || [];
      for (const depId of dependencies) {
        detectCycle(depId, [...path]);
      }

      recursionStack.delete(nodeId);
    };

    for (const nodeId of graph.nodes.keys()) {
      detectCycle(nodeId, []);
    }

    return cycles;
  }

  detectOrphanStages(stages: PipelineStage[]): PipelineStage[] {
    const graph = this.buildGraph(stages);
    const orphans: PipelineStage[] = [];

    // Find stages that are not referenced by any other stage
    const referencedIds = new Set<string>();
    for (const [, deps] of graph.edges) {
      for (const depId of deps) {
        referencedIds.add(depId);
      }
    }

    // Find stages that don't reference any other stage (except first stage)
    const firstStage = stages.reduce((min, s) => s.order < min.order ? s : min, stages[0]);
    
    for (const [id, stage] of graph.nodes) {
      const isReferenced = referencedIds.has(id);
      const hasDependencies = stage.dependencies.length > 0;
      const isFirstStage = stage.id === firstStage.id;

      if (!isFirstStage && !isReferenced && !hasDependencies) {
        orphans.push(stage);
      }
    }

    return orphans;
  }

  detectMissingDependencies(stages: PipelineStage[]): MissingDependency[] {
    const graph = this.buildGraph(stages);
    const missing: MissingDependency[] = [];

    const stageIds = new Set(graph.nodes.keys());

    for (const [stageId, deps] of graph.edges) {
      for (const depId of deps) {
        if (!stageIds.has(depId)) {
          const stage = graph.nodes.get(stageId);
          if (stage) {
            missing.push({ stage: stage.name, missing: depId });
          }
        }
      }
    }

    return missing;
  }

  detectLongDependencyChains(stages: PipelineStage[], maxLength: number): string[][] {
    const graph = this.buildGraph(stages);
    const chains: string[][] = [];

    const findChain = (nodeId: string, currentChain: string[]): string[] => {
      const dependencies = graph.edges.get(nodeId) || [];
      
      if (dependencies.length === 0) {
        return currentChain;
      }

      const longestChain = dependencies.reduce((longest, depId) => {
        const chain = findChain(depId, [...currentChain, depId]);
        return chain.length > longest.length ? chain : longest;
      }, currentChain);

      return longestChain;
    };

    // Find chains starting from each stage
    for (const nodeId of graph.nodes.keys()) {
      const chain = findChain(nodeId, [nodeId]);
      if (chain.length > maxLength) {
        chains.push(chain);
      }
    }

    return chains;
  }

  getTopologicalOrder(stages: PipelineStage[]): PipelineStage[] {
    const graph = this.buildGraph(stages);
    const inDegree = new Map<string, number>();
    const result: PipelineStage[] = [];

    // Calculate in-degree for each node
    for (const nodeId of graph.nodes.keys()) {
      inDegree.set(nodeId, 0);
    }

    for (const [, deps] of graph.edges) {
      for (const depId of deps) {
        const current = inDegree.get(depId) || 0;
        inDegree.set(depId, current + 1);
      }
    }

    // Find nodes with no dependencies
    const queue: string[] = [];
    for (const [nodeId, degree] of inDegree) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    // Process nodes in topological order
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const stage = graph.nodes.get(nodeId);
      if (stage) {
        result.push(stage);
      }

      // Reduce in-degree for dependent nodes
      for (const [otherId, deps] of graph.edges) {
        if (deps.includes(nodeId)) {
          const current = inDegree.get(otherId) || 0;
          inDegree.set(otherId, current - 1);
          if (current - 1 === 0) {
            queue.push(otherId);
          }
        }
      }
    }

    return result;
  }

  getCriticalPath(stages: PipelineStage[]): PipelineStage[] {
    const ordered = this.getTopologicalOrder(stages);
    const earliestFinish = new Map<string, number>();

    for (const stage of ordered) {
      const duration = stage.metrics?.duration || 0;
      const depMaxFinish = stage.dependencies.reduce((max, depId) => {
        const depFinish = earliestFinish.get(depId) || 0;
        return Math.max(max, depFinish);
      }, 0);

      earliestFinish.set(stage.id, depMaxFinish + duration);
    }

    // Find the stage with maximum finish time
    let maxFinish = 0;
    let criticalEnd: string | null = null;
    for (const [id, finish] of earliestFinish) {
      if (finish > maxFinish) {
        maxFinish = finish;
        criticalEnd = id;
      }
    }

    // Trace back the critical path
    const criticalPath: PipelineStage[] = [];
    let currentId = criticalEnd;
    
    while (currentId) {
      const stage = stages.find(s => s.id === currentId);
      if (stage) {
        criticalPath.unshift(stage);
      }
      
      if (stage && stage.dependencies.length > 0) {
        // Find the dependency with maximum finish time
        let maxDepFinish = 0;
        let maxDepId: string | null = null;
        for (const depId of stage.dependencies) {
          const depFinish = earliestFinish.get(depId) || 0;
          if (depFinish > maxDepFinish) {
            maxDepFinish = depFinish;
            maxDepId = depId;
          }
        }
        currentId = maxDepId;
      } else {
        currentId = null;
      }
    }

    return criticalPath;
  }

  calculateParallelizationPotential(stages: PipelineStage[]): number {
    const sequentialCount = stages.filter(s => s.dependencies.length > 0).length;
    const parallelCount = stages.length - sequentialCount;
    
    if (stages.length === 0) {
      return 0;
    }

    return (parallelCount / stages.length) * 100;
  }
}