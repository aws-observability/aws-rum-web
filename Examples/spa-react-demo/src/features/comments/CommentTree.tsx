import type { HNItem } from '../../types/hn';
import { CommentNode } from './CommentNode';

interface CommentTreeProps {
    story: HNItem;
}

export function CommentTree({ story }: CommentTreeProps) {
    if (!story.kids || story.kids.length === 0) {
        return (
            <div className="text-center py-12 text-gray-600">
                No comments yet.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {story.kids.map((kidId) => (
                <CommentNode key={kidId} commentId={kidId} depth={0} />
            ))}
        </div>
    );
}
