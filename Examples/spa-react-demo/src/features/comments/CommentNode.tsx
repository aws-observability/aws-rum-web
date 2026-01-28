import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGetItemQuery } from '../../api/hn';
import { formatTimeAgo } from '../../utils/formatters';
import {
    INITIAL_COMMENT_BREADTH,
    INITIAL_COMMENT_DEPTH
} from '../../utils/constants';

interface CommentNodeProps {
    commentId: number;
    depth: number;
}

export function CommentNode({ commentId, depth }: CommentNodeProps) {
    const { data: comment, isLoading } = useGetItemQuery(commentId);
    const [collapsed, setCollapsed] = useState(false);
    const [showMore, setShowMore] = useState(false);

    if (isLoading) {
        return (
            <div className="animate-pulse ml-4 my-2">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
        );
    }

    if (!comment || comment.deleted || comment.dead) {
        return null;
    }

    const hasKids = comment.kids && comment.kids.length > 0;
    const visibleKids = showMore
        ? comment.kids
        : comment.kids?.slice(0, INITIAL_COMMENT_BREADTH);
    const hiddenCount = comment.kids
        ? comment.kids.length - INITIAL_COMMENT_BREADTH
        : 0;

    return (
        <div
            className={`border-l-2 border-gray-200 ${
                depth > 0 ? 'ml-4' : ''
            } my-2`}
        >
            <div className="pl-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <Link
                        to={`/user/${comment.by}`}
                        className="font-medium hover:text-orange-600"
                    >
                        {comment.by}
                    </Link>
                    <span>{formatTimeAgo(comment.time)}</span>
                    {hasKids && (
                        <button
                            onClick={() => setCollapsed(!collapsed)}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            [{collapsed ? '+' : '−'}]
                        </button>
                    )}
                </div>

                {!collapsed && (
                    <>
                        <div
                            className="text-gray-800 prose prose-sm max-w-none mb-2"
                            dangerouslySetInnerHTML={{
                                __html: comment.text || ''
                            }}
                        />

                        {hasKids && depth < INITIAL_COMMENT_DEPTH && (
                            <div>
                                {visibleKids?.map((kidId) => (
                                    <CommentNode
                                        key={kidId}
                                        commentId={kidId}
                                        depth={depth + 1}
                                    />
                                ))}
                                {!showMore && hiddenCount > 0 && (
                                    <button
                                        onClick={() => setShowMore(true)}
                                        className="text-sm text-orange-600 hover:underline ml-4 my-2"
                                    >
                                        Show {hiddenCount} more{' '}
                                        {hiddenCount === 1
                                            ? 'reply'
                                            : 'replies'}
                                    </button>
                                )}
                            </div>
                        )}

                        {hasKids && depth >= INITIAL_COMMENT_DEPTH && (
                            <button
                                onClick={() => setShowMore(!showMore)}
                                className="text-sm text-orange-600 hover:underline ml-4 my-2"
                            >
                                {showMore
                                    ? 'Hide'
                                    : `Show ${comment.kids?.length} ${
                                          comment.kids?.length === 1
                                              ? 'reply'
                                              : 'replies'
                                      }`}
                            </button>
                        )}

                        {showMore && depth >= INITIAL_COMMENT_DEPTH && (
                            <div>
                                {comment.kids?.map((kidId) => (
                                    <CommentNode
                                        key={kidId}
                                        commentId={kidId}
                                        depth={depth + 1}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
