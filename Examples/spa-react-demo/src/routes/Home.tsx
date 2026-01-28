import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useGetStoryIdsQuery } from '../api/hn';
import { StoryList } from '../features/stories/StoryList';
import type { StoryType } from '../types/hn';
import { useEffect, useState, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

const STORY_TYPE_LABELS: Record<StoryType, string> = {
    top: 'Top',
    new: 'New',
    best: 'Best',
    ask: 'Ask HN',
    show: 'Show HN',
    job: 'Jobs'
};

export function Home() {
    const { storyType = 'top' } = useParams<{ storyType: StoryType }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const page = parseInt(searchParams.get('page') || '1', 10);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const {
        data: storyIds,
        isLoading,
        error
    } = useGetStoryIdsQuery(storyType as StoryType);

    const isStoriesPage = ['top', 'new', 'best'].includes(storyType);
    const showDropdown = isStoriesPage;

    useEffect(() => {
        document.title = `${
            STORY_TYPE_LABELS[storyType as StoryType] || 'Stories'
        } | HN`;
    }, [storyType]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (value: string) => {
        navigate(`/${value}`);
        setDropdownOpen(false);
    };

    if (isLoading) {
        return (
            <div className="space-y-3">
                {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                        <div className="h-16 bg-gray-200 rounded" />
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12 text-red-600">
                Failed to load stories. Please try again.
            </div>
        );
    }

    if (!storyIds || storyIds.length === 0) {
        return (
            <div className="text-center py-12 text-gray-600">
                No stories found.
            </div>
        );
    }

    const totalPages = Math.ceil(storyIds.length / 30);

    return (
        <div>
            {showDropdown && (
                <div className="mb-4 flex items-center gap-3">
                    <span className="text-gray-700 font-medium">Sort by:</span>
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <span className="font-medium text-gray-900">
                                {STORY_TYPE_LABELS[storyType as StoryType]}
                            </span>
                            <ChevronDown className="w-4 h-4 text-gray-600" />
                        </button>

                        {dropdownOpen && (
                            <div className="absolute top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[140px] overflow-hidden z-10">
                                <button
                                    onClick={() => handleSelect('top')}
                                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${
                                        storyType === 'top'
                                            ? 'bg-orange-50 text-orange-600 font-medium'
                                            : 'text-gray-900'
                                    }`}
                                >
                                    Top
                                </button>
                                <button
                                    onClick={() => handleSelect('new')}
                                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${
                                        storyType === 'new'
                                            ? 'bg-orange-50 text-orange-600 font-medium'
                                            : 'text-gray-900'
                                    }`}
                                >
                                    New
                                </button>
                                <button
                                    onClick={() => handleSelect('best')}
                                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${
                                        storyType === 'best'
                                            ? 'bg-orange-50 text-orange-600 font-medium'
                                            : 'text-gray-900'
                                    }`}
                                >
                                    Best
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <StoryList storyIds={storyIds} page={page} />

            {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                    <button
                        onClick={() =>
                            setSearchParams({ page: String(page - 1) })
                        }
                        disabled={page === 1}
                        className="px-4 py-2 bg-white border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                        Previous
                    </button>
                    <span className="px-4 py-2 text-gray-700">
                        Page {page} of {totalPages}
                    </span>
                    <button
                        onClick={() =>
                            setSearchParams({ page: String(page + 1) })
                        }
                        disabled={page === totalPages}
                        className="px-4 py-2 bg-white border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
