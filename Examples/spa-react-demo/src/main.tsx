import './rum';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { store } from './store';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Home } from './routes/Home';
import { Story } from './routes/Story';
import { User } from './routes/User';
import { ErrorGenerator } from './components/ErrorGenerator';
import './index.css';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ErrorBoundary>
            <Provider store={store}>
                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<Layout />}>
                            <Route
                                index
                                element={<Navigate to="/top" replace />}
                            />
                            <Route path=":storyType" element={<Home />} />
                            <Route path="story/:id" element={<Story />} />
                            <Route path="user/:id" element={<User />} />
                            <Route path="debug" element={<ErrorGenerator />} />
                        </Route>
                    </Routes>
                </BrowserRouter>
            </Provider>
        </ErrorBoundary>
    </StrictMode>
);
