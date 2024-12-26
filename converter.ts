import type { ConversionOptions, JsonData } from '../types';
import { auth } from '$lib/stores/auth';
import { get } from 'svelte/store';

export class ConverterService {
    private static readonly DEFAULT_OPTIONS: Required<ConversionOptions> = {
        delimiter: ',',
        includeHeaders: true,
        customHeaders: [],
        dateFormat: 'YYYY-MM-DD HH:mm:ss',
        encoding: 'utf-8',
        nullValue: '',
        escapeSpecialChars: true,
        nestedObjectHandling: 'stringify',
        arrayHandling: 'stringify',
        maxRows: 1000000, // Prevent browser crashes from huge files
        chunkSize: 1000 // Process large files in chunks
    };

    /**
     * Validates JSON data before conversion
     * @param jsonData - Data to validate
     * @throws Error if data is invalid or exceeds maxRows
     */
    private static validateData(jsonData: any[] | object, options: Required<ConversionOptions>): void {
        if (!jsonData || (Array.isArray(jsonData) && jsonData.length === 0)) {
            throw new Error('Input data is empty');
        }
        
        const data = Array.isArray(jsonData) ? jsonData : [jsonData];
        if (!data.every(item => item && typeof item === 'object' && !Array.isArray(item))) {
            throw new Error('Input data must be an object or array of objects');
        }

        if (data.length > options.maxRows) {
            throw new Error(`Data exceeds maximum row limit of ${options.maxRows.toLocaleString()} rows`);
        }
    }

    /**
     * Formats a value based on its type and conversion options
     * @param value - Value to format
     * @param header - Column header
     * @param rowIndex - Current row index
     * @param options - Conversion options
     * @returns Formatted string value
     */
    private static formatValue(
        value: any,
        header: string,
        rowIndex: number,
        options: Required<ConversionOptions>
    ): string {
        if (value === null || value === undefined) {
            return options.nullValue;
        }

        try {
            // Handle Date objects and ISO date strings
            if (value instanceof Date || (typeof value === 'string' && this.isISODate(value))) {
                const date = value instanceof Date ? value : new Date(value);
                return this.formatDate(date, options.dateFormat);
            }

            // Handle arrays
            if (Array.isArray(value)) {
                return this.handleArray(value, header, rowIndex, options);
            }

            // Handle nested objects
            if (typeof value === 'object') {
                return this.handleNestedObject(value, header, rowIndex, options);
            }

            // Handle basic types
            if (typeof value === 'string') {
                return this.escapeString(value, options);
            }

            // Handle numbers with proper formatting
            if (typeof value === 'number') {
                return this.formatNumber(value);
            }

            // Handle booleans
            if (typeof value === 'boolean') {
                return String(value);
            }

            return String(value);
        } catch (error) {
            console.error(`Error formatting value at row ${rowIndex + 1}, column "${header}":`, error);
            return options.nullValue;
        }
    }

    /**
     * Checks if a string is in ISO date format
     */
    private static isISODate(str: string): boolean {
        const isoDateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:?\d{2})?)?$/;
        if (!isoDateRegex.test(str)) return false;
        
        const date = new Date(str);
        return date instanceof Date && !isNaN(date.getTime());
    }

    /**
     * Formats a number with proper decimal places and thousands separators
     */
    private static formatNumber(num: number): string {
        if (isNaN(num)) return '';
        if (!isFinite(num)) return String(num);
        
        return num.toString().includes('e') 
            ? num.toLocaleString('fullwide', { useGrouping: false })
            : num.toString();
    }

    /**
     * Formats a date according to the specified format
     * @param date - Date to format
     * @param format - Date format string
     * @returns Formatted date string
     */
    private static formatDate(date: Date, format: string): string {
        const pad = (num: number): string => String(num).padStart(2, '0');
        
        const tokens: Record<string, string> = {
            'YYYY': String(date.getFullYear()),
            'MM': pad(date.getMonth() + 1),
            'DD': pad(date.getDate()),
            'HH': pad(date.getHours()),
            'mm': pad(date.getMinutes()),
            'ss': pad(date.getSeconds()),
            'SSS': String(date.getMilliseconds()).padStart(3, '0')
        };

        return Object.entries(tokens).reduce(
            (result, [token, value]) => result.replace(token, value),
            format
        );
    }

    /**
     * Handles array values based on arrayHandling option
     */
    private static handleArray(
        arr: any[],
        header: string,
        rowIndex: number,
        options: Required<ConversionOptions>
    ): string {
        if (arr.length === 0) return options.nullValue;

        switch (options.arrayHandling) {
            case 'join':
                return this.escapeString(
                    arr.map(item => this.formatValue(item, header, rowIndex, options)).join(';'),
                    options
                );
            case 'stringify':
                return this.escapeString(JSON.stringify(arr), options);
            case 'unwind':
                // For unwind, we'll handle this separately in the main conversion
                return this.escapeString(JSON.stringify(arr), options);
            default:
                throw new Error(`Invalid array handling option: ${options.arrayHandling}`);
        }
    }

    /**
     * Handles nested objects based on nestedObjectHandling option
     */
    private static handleNestedObject(
        obj: object,
        header: string,
        rowIndex: number,
        options: Required<ConversionOptions>
    ): string {
        if (Object.keys(obj).length === 0) return options.nullValue;

        switch (options.nestedObjectHandling) {
            case 'flatten':
                const flattened = this.flattenObject(obj);
                return this.escapeString(
                    Object.entries(flattened)
                        .map(([key, val]) => `${key}:${val}`)
                        .join(';'),
                    options
                );
            case 'stringify':
                return this.escapeString(JSON.stringify(obj), options);
            case 'ignore':
                return options.nullValue;
            default:
                throw new Error(`Invalid nested object handling option: ${options.nestedObjectHandling}`);
        }
    }

    /**
     * Flattens a nested object into a single-level object
     */
    private static flattenObject(obj: object, prefix = ''): Record<string, string> {
        return Object.entries(obj).reduce((acc, [key, value]) => {
            const newKey = prefix ? `${prefix}.${key}` : key;
            
            if (value === null || value === undefined) {
                acc[newKey] = '';
            } else if (value instanceof Date) {
                acc[newKey] = this.formatDate(value, this.DEFAULT_OPTIONS.dateFormat);
            } else if (typeof value === 'object' && !Array.isArray(value)) {
                Object.assign(acc, this.flattenObject(value, newKey));
            } else {
                acc[newKey] = String(value);
            }
            
            return acc;
        }, {} as Record<string, string>);
    }

    /**
     * Escapes a string value according to CSV rules and options
     */
    private static escapeString(value: string, options: Required<ConversionOptions>): string {
        if (!options.escapeSpecialChars) {
            return value;
        }

        // Replace double quotes with two double quotes
        const escaped = value.replace(/"/g, '""');
        
        // Check if the value needs to be quoted
        const needsQuotes = escaped.includes(options.delimiter) || 
                          escaped.includes('"') || 
                          escaped.includes('\n') ||
                          escaped.includes('\r') ||
                          escaped.includes(';') ||  // Common list separator
                          escaped.startsWith(' ') ||
                          escaped.endsWith(' ');
        
        return needsQuotes ? `"${escaped}"` : escaped;
    }

    /**
     * Converts JSON data to CSV format
     * @param jsonData - Array of objects or a single object to convert
     * @param options - Conversion options (delimiter, headers, etc.)
     * @returns CSV string
     * @throws Error if data is invalid
     */
    static jsonToCsv(
        jsonData: JsonData[] | JsonData,
        options: ConversionOptions = {}
    ): string {
        const mergedOptions: Required<ConversionOptions> = {
            ...this.DEFAULT_OPTIONS,
            ...options
        };

        this.validateData(jsonData, mergedOptions);

        // Convert single object to array
        let data = Array.isArray(jsonData) ? jsonData : [jsonData];

        // Handle array unwinding if specified
        if (mergedOptions.arrayHandling === 'unwind') {
            data = this.unwindArrays(data);
        }

        // Get headers (either custom or from the first object)
        const headers = mergedOptions.customHeaders.length > 0
            ? mergedOptions.customHeaders
            : this.extractHeaders(data, mergedOptions);

        if (headers.length === 0) {
            throw new Error('No headers found in data');
        }

        // Generate CSV rows
        const rows: string[] = [];

        // Add headers if requested
        if (mergedOptions.includeHeaders) {
            rows.push(headers.map(header => 
                this.escapeString(header, mergedOptions)
            ).join(mergedOptions.delimiter));
        }

        // Process data in chunks to prevent memory issues with large datasets
        for (let i = 0; i < data.length; i += mergedOptions.chunkSize) {
            const chunk = data.slice(i, i + mergedOptions.chunkSize);
            
            chunk.forEach((item, index) => {
                const row = headers.map(header => 
                    this.formatValue(item[header], header, i + index, mergedOptions)
                );
                rows.push(row.join(mergedOptions.delimiter));
            });
        }

        return rows.join('\n');
    }

    /**
     * Extracts all unique headers from the data, including nested paths if flattening
     */
    private static extractHeaders(
        data: JsonData[],
        options: Required<ConversionOptions>
    ): string[] {
        const headerSet = new Set<string>();

        data.forEach(item => {
            if (options.nestedObjectHandling === 'flatten') {
                const flattened = this.flattenObject(item);
                Object.keys(flattened).forEach(key => headerSet.add(key));
            } else {
                Object.keys(item).forEach(key => headerSet.add(key));
            }
        });

        return Array.from(headerSet).sort();
    }

    /**
     * Unwinds arrays in the data, creating multiple rows for array elements
     */
    private static unwindArrays(data: JsonData[]): JsonData[] {
        const result: JsonData[] = [];

        data.forEach(item => {
            const arrayFields = Object.entries(item)
                .filter(([_, value]) => Array.isArray(value))
                .map(([key, _]) => key);

            if (arrayFields.length === 0) {
                result.push({ ...item });
                return;
            }

            const baseObject = { ...item };
            arrayFields.forEach(field => {
                const array = item[field] as any[];
                if (!array || array.length === 0) {
                    baseObject[field] = null;
                    if (result.length === 0) {
                        result.push({ ...baseObject });
                    }
                } else {
                    array.forEach(element => {
                        result.push({
                            ...baseObject,
                            [field]: element
                        });
                    });
                }
            });
        });

        return result;
    }

    /**
     * Downloads the CSV data as a file
     * @param csvData - CSV string to download
     * @param filename - Name of the file to download
     * @param options - Conversion options affecting the download
     * @throws Error if browser doesn't support file download
     */
    static downloadCsv(
        csvData: string,
        filename: string = 'data.csv',
        options: ConversionOptions = {}
    ): void {
        if (!csvData) {
            throw new Error('No data to download');
        }

        const mergedOptions = { ...this.DEFAULT_OPTIONS, ...options };
        const sanitizedFilename = this.sanitizeFilename(filename);

        try {
            // Add BOM for UTF-16 files or UTF-8 if specified
            const bom = mergedOptions.encoding === 'utf-16le' 
                ? new Uint16Array([0xFEFF]) 
                : new Uint8Array([0xEF, 0xBB, 0xBF]);

            const blob = new Blob(
                [bom, csvData],
                { type: `text/csv;charset=${mergedOptions.encoding}` }
            );
            
            // Create and trigger download
            if (typeof window !== 'undefined') {
                if (navigator.msSaveBlob) {
                    // IE 10+
                    navigator.msSaveBlob(blob, sanitizedFilename);
                } else {
                    // Modern browsers
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.setAttribute('download', sanitizedFilename);
                    link.style.display = 'none';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(link.href);
                }
            } else {
                throw new Error('File download is only supported in browser environments');
            }
        } catch (error) {
            console.error('Download error:', error);
            throw new Error(`Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Sanitizes a filename to remove invalid characters
     */
    private static sanitizeFilename(filename: string): string {
        // Remove invalid filename characters and limit length
        return filename
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
            .replace(/^\.+/, '_') // Remove leading dots
            .substring(0, 255); // Limit length to 255 characters
    }

    /**
     * Converts and downloads JSON data as CSV
     * @param jsonData - Data to convert and download
     * @param filename - Name of the file to download
     * @param options - Conversion options
     * @throws Error if conversion or download fails
     */
    static async convertAndDownload(
        jsonData: JsonData[] | JsonData,
        filename: string = 'data.csv',
        options: ConversionOptions = {}
    ): Promise<void> {
        try {
            const csvData = this.jsonToCsv(jsonData, options);
            await this.downloadCsv(csvData, filename, options);
        } catch (error) {
            console.error('Conversion error:', error);
            throw error;
        }
    }

    /**
     * Tracks learning progress
     * @param text - Text to translate
     * @param fromLang - Source language
     * @param toLang - Target language
     */
    static async trackLearningProgress(
        text: string,
        fromLang: string,
        toLang: string
    ): Promise<void> {
        const user = get(auth);
        if (user) {
            const today = new Date().toISOString().split('T')[0];
            const weekday = new Date().getDay(); // 0 = Sunday, 6 = Saturday
            
            // Update streak if last practice was yesterday
            let streak = user.learningProgress.streak;
            if (user.learningProgress.lastPracticeDate) {
                const lastPractice = new Date(user.learningProgress.lastPracticeDate);
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                
                if (lastPractice.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0]) {
                    streak++;
                } else if (lastPractice.toISOString().split('T')[0] !== today) {
                    streak = 1;
                }
            } else {
                streak = 1;
            }

            // Update weekly progress
            const weeklyProgress = [...user.learningProgress.weeklyProgress.values];
            weeklyProgress[weekday] += 1;

            auth.updateProgress({
                streak,
                wordsLearned: user.learningProgress.wordsLearned + 1,
                weeklyProgress: {
                    labels: user.learningProgress.weeklyProgress.labels,
                    values: weeklyProgress
                },
                lastPracticeDate: today
            });
        }
    }
}
