
/**
 * Enhanced Performance Monitor - Created by Performance Optimization
 * Provides real-time performance metrics and bottleneck detection
 */
class EnhancedPerformanceMonitor {
    constructor() {
        this.metrics = {
            loadTime: 0,
            moduleLoadTime: {},
            domReadyTime: 0,
            gameInitTime: 0,
            frameRate: [],
            memoryUsage: [],
            errorCount: 0,
            warningCount: 0
        };
        this.startTime = performance.now();
        this.init();
    }

    init() {
        // Track DOM ready time
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.metrics.domReadyTime = performance.now() - this.startTime;
            });
        } else {
            this.metrics.domReadyTime = performance.now() - this.startTime;
        }

        // Start frame rate monitoring
        this.startFrameRateMonitoring();

        // Start memory monitoring
        this.startMemoryMonitoring();

        // Track page load complete
        window.addEventListener('load', () => {
            this.metrics.loadTime = performance.now() - this.startTime;
        });
    }

    startFrameRateMonitoring() {
        let lastTime = performance.now();
        let frameCount = 0;

        const measureFrame = (currentTime) => {
            frameCount++;
            if (currentTime - lastTime >= 1000) {
                const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
                this.metrics.frameRate.push(fps);

                // Keep only last 60 measurements (1 minute at 1 FPS measurement rate)
                if (this.metrics.frameRate.length > 60) {
                    this.metrics.frameRate.shift();
                }

                frameCount = 0;
                lastTime = currentTime;
            }
            requestAnimationFrame(measureFrame);
        };
        requestAnimationFrame(measureFrame);
    }

    startMemoryMonitoring() {
        if (performance.memory) {
            setInterval(() => {
                const memInfo = {
                    used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                    total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                    limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024),
                    timestamp: Date.now()
                };
                this.metrics.memoryUsage.push(memInfo);

                // Keep only last 100 measurements
                if (this.metrics.memoryUsage.length > 100) {
                    this.metrics.memoryUsage.shift();
                }
            }, 5000); // Every 5 seconds
        }
    }

    recordModuleLoadTime(moduleName, loadTime) {
        this.metrics.moduleLoadTime[moduleName] = loadTime;
    }

    recordGameInitTime(initTime) {
        this.metrics.gameInitTime = initTime;
    }

    getMetrics() {
        const avgFrameRate = this.metrics.frameRate.length > 0
            ? Math.round(this.metrics.frameRate.reduce((a, b) => a + b, 0) / this.metrics.frameRate.length)
            : 0;

        const currentMemory = this.metrics.memoryUsage.length > 0
            ? this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1]
            : null;

        return {
            ...this.metrics,
            averageFrameRate: avgFrameRate,
            currentMemory: currentMemory,
            totalRunTime: performance.now() - this.startTime
        };
    }

    generateReport() {
        const metrics = this.getMetrics();
        console.log('📊 Performance Report:');
        console.log(`   Load Time: ${metrics.loadTime.toFixed(2)}ms`);
        console.log(`   DOM Ready: ${metrics.domReadyTime.toFixed(2)}ms`);
        console.log(`   Game Init: ${metrics.gameInitTime.toFixed(2)}ms`);
        console.log(`   Avg FPS: ${metrics.averageFrameRate}`);
        if (metrics.currentMemory) {
            console.log(`   Memory: ${metrics.currentMemory.used}MB / ${metrics.currentMemory.total}MB`);
        }
        return metrics;
    }
}

// Initialize enhanced performance monitor
if (typeof window !== 'undefined') {
    window.enhancedPerformanceMonitor = new EnhancedPerformanceMonitor();
}
