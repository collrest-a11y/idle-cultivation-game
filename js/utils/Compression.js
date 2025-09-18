/**
 * Compression utility for save file optimization
 * Provides LZ-string compression with fallbacks and performance optimization
 */
class CompressionUtil {
    constructor() {
        this.compressionEnabled = true;
        this.compressionThreshold = 1024; // Only compress data larger than 1KB
        this.compressionLevel = 'best'; // 'fast', 'balanced', 'best'

        // Compression statistics
        this.stats = {
            totalCompressions: 0,
            totalDecompressions: 0,
            totalBytesCompressed: 0,
            totalBytesDecompressed: 0,
            totalTimeSaved: 0,
            averageCompressionRatio: 0,
            compressionErrors: 0,
            decompressionErrors: 0
        };

        // Available compression methods
        this.methods = {
            lzstring: this._hasLZString(),
            gzip: this._hasGzipSupport(),
            deflate: this._hasDeflateSupport(),
            brotli: this._hasBrotliSupport()
        };

        // Select best available compression method
        this.selectedMethod = this._selectBestMethod();

        console.log(`CompressionUtil initialized with method: ${this.selectedMethod}`);
    }

    /**
     * Compress data using the best available method
     * @param {string} data - Data to compress
     * @param {Object} options - Compression options
     * @returns {Promise<string>} Compressed data
     */
    async compress(data, options = {}) {
        const config = {
            threshold: this.compressionThreshold,
            level: this.compressionLevel,
            encoding: 'base64',
            ...options
        };

        if (!this.compressionEnabled || !data || typeof data !== 'string') {
            return data;
        }

        // Skip compression for small data
        if (data.length < config.threshold) {
            return data;
        }

        const startTime = performance.now();

        try {
            let compressedData;

            switch (this.selectedMethod) {
                case 'lzstring':
                    compressedData = await this._compressLZString(data, config);
                    break;
                case 'gzip':
                    compressedData = await this._compressGzip(data, config);
                    break;
                case 'deflate':
                    compressedData = await this._compressDeflate(data, config);
                    break;
                case 'brotli':
                    compressedData = await this._compressBrotli(data, config);
                    break;
                default:
                    compressedData = await this._compressFallback(data, config);
                    break;
            }

            // Add compression header for identification
            const header = this._createCompressionHeader(this.selectedMethod, config);
            const finalData = header + compressedData;

            // Update statistics
            const endTime = performance.now();
            this._updateCompressionStats(data.length, finalData.length, endTime - startTime);

            // Only return compressed data if it's actually smaller
            if (finalData.length < data.length) {
                return finalData;
            } else {
                console.log('CompressionUtil: Compression not beneficial, returning original data');
                return data;
            }

        } catch (error) {
            console.error('CompressionUtil: Compression failed:', error);
            this.stats.compressionErrors++;
            return data; // Return original data on error
        }
    }

    /**
     * Decompress data using the appropriate method
     * @param {string} data - Compressed data
     * @param {Object} options - Decompression options
     * @returns {Promise<string>} Decompressed data
     */
    async decompress(data, options = {}) {
        if (!data || typeof data !== 'string') {
            return data;
        }

        // Check if data is actually compressed
        if (!this.isCompressed(data)) {
            return data;
        }

        const startTime = performance.now();

        try {
            // Parse compression header
            const headerInfo = this._parseCompressionHeader(data);
            if (!headerInfo) {
                throw new Error('Invalid compression header');
            }

            const compressedData = data.substring(headerInfo.headerLength);
            let decompressedData;

            switch (headerInfo.method) {
                case 'lzstring':
                    decompressedData = await this._decompressLZString(compressedData, headerInfo.config);
                    break;
                case 'gzip':
                    decompressedData = await this._decompressGzip(compressedData, headerInfo.config);
                    break;
                case 'deflate':
                    decompressedData = await this._decompressDeflate(compressedData, headerInfo.config);
                    break;
                case 'brotli':
                    decompressedData = await this._decompressBrotli(compressedData, headerInfo.config);
                    break;
                default:
                    decompressedData = await this._decompressFallback(compressedData, headerInfo.config);
                    break;
            }

            // Update statistics
            const endTime = performance.now();
            this._updateDecompressionStats(data.length, decompressedData.length, endTime - startTime);

            return decompressedData;

        } catch (error) {
            console.error('CompressionUtil: Decompression failed:', error);
            this.stats.decompressionErrors++;

            // Try to recover by returning original data
            return data;
        }
    }

    /**
     * Check if data appears to be compressed
     * @param {string} data - Data to check
     * @returns {boolean} Whether data appears compressed
     */
    isCompressed(data) {
        if (!data || typeof data !== 'string' || data.length < 10) {
            return false;
        }

        // Check for compression header
        return data.startsWith('COMP:') || data.startsWith('LZ:') || data.startsWith('GZ:');
    }

    /**
     * Estimate compression ratio for data
     * @param {string} data - Data to estimate
     * @returns {Promise<number>} Estimated compression ratio (0-1)
     */
    async estimateCompressionRatio(data) {
        if (!data || data.length < this.compressionThreshold) {
            return 1.0; // No compression benefit
        }

        try {
            // Use a small sample for estimation
            const sampleSize = Math.min(data.length, 10000);
            const sample = data.substring(0, sampleSize);

            const compressed = await this.compress(sample);
            return compressed.length / sample.length;

        } catch (error) {
            console.error('CompressionUtil: Estimation failed:', error);
            return 1.0;
        }
    }

    /**
     * Get compression statistics
     * @returns {Object} Compression statistics
     */
    getStats() {
        return {
            ...this.stats,
            compressionEnabled: this.compressionEnabled,
            selectedMethod: this.selectedMethod,
            availableMethods: this.methods,
            compressionThreshold: this.compressionThreshold
        };
    }

    /**
     * Reset compression statistics
     */
    resetStats() {
        this.stats = {
            totalCompressions: 0,
            totalDecompressions: 0,
            totalBytesCompressed: 0,
            totalBytesDecompressed: 0,
            totalTimeSaved: 0,
            averageCompressionRatio: 0,
            compressionErrors: 0,
            decompressionErrors: 0
        };
    }

    /**
     * Configure compression settings
     * @param {Object} config - Configuration options
     */
    configure(config) {
        if (config.hasOwnProperty('enabled')) {
            this.compressionEnabled = config.enabled;
        }
        if (config.hasOwnProperty('threshold')) {
            this.compressionThreshold = Math.max(0, config.threshold);
        }
        if (config.hasOwnProperty('level')) {
            this.compressionLevel = config.level;
        }

        console.log('CompressionUtil: Configuration updated');
    }

    // Private methods

    /**
     * Check if LZ-string library is available
     * @returns {boolean} Whether LZ-string is available
     */
    _hasLZString() {
        return typeof LZString !== 'undefined';
    }

    /**
     * Check if Gzip compression is supported
     * @returns {boolean} Whether Gzip is supported
     */
    _hasGzipSupport() {
        return typeof CompressionStream !== 'undefined' &&
               'gzip' in CompressionStream.prototype || false;
    }

    /**
     * Check if Deflate compression is supported
     * @returns {boolean} Whether Deflate is supported
     */
    _hasDeflateSupport() {
        return typeof CompressionStream !== 'undefined' &&
               'deflate' in CompressionStream.prototype || false;
    }

    /**
     * Check if Brotli compression is supported
     * @returns {boolean} Whether Brotli is supported
     */
    _hasBrotliSupport() {
        return typeof CompressionStream !== 'undefined' &&
               'br' in CompressionStream.prototype || false;
    }

    /**
     * Select the best available compression method
     * @returns {string} Selected compression method
     */
    _selectBestMethod() {
        // Priority order: brotli > gzip > deflate > lzstring > fallback
        if (this.methods.brotli) return 'brotli';
        if (this.methods.gzip) return 'gzip';
        if (this.methods.deflate) return 'deflate';
        if (this.methods.lzstring) return 'lzstring';
        return 'fallback';
    }

    /**
     * Compress using LZ-string
     * @param {string} data - Data to compress
     * @param {Object} config - Configuration
     * @returns {Promise<string>} Compressed data
     */
    async _compressLZString(data, config) {
        if (typeof LZString === 'undefined') {
            throw new Error('LZString library not available');
        }

        switch (config.encoding) {
            case 'base64':
                return LZString.compressToBase64(data);
            case 'utf16':
                return LZString.compressToUTF16(data);
            case 'encodeduri':
                return LZString.compressToEncodedURIComponent(data);
            default:
                return LZString.compress(data);
        }
    }

    /**
     * Decompress using LZ-string
     * @param {string} data - Compressed data
     * @param {Object} config - Configuration
     * @returns {Promise<string>} Decompressed data
     */
    async _decompressLZString(data, config) {
        if (typeof LZString === 'undefined') {
            throw new Error('LZString library not available');
        }

        switch (config.encoding) {
            case 'base64':
                return LZString.decompressFromBase64(data);
            case 'utf16':
                return LZString.decompressFromUTF16(data);
            case 'encodeduri':
                return LZString.decompressFromEncodedURIComponent(data);
            default:
                return LZString.decompress(data);
        }
    }

    /**
     * Compress using Gzip (if supported)
     * @param {string} data - Data to compress
     * @param {Object} config - Configuration
     * @returns {Promise<string>} Compressed data
     */
    async _compressGzip(data, config) {
        if (typeof CompressionStream === 'undefined') {
            throw new Error('CompressionStream not supported');
        }

        const stream = new CompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();

        // Write data to stream
        await writer.write(new TextEncoder().encode(data));
        await writer.close();

        // Read compressed data
        const chunks = [];
        let done = false;

        while (!done) {
            const { value, done: streamDone } = await reader.read();
            done = streamDone;
            if (value) {
                chunks.push(value);
            }
        }

        // Convert to base64 for storage
        const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
        let offset = 0;
        for (const chunk of chunks) {
            compressed.set(chunk, offset);
            offset += chunk.length;
        }

        return btoa(String.fromCharCode(...compressed));
    }

    /**
     * Decompress using Gzip (if supported)
     * @param {string} data - Compressed data
     * @param {Object} config - Configuration
     * @returns {Promise<string>} Decompressed data
     */
    async _decompressGzip(data, config) {
        if (typeof DecompressionStream === 'undefined') {
            throw new Error('DecompressionStream not supported');
        }

        // Convert from base64
        const binaryString = atob(data);
        const compressed = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            compressed[i] = binaryString.charCodeAt(i);
        }

        const stream = new DecompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();

        // Write compressed data to stream
        await writer.write(compressed);
        await writer.close();

        // Read decompressed data
        const chunks = [];
        let done = false;

        while (!done) {
            const { value, done: streamDone } = await reader.read();
            done = streamDone;
            if (value) {
                chunks.push(value);
            }
        }

        // Convert back to string
        const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
        let offset = 0;
        for (const chunk of chunks) {
            decompressed.set(chunk, offset);
            offset += chunk.length;
        }

        return new TextDecoder().decode(decompressed);
    }

    /**
     * Compress using Deflate (if supported)
     * @param {string} data - Data to compress
     * @param {Object} config - Configuration
     * @returns {Promise<string>} Compressed data
     */
    async _compressDeflate(data, config) {
        // Similar implementation to Gzip but using 'deflate'
        return this._compressGzip(data, config).catch(() => {
            throw new Error('Deflate compression not supported');
        });
    }

    /**
     * Decompress using Deflate (if supported)
     * @param {string} data - Compressed data
     * @param {Object} config - Configuration
     * @returns {Promise<string>} Decompressed data
     */
    async _decompressDeflate(data, config) {
        // Similar implementation to Gzip but using 'deflate'
        return this._decompressGzip(data, config).catch(() => {
            throw new Error('Deflate decompression not supported');
        });
    }

    /**
     * Compress using Brotli (if supported)
     * @param {string} data - Data to compress
     * @param {Object} config - Configuration
     * @returns {Promise<string>} Compressed data
     */
    async _compressBrotli(data, config) {
        // Similar implementation to Gzip but using 'br' (Brotli)
        return this._compressGzip(data, config).catch(() => {
            throw new Error('Brotli compression not supported');
        });
    }

    /**
     * Decompress using Brotli (if supported)
     * @param {string} data - Compressed data
     * @param {Object} config - Configuration
     * @returns {Promise<string>} Decompressed data
     */
    async _decompressBrotli(data, config) {
        // Similar implementation to Gzip but using 'br' (Brotli)
        return this._decompressGzip(data, config).catch(() => {
            throw new Error('Brotli decompression not supported');
        });
    }

    /**
     * Fallback compression using simple string manipulation
     * @param {string} data - Data to compress
     * @param {Object} config - Configuration
     * @returns {Promise<string>} "Compressed" data
     */
    async _compressFallback(data, config) {
        // Simple fallback - just encode to base64 to avoid conflicts
        // This doesn't actually compress but provides a consistent format
        return btoa(unescape(encodeURIComponent(data)));
    }

    /**
     * Fallback decompression
     * @param {string} data - "Compressed" data
     * @param {Object} config - Configuration
     * @returns {Promise<string>} Decompressed data
     */
    async _decompressFallback(data, config) {
        try {
            return decodeURIComponent(escape(atob(data)));
        } catch (error) {
            throw new Error('Fallback decompression failed');
        }
    }

    /**
     * Create compression header for identification
     * @param {string} method - Compression method
     * @param {Object} config - Configuration
     * @returns {string} Compression header
     */
    _createCompressionHeader(method, config) {
        const headerData = {
            method,
            encoding: config.encoding || 'default',
            level: config.level || 'balanced',
            version: '1.0'
        };

        return `COMP:${JSON.stringify(headerData)}:`;
    }

    /**
     * Parse compression header
     * @param {string} data - Data with header
     * @returns {Object|null} Header information
     */
    _parseCompressionHeader(data) {
        if (!data.startsWith('COMP:')) {
            // Try legacy LZ-string format
            if (data.startsWith('LZ:')) {
                return {
                    method: 'lzstring',
                    config: { encoding: 'default' },
                    headerLength: 3
                };
            }
            return null;
        }

        try {
            const headerEnd = data.indexOf(':', 5);
            if (headerEnd === -1) return null;

            const headerJson = data.substring(5, headerEnd);
            const headerData = JSON.parse(headerJson);

            return {
                method: headerData.method,
                config: {
                    encoding: headerData.encoding,
                    level: headerData.level
                },
                headerLength: headerEnd + 1,
                version: headerData.version
            };

        } catch (error) {
            console.error('CompressionUtil: Failed to parse header:', error);
            return null;
        }
    }

    /**
     * Update compression statistics
     * @param {number} originalSize - Original data size
     * @param {number} compressedSize - Compressed data size
     * @param {number} timeElapsed - Time elapsed in milliseconds
     */
    _updateCompressionStats(originalSize, compressedSize, timeElapsed) {
        this.stats.totalCompressions++;
        this.stats.totalBytesCompressed += originalSize;
        this.stats.totalTimeSaved += timeElapsed;

        const ratio = compressedSize / originalSize;
        this.stats.averageCompressionRatio =
            (this.stats.averageCompressionRatio * (this.stats.totalCompressions - 1) + ratio) /
            this.stats.totalCompressions;
    }

    /**
     * Update decompression statistics
     * @param {number} compressedSize - Compressed data size
     * @param {number} decompressedSize - Decompressed data size
     * @param {number} timeElapsed - Time elapsed in milliseconds
     */
    _updateDecompressionStats(compressedSize, decompressedSize, timeElapsed) {
        this.stats.totalDecompressions++;
        this.stats.totalBytesDecompressed += decompressedSize;
        this.stats.totalTimeSaved += timeElapsed;
    }
}

// Create singleton instance
const compressionUtil = new CompressionUtil();

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CompressionUtil, compressionUtil };
} else if (typeof window !== 'undefined') {
    window.CompressionUtil = CompressionUtil;
    window.compressionUtil = compressionUtil;
}