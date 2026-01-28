import { useParams, Link } from 'react-router-dom';
import { useGetItemQuery } from '../api/hn';
import { CommentTree } from '../features/comments/CommentTree';
import { formatTimeAgo, extractDomain } from '../utils/formatters';
import { useEffect } from 'react';

export function Story() {
    const { id } = useParams<{ id: string }>();
    const { data: story, isLoading, error } = useGetItemQuery(Number(id));

    useEffect(() => {
        if (story?.title) {
            document.title = `${story.title} | HN`;
        }
    }, [story]);

    if (isLoading) {
        return (
            <div className="animate-pulse space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-32 bg-gray-200 rounded" />
            </div>
        );
    }

    if (error || !story) {
        return (
            <div className="text-center py-12 text-red-600">
                Failed to load story. Please try again.
            </div>
        );
    }

    const domain = story.url ? extractDomain(story.url) : '';

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex items-baseline gap-2 mb-2">
                    <h1 className="text-2xl font-bold text-gray-900">
                        {story.title}
                    </h1>
                    {domain && (
                        <a
                            href={story.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-500 text-sm hover:underline"
                        >
                            ({domain})
                        </a>
                    )}
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                    <span>{story.score} points</span>
                    <span>
                        by{' '}
                        <Link
                            to={`/user/${story.by}`}
                            className="hover:underline"
                        >
                            {story.by}
                        </Link>
                    </span>
                    <span>{formatTimeAgo(story.time)}</span>
                    <span>{story.descendants || 0} comments</span>
                </div>

                {story.text && (
                    <div
                        className="prose prose-sm max-w-none text-gray-800 border-t pt-4"
                        dangerouslySetInnerHTML={{ __html: story.text }}
                    />
                )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">Comments</h2>
                <CommentTree story={story} />
            </div>

            <div className="mt-6">
                <Link to="/" className="text-orange-600 hover:underline">
                    ← Back to stories
                </Link>
            </div>
        </div>
    );
}
