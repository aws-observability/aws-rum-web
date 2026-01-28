/**
 * Formats bytes into human-readable file sizes
 * @param bytes - The number of bytes to format
 * @returns Formatted string with appropriate unit (bytes, KB, MB, GB, TB)
 */
export const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 bytes';

    const k = 1024;
    const sizes = ['bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
