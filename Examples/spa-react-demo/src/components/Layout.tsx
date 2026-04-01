import { Link, Outlet, useLocation } from 'react-router-dom';

export function Layout() {
    const location = useLocation();
    const currentPath = location.pathname.slice(1) || 'top';

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-orange-500 text-white shadow-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center h-14">
                        <Link to="/" className="font-bold text-xl mr-8">
                            HN
                        </Link>
                        <nav className="flex gap-6 items-center">
                            <Link
                                to="/ask"
                                className={`hover:underline ${
                                    currentPath === 'ask' ? 'font-bold' : ''
                                }`}
                            >
                                Ask
                            </Link>
                            <Link
                                to="/show"
                                className={`hover:underline ${
                                    currentPath === 'show' ? 'font-bold' : ''
                                }`}
                            >
                                Show
                            </Link>
                            <Link
                                to="/job"
                                className={`hover:underline ${
                                    currentPath === 'job' ? 'font-bold' : ''
                                }`}
                            >
                                Jobs
                            </Link>
                            <Link
                                to="/debug"
                                className={`hover:underline ${
                                    currentPath === 'debug' ? 'font-bold' : ''
                                }`}
                            >
                                Debug
                            </Link>
                        </nav>
                    </div>
                </div>
            </header>
            <main className="max-w-7xl mx-auto px-4 py-6">
                <Outlet />
            </main>
        </div>
    );
}
