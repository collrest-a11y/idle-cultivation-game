/**
 * DependencyGraph.js - Module dependency management system
 * Builds DAG and determines optimal loading order
 */

class DependencyGraph {
    constructor() {
        this.nodes = new Map(); // Module name -> Module info
        this.edges = new Map(); // Module name -> Set of dependencies
        this.reverseEdges = new Map(); // Module name -> Set of dependents
        this.loadOrder = [];
        this.loadingGroups = [];
        this.stats = {
            totalModules: 0,
            totalDependencies: 0,
            maxDepth: 0,
            circularDependencies: []
        };
    }

    /**
     * Add a module to the graph
     */
    addModule(name, config = {}) {
        if (!this.nodes.has(name)) {
            this.nodes.set(name, {
                name,
                type: config.type || 'feature',
                priority: config.priority || 0,
                dependencies: config.dependencies || [],
                dependents: new Set(),
                depth: 0,
                visited: false,
                inProgress: false
            });

            this.edges.set(name, new Set(config.dependencies || []));
            this.reverseEdges.set(name, new Set());

            // Update reverse edges for dependencies
            for (const dep of config.dependencies || []) {
                if (!this.reverseEdges.has(dep)) {
                    this.reverseEdges.set(dep, new Set());
                }
                this.reverseEdges.get(dep).add(name);
            }

            this.stats.totalModules++;
            this.stats.totalDependencies += (config.dependencies || []).length;
        }

        return this;
    }

    /**
     * Add dependency between modules
     */
    addDependency(from, to) {
        // Ensure both modules exist
        if (!this.nodes.has(from)) {
            this.addModule(from);
        }
        if (!this.nodes.has(to)) {
            this.addModule(to);
        }

        // Add edge
        this.edges.get(from).add(to);
        this.reverseEdges.get(to).add(from);

        // Update node info
        const fromNode = this.nodes.get(from);
        fromNode.dependencies.push(to);

        const toNode = this.nodes.get(to);
        toNode.dependents.add(from);

        this.stats.totalDependencies++;

        return this;
    }

    /**
     * Calculate topological sort using Kahn's algorithm
     */
    topologicalSort() {
        const sorted = [];
        const inDegree = new Map();

        // Initialize in-degree for all nodes
        for (const [name] of this.nodes) {
            inDegree.set(name, 0);
        }

        // Calculate in-degrees
        for (const [, dependencies] of this.edges) {
            for (const dep of dependencies) {
                inDegree.set(dep, (inDegree.get(dep) || 0) + 1);
            }
        }

        // Find all nodes with no incoming edges
        const queue = [];
        for (const [name, degree] of inDegree) {
            if (degree === 0) {
                queue.push(name);
            }
        }

        // Process nodes
        while (queue.length > 0) {
            // Sort queue by priority for deterministic order
            queue.sort((a, b) => {
                const nodeA = this.nodes.get(a);
                const nodeB = this.nodes.get(b);
                return (nodeB.priority || 0) - (nodeA.priority || 0);
            });

            const current = queue.shift();
            sorted.push(current);

            // Reduce in-degree for dependent nodes
            const dependents = this.reverseEdges.get(current) || new Set();
            for (const dependent of dependents) {
                const newDegree = inDegree.get(dependent) - 1;
                inDegree.set(dependent, newDegree);

                if (newDegree === 0) {
                    queue.push(dependent);
                }
            }
        }

        // Check for cycles
        if (sorted.length !== this.nodes.size) {
            const remaining = [];
            for (const [name] of this.nodes) {
                if (!sorted.includes(name)) {
                    remaining.push(name);
                }
            }
            console.warn('Circular dependency detected involving:', remaining);
            this.stats.circularDependencies = remaining;

            // Add remaining nodes anyway (they're in a cycle)
            sorted.push(...remaining);
        }

        this.loadOrder = sorted;
        return sorted;
    }

    /**
     * Detect circular dependencies using Tarjan's algorithm
     */
    findCircularDependencies() {
        const index = new Map();
        const lowLink = new Map();
        const onStack = new Map();
        const stack = [];
        const stronglyConnected = [];
        let currentIndex = 0;

        const strongConnect = (node) => {
            index.set(node, currentIndex);
            lowLink.set(node, currentIndex);
            currentIndex++;
            stack.push(node);
            onStack.set(node, true);

            // Consider successors
            const dependencies = this.edges.get(node) || new Set();
            for (const dep of dependencies) {
                if (!index.has(dep)) {
                    strongConnect(dep);
                    lowLink.set(node, Math.min(lowLink.get(node), lowLink.get(dep)));
                } else if (onStack.get(dep)) {
                    lowLink.set(node, Math.min(lowLink.get(node), index.get(dep)));
                }
            }

            // If node is a root node, pop the stack and create SCC
            if (lowLink.get(node) === index.get(node)) {
                const component = [];
                let w;
                do {
                    w = stack.pop();
                    onStack.set(w, false);
                    component.push(w);
                } while (w !== node);

                if (component.length > 1) {
                    stronglyConnected.push(component);
                }
            }
        };

        // Run algorithm on all nodes
        for (const [name] of this.nodes) {
            if (!index.has(name)) {
                strongConnect(name);
            }
        }

        return stronglyConnected;
    }

    /**
     * Calculate dependency depth for each module
     */
    calculateDepths() {
        const depths = new Map();

        const calculateDepth = (node, visited = new Set()) => {
            if (depths.has(node)) {
                return depths.get(node);
            }

            if (visited.has(node)) {
                return 0; // Circular dependency
            }

            visited.add(node);

            const dependencies = this.edges.get(node) || new Set();
            let maxDepth = 0;

            for (const dep of dependencies) {
                const depDepth = calculateDepth(dep, new Set(visited));
                maxDepth = Math.max(maxDepth, depDepth + 1);
            }

            depths.set(node, maxDepth);
            this.nodes.get(node).depth = maxDepth;

            return maxDepth;
        };

        // Calculate depth for all nodes
        for (const [name] of this.nodes) {
            calculateDepth(name);
        }

        // Update stats
        this.stats.maxDepth = Math.max(...depths.values());

        return depths;
    }

    /**
     * Generate parallel loading groups
     */
    generateLoadingGroups() {
        const groups = [];
        const processed = new Set();
        const depths = this.calculateDepths();

        // Sort modules by depth
        const modulesByDepth = new Map();
        for (const [name, depth] of depths) {
            if (!modulesByDepth.has(depth)) {
                modulesByDepth.set(depth, []);
            }
            modulesByDepth.get(depth).push(name);
        }

        // Create groups by depth level
        const maxDepth = Math.max(...depths.values());
        for (let d = maxDepth; d >= 0; d--) {
            const modules = modulesByDepth.get(d) || [];
            if (modules.length > 0) {
                // Check if all dependencies are satisfied
                const group = modules.filter(module => {
                    const deps = this.edges.get(module) || new Set();
                    for (const dep of deps) {
                        if (!processed.has(dep)) {
                            return false;
                        }
                    }
                    return true;
                });

                if (group.length > 0) {
                    groups.push(group);
                    group.forEach(m => processed.add(m));
                }
            }
        }

        this.loadingGroups = groups;
        return groups;
    }

    /**
     * Find critical path (longest dependency chain)
     */
    findCriticalPath() {
        const paths = new Map();

        const findPath = (node, currentPath = []) => {
            currentPath = [...currentPath, node];

            const dependencies = this.edges.get(node) || new Set();
            if (dependencies.size === 0) {
                return currentPath;
            }

            let longestPath = currentPath;
            for (const dep of dependencies) {
                if (!currentPath.includes(dep)) { // Avoid cycles
                    const path = findPath(dep, currentPath);
                    if (path.length > longestPath.length) {
                        longestPath = path;
                    }
                }
            }

            return longestPath;
        };

        // Find longest path from each node
        let criticalPath = [];
        for (const [name] of this.nodes) {
            const path = findPath(name);
            if (path.length > criticalPath.length) {
                criticalPath = path;
            }
        }

        return criticalPath;
    }

    /**
     * Optimize loading order for performance
     */
    optimizeLoadOrder() {
        const sorted = this.topologicalSort();
        const groups = this.generateLoadingGroups();

        // Optimize within each group based on priority and size
        const optimized = [];
        for (const group of groups) {
            const sortedGroup = [...group].sort((a, b) => {
                const nodeA = this.nodes.get(a);
                const nodeB = this.nodes.get(b);

                // Priority first
                if (nodeA.priority !== nodeB.priority) {
                    return nodeB.priority - nodeA.priority;
                }

                // Then by type (core > system > feature)
                const typeOrder = { core: 3, system: 2, feature: 1, utility: 0 };
                const typeA = typeOrder[nodeA.type] || 0;
                const typeB = typeOrder[nodeB.type] || 0;

                return typeB - typeA;
            });

            optimized.push(sortedGroup);
        }

        return {
            sequential: sorted,
            parallel: optimized,
            criticalPath: this.findCriticalPath()
        };
    }

    /**
     * Check if adding a dependency would create a cycle
     */
    wouldCreateCycle(from, to) {
        // DFS to check if we can reach 'from' starting from 'to'
        const visited = new Set();
        const stack = [to];

        while (stack.length > 0) {
            const current = stack.pop();

            if (current === from) {
                return true; // Cycle detected
            }

            if (!visited.has(current)) {
                visited.add(current);
                const deps = this.edges.get(current) || new Set();
                stack.push(...deps);
            }
        }

        return false;
    }

    /**
     * Get module load statistics
     */
    getStatistics() {
        const circular = this.findCircularDependencies();
        const depths = this.calculateDepths();
        const criticalPath = this.findCriticalPath();

        return {
            ...this.stats,
            circularDependencies: circular,
            criticalPathLength: criticalPath.length,
            criticalPath: criticalPath,
            averageDepth: Array.from(depths.values()).reduce((a, b) => a + b, 0) / depths.size,
            modulesByDepth: depths
        };
    }

    /**
     * Export graph to DOT format for visualization
     */
    toDOT() {
        let dot = 'digraph ModuleDependencies {\n';
        dot += '  rankdir=LR;\n';
        dot += '  node [shape=box, style=filled, fillcolor=lightblue];\n\n';

        // Add nodes with labels
        for (const [name, node] of this.nodes) {
            const color = node.type === 'core' ? 'lightgreen' :
                         node.type === 'system' ? 'lightyellow' :
                         'lightblue';
            dot += `  "${name}" [fillcolor=${color}, label="${name}\\n(${node.type})"];\n`;
        }

        dot += '\n';

        // Add edges
        for (const [from, dependencies] of this.edges) {
            for (const to of dependencies) {
                dot += `  "${from}" -> "${to}";\n`;
            }
        }

        dot += '}\n';
        return dot;
    }

    /**
     * Clear the graph
     */
    clear() {
        this.nodes.clear();
        this.edges.clear();
        this.reverseEdges.clear();
        this.loadOrder = [];
        this.loadingGroups = [];
        this.stats = {
            totalModules: 0,
            totalDependencies: 0,
            maxDepth: 0,
            circularDependencies: []
        };
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DependencyGraph;
} else {
    window.DependencyGraph = DependencyGraph;
}