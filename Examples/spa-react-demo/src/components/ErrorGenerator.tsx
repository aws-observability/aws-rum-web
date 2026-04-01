import { useState, useCallback } from 'react';
import { ErrorType, type ErrorQueueItem } from '../types/errorGenerator';
import { generateError, ERROR_DEFAULTS } from '../utils/errorGenerators';

/**
 * ErrorGenerator Component
 *
 * Provides an interface to generate various JavaScript errors for testing RUM error monitoring.
 * Supports batch generation with configurable delays and custom error messages.
 */
export function ErrorGenerator() {
    const [selectedTypes, setSelectedTypes] = useState<ErrorType[]>([]);
    const [customMessage, setCustomMessage] = useState('');
    const [repeatCount, setRepeatCount] = useState(1);
    const [delay, setDelay] = useState(500);
    const [isGenerating, setIsGenerating] = useState(false);
    const [status, setStatus] = useState('');

    const handleSelectChange = useCallback(
        (e: React.ChangeEvent<HTMLSelectElement>) => {
            const options = Array.from(e.target.selectedOptions);
            setSelectedTypes(options.map((opt) => opt.value as ErrorType));
        },
        []
    );

    const sleep = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

    const handleGenerate = useCallback(async () => {
        if (selectedTypes.length === 0) {
            setStatus('Please select at least one error type');
            setTimeout(() => setStatus(''), 2000);
            return;
        }

        setIsGenerating(true);
        const queue: ErrorQueueItem[] = [];

        // Build error queue
        for (let i = 0; i < repeatCount; i++) {
            for (const type of selectedTypes) {
                queue.push({
                    type,
                    message: customMessage || ERROR_DEFAULTS[type]
                });
            }
        }

        // Generate errors sequentially
        for (let i = 0; i < queue.length; i++) {
            const item = queue[i];
            setStatus(`Generating ${item.type} (${i + 1}/${queue.length})...`);

            // Wrap in setTimeout to prevent synchronous errors from stopping the loop
            // This allows errors to propagate to RUM's global error handlers
            setTimeout(() => {
                generateError(item.type, item.message);
            }, 0);

            if (i < queue.length - 1) {
                await sleep(delay);
            }
        }

        setStatus(`✓ Generated ${queue.length} error(s)`);
        setTimeout(() => {
            setStatus('');
            setIsGenerating(false);
        }, 2000);
    }, [selectedTypes, customMessage, repeatCount, delay]);

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    JavaScript Error Generator
                </h1>
                <p className="text-gray-600 mb-6">
                    Generate various JavaScript errors to test RUM error
                    monitoring capabilities.
                </p>

                <div className="space-y-4">
                    {/* Error Type Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Error Types (hold Ctrl/Cmd to select multiple)
                        </label>
                        <select
                            multiple
                            value={selectedTypes}
                            onChange={handleSelectChange}
                            className="w-full border border-gray-300 rounded-md p-2 h-48 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        >
                            {Object.values(ErrorType).map((type) => (
                                <option
                                    key={type}
                                    value={type}
                                    className="py-1"
                                >
                                    {type}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            Selected:{' '}
                            {selectedTypes.length > 0
                                ? selectedTypes.join(', ')
                                : 'None'}
                        </p>
                    </div>

                    {/* Custom Message */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Custom Error Message (optional)
                        </label>
                        <input
                            type="text"
                            value={customMessage}
                            onChange={(e) => setCustomMessage(e.target.value)}
                            placeholder="Leave empty to use default messages"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                    </div>

                    {/* Repeat Count */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Repeat Count
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={repeatCount}
                            onChange={(e) =>
                                setRepeatCount(parseInt(e.target.value) || 1)
                            }
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                    </div>

                    {/* Delay */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Delay Between Errors (ms)
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={delay}
                            onChange={(e) =>
                                setDelay(parseInt(e.target.value) || 0)
                            }
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                    </div>

                    {/* Generate Button */}
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className={`w-full py-3 px-4 rounded-md font-medium text-white transition-colors ${
                            isGenerating
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-orange-500 hover:bg-orange-600'
                        }`}
                    >
                        {isGenerating ? 'Generating...' : 'Generate Error(s)'}
                    </button>

                    {/* Status Display */}
                    {status && (
                        <div
                            className={`p-3 rounded-md text-sm ${
                                status.startsWith('✓')
                                    ? 'bg-green-50 text-green-800'
                                    : status.startsWith('Please')
                                    ? 'bg-yellow-50 text-yellow-800'
                                    : 'bg-blue-50 text-blue-800'
                            }`}
                        >
                            {status}
                        </div>
                    )}
                </div>

                {/* Default Messages Reference */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                        Default Error Messages:
                    </h3>
                    <ul className="text-xs text-gray-600 space-y-1">
                        {Object.entries(ERROR_DEFAULTS).map(
                            ([type, message]) => (
                                <li key={type}>
                                    <span className="font-medium">{type}:</span>{' '}
                                    {message}
                                </li>
                            )
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
}
