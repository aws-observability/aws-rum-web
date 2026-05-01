// Shared client-side helpers and the per-page bootstrap logic for the MPA
// demo. Each page includes this script and calls the right initializer.
//
// This file is deliberately framework-free vanilla JS so it mirrors what
// a real plain-HTML site would ship alongside the CDN snippet.

const HN_API = 'https://hacker-news.firebaseio.com/v0';
const STORIES_PER_PAGE = 30;
const INITIAL_COMMENT_DEPTH = 3;
const INITIAL_COMMENT_BREADTH = 5;

const STORY_TYPE_LABELS = {
    top: 'Top',
    new: 'New',
    best: 'Best',
    ask: 'Ask HN',
    show: 'Show HN',
    job: 'Jobs'
};

function formatTimeAgo(timestamp) {
    const seconds = Math.floor(Date.now() / 1000 - timestamp);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
    if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}mo ago`;
    return `${Math.floor(seconds / 31536000)}y ago`;
}

function extractDomain(url) {
    try {
        return new URL(url).hostname.replace('www.', '');
    } catch {
        return '';
    }
}

function esc(s) {
    if (s == null) return '';
    const d = document.createElement('div');
    d.textContent = String(s);
    return d.innerHTML;
}

async function getItem(id) {
    const r = await fetch(`${HN_API}/item/${id}.json`);
    return r.json();
}

// ----- Stories list page ------------------------------------------------

async function initStoriesPage(storyType) {
    document.title = `${STORY_TYPE_LABELS[storyType]} | HN`;

    const params = new URLSearchParams(location.search);
    const page = Math.max(1, parseInt(params.get('page') || '1', 10));

    const isStoriesPage = ['top', 'new', 'best'].includes(storyType);
    if (isStoriesPage) renderSortDropdown(storyType);

    const listEl = document.getElementById('stories');
    const idsRes = await fetch(`${HN_API}/${storyType}stories.json`);
    const allIds = await idsRes.json();

    const start = (page - 1) * STORIES_PER_PAGE;
    const pageIds = allIds.slice(start, start + STORIES_PER_PAGE);
    const items = await Promise.all(pageIds.map(getItem));

    listEl.innerHTML = items
        .filter((s) => s && !s.deleted && !s.dead)
        .map((s, i) => renderStoryCard(s, start + i + 1))
        .join('');

    const totalPages = Math.ceil(allIds.length / STORIES_PER_PAGE);
    if (totalPages > 1) renderPagination(page, totalPages, storyType);
}

function renderStoryCard(s, rank) {
    const domain = s.url ? extractDomain(s.url) : '';
    const externalLink = s.url
        ? `<a href="${esc(
              s.url
          )}" target="_blank" rel="noopener noreferrer" class="title">${esc(
              s.title
          )}</a>`
        : `<a href="/story.html?id=${s.id}" class="title">${esc(s.title)}</a>`;
    return `
        <div class="story-card">
            <div class="rank">${rank}.</div>
            <div class="story-body">
                <div class="title-line">
                    ${externalLink}
                    ${
                        domain
                            ? `<a href="${esc(
                                  s.url
                              )}" target="_blank" rel="noopener noreferrer" class="domain">(${esc(
                                  domain
                              )})</a>`
                            : ''
                    }
                </div>
                <div class="meta">
                    <span>${s.score ?? 0} points</span>
                    <span>by <a href="/user.html?id=${encodeURIComponent(
                        s.by ?? ''
                    )}">${esc(s.by ?? '—')}</a></span>
                    <span>${formatTimeAgo(s.time)}</span>
                    <a href="/story.html?id=${s.id}">${
        s.descendants ?? 0
    } comments</a>
                </div>
            </div>
        </div>`;
}

function renderSortDropdown(current) {
    const host = document.getElementById('sort-host');
    if (!host) return;
    host.innerHTML = `
        <span class="sort-label">Sort by:</span>
        <div class="dropdown" id="dropdown">
            <button type="button" class="dropdown-btn" id="dropdown-btn">
                <span>${STORY_TYPE_LABELS[current]}</span>
                <span class="caret">▾</span>
            </button>
            <div class="dropdown-menu" id="dropdown-menu" hidden>
                ${['top', 'new', 'best']
                    .map(
                        (t) =>
                            `<a href="/${t}.html" class="${
                                t === current ? 'active' : ''
                            }">${STORY_TYPE_LABELS[t]}</a>`
                    )
                    .join('')}
            </div>
        </div>`;
    const btn = document.getElementById('dropdown-btn');
    const menu = document.getElementById('dropdown-menu');
    btn.addEventListener('click', () => {
        menu.hidden = !menu.hidden;
    });
    document.addEventListener('mousedown', (e) => {
        if (!document.getElementById('dropdown').contains(e.target)) {
            menu.hidden = true;
        }
    });
}

function renderPagination(page, totalPages, storyType) {
    const host = document.getElementById('pagination');
    if (!host) return;
    const base = `/${storyType}.html`;
    host.innerHTML = `
        <a href="${base}?page=${page - 1}" class="page-btn ${
        page === 1 ? 'disabled' : ''
    }" ${page === 1 ? 'aria-disabled="true"' : ''}>Previous</a>
        <span class="page-info">Page ${page} of ${totalPages}</span>
        <a href="${base}?page=${page + 1}" class="page-btn ${
        page === totalPages ? 'disabled' : ''
    }" ${page === totalPages ? 'aria-disabled="true"' : ''}>Next</a>`;
}

// ----- Story detail page -----------------------------------------------

async function initStoryPage() {
    const storyId = new URLSearchParams(location.search).get('id');
    const storyEl = document.getElementById('story');
    const commentsEl = document.getElementById('comments');

    if (!storyId) {
        storyEl.innerHTML =
            '<div class="status warn">Missing ?id= query param. Pick a story from the <a href="/top.html">Top</a> list.</div>';
        return;
    }

    const story = await getItem(storyId);
    if (!story) {
        storyEl.innerHTML = '<div class="status warn">Story not found.</div>';
        return;
    }
    document.title = `${story.title} | HN`;
    const domain = story.url ? extractDomain(story.url) : '';
    storyEl.innerHTML = `
        <div class="card">
            <div class="title-line">
                <h1>${esc(story.title)}</h1>
                ${
                    domain
                        ? `<a href="${esc(
                              story.url
                          )}" target="_blank" rel="noopener noreferrer" class="domain">(${esc(
                              domain
                          )})</a>`
                        : ''
                }
            </div>
            <div class="meta">
                <span>${story.score ?? 0} points</span>
                <span>by <a href="/user.html?id=${encodeURIComponent(
                    story.by ?? ''
                )}">${esc(story.by ?? '—')}</a></span>
                <span>${formatTimeAgo(story.time)}</span>
                <span>${story.descendants ?? 0} comments</span>
            </div>
            ${story.text ? `<div class="body">${story.text}</div>` : ''}
        </div>
        <div class="card">
            <h2>Comments</h2>
            <div id="comment-tree"></div>
        </div>
        <p><a href="/top.html" class="back">← Back to stories</a></p>`;

    cwr('recordEvent', {
        type: 'story_viewed',
        data: { storyId: Number(storyId), title: story.title }
    });

    const tree = document.getElementById('comment-tree');
    if (!story.kids || story.kids.length === 0) {
        tree.innerHTML = '<div class="empty">No comments yet.</div>';
        return;
    }
    await renderCommentList(tree, story.kids, 0);
}

async function renderCommentList(container, kidIds, depth) {
    for (const kidId of kidIds) {
        const node = document.createElement('div');
        node.className = `comment-node depth-${depth}`;
        node.innerHTML = '<div class="skeleton small"></div>';
        container.appendChild(node);
        getItem(kidId).then((c) => renderCommentNode(node, c, depth));
    }
}

async function renderCommentNode(host, c, depth) {
    if (!c || c.deleted || c.dead) {
        host.remove();
        return;
    }
    const hasKids = c.kids && c.kids.length > 0;
    const visibleKids = hasKids ? c.kids.slice(0, INITIAL_COMMENT_BREADTH) : [];
    const hiddenCount = hasKids ? c.kids.length - INITIAL_COMMENT_BREADTH : 0;

    host.innerHTML = `
        <div class="comment">
            <div class="cmeta">
                <a href="/user.html?id=${encodeURIComponent(
                    c.by ?? ''
                )}" class="by">${esc(c.by ?? '—')}</a>
                <span>${formatTimeAgo(c.time)}</span>
                ${
                    hasKids
                        ? '<button type="button" class="toggle" data-collapsed="0">[−]</button>'
                        : ''
                }
            </div>
            <div class="cbody">${c.text ?? ''}</div>
            <div class="ckids"></div>
        </div>`;

    const body = host.querySelector('.cbody');
    const toggle = host.querySelector('.toggle');
    const kidsEl = host.querySelector('.ckids');

    if (toggle) {
        toggle.addEventListener('click', () => {
            const collapsed = toggle.dataset.collapsed === '1';
            toggle.dataset.collapsed = collapsed ? '0' : '1';
            toggle.textContent = collapsed ? '[−]' : '[+]';
            body.style.display = collapsed ? '' : 'none';
            kidsEl.style.display = collapsed ? '' : 'none';
        });
    }

    if (!hasKids) return;

    if (depth < INITIAL_COMMENT_DEPTH) {
        await renderCommentList(kidsEl, visibleKids, depth + 1);
        if (hiddenCount > 0) {
            const more = document.createElement('button');
            more.type = 'button';
            more.className = 'show-more';
            more.textContent = `Show ${hiddenCount} more ${
                hiddenCount === 1 ? 'reply' : 'replies'
            }`;
            more.addEventListener('click', async () => {
                more.remove();
                await renderCommentList(
                    kidsEl,
                    c.kids.slice(INITIAL_COMMENT_BREADTH),
                    depth + 1
                );
            });
            kidsEl.appendChild(more);
        }
    } else {
        const label = `Show ${c.kids.length} ${
            c.kids.length === 1 ? 'reply' : 'replies'
        }`;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'show-more';
        btn.textContent = label;
        let expanded = false;
        btn.addEventListener('click', async () => {
            if (!expanded) {
                expanded = true;
                btn.textContent = 'Hide';
                await renderCommentList(kidsEl, c.kids, depth + 1);
            } else {
                expanded = false;
                btn.textContent = label;
                kidsEl.innerHTML = '';
            }
        });
        kidsEl.appendChild(btn);
    }
}

// ----- User page --------------------------------------------------------

async function initUserPage() {
    const userId = new URLSearchParams(location.search).get('id');
    const host = document.getElementById('user');
    if (!userId) {
        host.innerHTML =
            '<div class="status warn">Missing ?id= query param.</div>';
        return;
    }
    const r = await fetch(`${HN_API}/user/${encodeURIComponent(userId)}.json`);
    const user = await r.json();
    if (!user) {
        host.innerHTML = '<div class="status warn">User not found.</div>';
        return;
    }
    document.title = `${user.id} | HN`;
    host.innerHTML = `
        <div class="card">
            <h1>${esc(user.id)}</h1>
            <div class="meta">
                <span><strong>Karma:</strong> ${user.karma ?? 0}</span>
                <span><strong>Joined:</strong> ${formatTimeAgo(
                    user.created
                )}</span>
            </div>
            ${user.about ? `<div class="body">${user.about}</div>` : ''}
        </div>
        <div class="card">
            <h2>Recent Submissions</h2>
            <div id="submissions"><div class="skeleton"></div></div>
        </div>
        <p><a href="/top.html" class="back">← Back to stories</a></p>`;

    const subsEl = document.getElementById('submissions');
    const ids = (user.submitted || []).slice(0, 30);
    if (ids.length === 0) {
        subsEl.innerHTML = '<div class="empty">No submissions yet.</div>';
        return;
    }
    const items = await Promise.all(ids.map(getItem));
    subsEl.innerHTML = items
        .filter((i) => i && !i.deleted && !i.dead)
        .map(
            (i) => `
        <div class="submission">
            <a href="/story.html?id=${i.id}" class="title">${esc(
                i.title || (i.text || '').slice(0, 100)
            )}</a>
            <div class="meta">
                <span>${i.score ?? 0} points</span>
                <span>${formatTimeAgo(i.time)}</span>
                <span>${i.descendants ?? 0} comments</span>
            </div>
        </div>`
        )
        .join('');
}

// ----- Debug (error generator) page ------------------------------------

const DEBUG_DEFAULTS = {
    ERROR: 'Demo Error: generic error',
    TYPE_ERROR: 'Demo TypeError: accessing property of undefined',
    REFERENCE_ERROR: 'Demo ReferenceError: variable is not defined',
    RANGE_ERROR: 'Demo RangeError: array length invalid',
    SYNTAX_ERROR: 'Demo SyntaxError: invalid syntax',
    EVAL_ERROR: 'Demo EvalError: eval function error',
    URI_ERROR: 'Demo URIError: malformed URI',
    AGGREGATE_ERROR: 'Demo AggregateError: multiple errors occurred'
};

function throwByType(type, message) {
    switch (type) {
        case 'ERROR':
            throw new Error(message);
        case 'TYPE_ERROR': {
            const x = undefined;
            x.prop;
            return;
        }
        case 'REFERENCE_ERROR':
            // eslint-disable-next-line no-undef
            nonExistentVariable.toString();
            return;
        case 'RANGE_ERROR':
            new Array(-1);
            return;
        case 'SYNTAX_ERROR':
            eval('invalid syntax {{{');
            return;
        case 'EVAL_ERROR':
            throw new EvalError(message);
        case 'URI_ERROR':
            decodeURIComponent('%');
            return;
        case 'AGGREGATE_ERROR':
            throw new AggregateError(
                [new Error('sub-error 1'), new TypeError('sub-error 2')],
                message
            );
    }
}

function initDebugPage() {
    const statusEl = document.getElementById('status');
    const setStatus = (text, cls) => {
        statusEl.className = 'status ' + (cls || 'info');
        statusEl.textContent = text;
    };
    const clearStatus = () => {
        statusEl.className = '';
        statusEl.textContent = '';
    };
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    document.getElementById('go').addEventListener('click', async () => {
        const selected = Array.from(
            document.getElementById('types').selectedOptions
        ).map((o) => o.value);
        if (selected.length === 0) {
            setStatus('Please select at least one error type', 'warn');
            return;
        }
        const msg = document.getElementById('msg').value;
        const repeat =
            parseInt(document.getElementById('repeat').value, 10) || 1;
        const delay = parseInt(document.getElementById('delay').value, 10) || 0;
        const btn = document.getElementById('go');
        btn.disabled = true;

        const queue = [];
        for (let i = 0; i < repeat; i++)
            for (const t of selected)
                queue.push({ type: t, message: msg || DEBUG_DEFAULTS[t] });

        for (let i = 0; i < queue.length; i++) {
            const item = queue[i];
            setStatus(`Generating ${item.type} (${i + 1}/${queue.length})...`);
            // setTimeout so sync throws don't stop the loop and can reach window.onerror
            setTimeout(() => throwByType(item.type, item.message), 0);
            if (i < queue.length - 1) await sleep(delay);
        }

        setStatus(`✓ Generated ${queue.length} error(s)`, 'ok');
        setTimeout(() => {
            clearStatus();
            btn.disabled = false;
        }, 2000);
    });

    document.getElementById('custom').addEventListener('click', () => {
        cwr('recordEvent', {
            type: 'debug_custom_event',
            data: { clickedAt: Date.now(), path: location.pathname }
        });
        setStatus('✓ Recorded custom event', 'ok');
        setTimeout(clearStatus, 2000);
    });
}
