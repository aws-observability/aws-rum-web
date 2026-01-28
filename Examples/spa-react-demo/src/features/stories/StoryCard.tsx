import { Link } from 'react-router-dom';
import type { HNItem } from '../../types/hn';
import { formatTimeAgo, extractDomain } from '../../utils/formatters';

interface StoryCardProps {
    story: HNItem;
    rank: number;
}

export function StoryCard({ story, rank }: StoryCardProps) {
    const domain = story.url ? extractDomain(story.url) : '';

    return (
        <div className="flex gap-3 py-3 border-b border-gray-200 hover:bg-gray-50">
            <div className="text-gray-400 text-sm font-mono w-8 flex-shrink-0 text-right">
                {rank}.
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                    <Link
                        to={`/story/${story.id}`}
                        className="text-gray-900 hover:text-orange-600 font-medium"
                    >
                        {story.title}
                    </Link>
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
                <div className="text-gray-600 text-sm mt-1 flex items-center gap-3">
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
                    <Link to={`/story/${story.id}`} className="hover:underline">
                        {story.descendants || 0} comments
                    </Link>
                </div>
            </div>
        </div>
    );
}
