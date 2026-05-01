// Renders the shared HN-style header on every page. Mirrors the SPA demo's
// Layout component — same brand, same nav links. Each link is a plain
// anchor so clicking it triggers a hard navigation (that's the whole
// point of the MPA demo).
(function () {
    const path = window.location.pathname;
    const match = (prefix) => path === prefix || path.startsWith(prefix);
    const links = [
        { href: '/ask.html', label: 'Ask', active: match('/ask') },
        { href: '/show.html', label: 'Show', active: match('/show') },
        { href: '/job.html', label: 'Jobs', active: match('/job') },
        { href: '/debug.html', label: 'Debug', active: match('/debug') }
    ];
    const nav = links
        .map(
            (l) =>
                `<a href="${l.href}" class="${l.active ? 'active' : ''}">${
                    l.label
                }</a>`
        )
        .join('');
    document.body.insertAdjacentHTML(
        'afterbegin',
        `<header class="hn"><div class="inner">
            <a href="/top.html" class="brand">HN</a>
            <nav>${nav}</nav>
        </div></header>`
    );
})();
