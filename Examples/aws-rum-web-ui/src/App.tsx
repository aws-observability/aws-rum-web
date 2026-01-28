import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate
} from 'react-router-dom';
import AppLayout from '@cloudscape-design/components/app-layout';
import TimelinePage from './pages/TimelinePage';
import '@cloudscape-design/global-styles/index.css';

function AppContent() {
    return (
        <AppLayout
            navigationHide
            toolsHide
            content={
                <Routes>
                    <Route path="/" element={<TimelinePage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            }
        />
    );
}

function App() {
    return (
        <Router>
            <AppContent />
        </Router>
    );
}

export default App;
