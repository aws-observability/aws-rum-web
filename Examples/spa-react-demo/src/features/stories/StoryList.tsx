import { Virtuoso } from 'react-virtuoso';
import { useGetItemsQuery } from '../../api/hn';
import { StoryCard } from './StoryCard';
import { STORIES_PER_PAGE } from '../../utils/constants';

interface StoryListProps {
    storyIds: number[];
    page: number;
}

export function StoryList({ storyIds, page }: StoryListProps) {
    const startIdx = (page - 1) * STORIES_PER_PAGE;
    const endIdx = startIdx + STORIES_PER_PAGE;
    const pageIds = storyIds.slice(startIdx, endIdx);

    const { data: stories, isLoading, error } = useGetItemsQuery(pageIds);

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

    if (!stories || stories.length === 0) {
        return (
            <div className="text-center py-12 text-gray-600">
                No stories found.
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow">
            <Virtuoso
                style={{ height: '80vh' }}
                totalCount={stories.length}
                itemContent={(index) => (
                    <StoryCard
                        story={stories[index]}
                        rank={startIdx + index + 1}
                    />
                )}
            />
        </div>
    );
}
