import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';
import HomePage from './pages/HomePage';
import Portfolio from './pages/Portfolio';
import { ProtectedRoute } from './auth/ProtectedRoute';

export default function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route
                        path="/portfolio"
                        element={
                            <ProtectedRoute>
                                <Portfolio />
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </BrowserRouter>
        </ThemeProvider>
    );
}
