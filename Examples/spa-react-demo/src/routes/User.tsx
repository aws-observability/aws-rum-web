import { useParams, Link } from 'react-router-dom';
import { useGetUserQuery, useGetItemsQuery } from '../api/hn';
import { formatTimeAgo } from '../utils/formatters';
import { useEffect } from 'react';

export function User() {
    const { id } = useParams<{ id: string }>();
    const { data: user, isLoading, error } = useGetUserQuery(id!);

    const submittedIds = user?.submitted?.slice(0, 30) || [];
    const { data: submissions } = useGetItemsQuery(submittedIds, {
        skip: !user?.submitted
    });

    useEffect(() => {
        if (user?.id) {
            document.title = `${user.id} | HN`;
        }
    }, [user]);

    if (isLoading) {
        return (
            <div className="animate-pulse space-y-4">
                <div className="h-8 bg-gray-200 rounded w-1/2" />
                <div className="h-4 bg-gray-200 rounded w-1/4" />
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="text-center py-12 text-red-600">
                User not found.
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                    {user.id}
                </h1>

                <div className="space-y-2 text-gray-700 mb-4">
                    <div>
                        <span className="font-semibold">Karma:</span>{' '}
                        {user.karma}
                    </div>
                    <div>
                        <span className="font-semibold">Joined:</span>{' '}
                        {formatTimeAgo(user.created)}
                    </div>
                </div>

                {user.about && (
                    <div
                        className="prose prose-sm max-w-none text-gray-800 border-t pt-4"
                        dangerouslySetInnerHTML={{ __html: user.about }}
                    />
                )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">Recent Submissions</h2>

                {!submissions || submissions.length === 0 ? (
                    <p className="text-gray-600">No submissions yet.</p>
                ) : (
                    <div className="space-y-4">
                        {submissions.map((item) => (
                            <div
                                key={item.id}
                                className="border-b border-gray-200 pb-4 last:border-0"
                            >
                                <Link
                                    to={`/story/${item.id}`}
                                    className="text-gray-900 hover:text-orange-600 font-medium"
                                >
                                    {item.title || item.text?.slice(0, 100)}
                                </Link>
                                <div className="text-sm text-gray-600 mt-1">
                                    {item.score} points •{' '}
                                    {formatTimeAgo(item.time)} •{' '}
                                    {item.descendants || 0} comments
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="mt-6">
                <Link to="/" className="text-orange-600 hover:underline">
                    ← Back to stories
                </Link>
            </div>
        </div>
    );
}
