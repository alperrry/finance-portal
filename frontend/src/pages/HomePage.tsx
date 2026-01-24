import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography, Stack } from '@mui/material';
import { useAuth } from '../auth/AuthProvider';
import {
    Navbar,
    Hero,
    TickerStrip,
    FeatureGrid,
    Stats,
    HowItWorks,
    SecuritySection,
    Footer,
} from '../components';

export default function HomePage() {
    const { ready, authenticated } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (ready && authenticated) {
            navigate('/portfolio', { replace: true });
        }
    }, [ready, authenticated, navigate]);

    // Show loading state while auth is initializing
    if (!ready) {
        return (
            <Box
                sx={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'background.default',
                }}
            >
                <Stack alignItems="center" spacing={2}>
                    <CircularProgress color="primary" />
                    <Typography color="text.secondary">Yükleniyor...</Typography>
                </Stack>
            </Box>
        );
    }

    // If authenticated, show redirect message
    if (authenticated) {
        return (
            <Box
                sx={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'background.default',
                }}
            >
                <Stack alignItems="center" spacing={2}>
                    <CircularProgress color="primary" />
                    <Typography color="text.secondary">Portföy sayfasına yönlendiriliyorsunuz...</Typography>
                </Stack>
            </Box>
        );
    }

    return (
        <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
            {/* Noise Overlay for premium feel */}
            <div className="noise-overlay" />

            <Navbar />
            <Hero />
            <TickerStrip />
            <Stats />
            <FeatureGrid />
            <HowItWorks />
            <SecuritySection />
            <Footer />
        </Box>
    );
}
