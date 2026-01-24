import { useRef, useState, useEffect } from 'react';
import { Box, Container, Grid, Typography, Button, Stack, Card, CardContent, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { useMouseGlow, usePrefersReducedMotion } from '../hooks';
import { typewriterPhrases, heroMetrics, watchlistData, mockChartData } from '../data/mockData';
import { useAuth } from '../auth/AuthProvider';

// SVG Line Chart Component
function MiniChart() {
    const width = 280;
    const height = 80;
    const padding = 10;

    const xScale = (x: number) => padding + (x / 10) * (width - 2 * padding);
    const yScale = (y: number) => height - padding - ((y - 40) / 50) * (height - 2 * padding);

    const pathData = mockChartData
        .map((point, i) => `${i === 0 ? 'M' : 'L'} ${xScale(point.x)} ${yScale(point.y)}`)
        .join(' ');

    return (
        <svg width={width} height={height} style={{ display: 'block' }}>
            <defs>
                <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#00bcd4" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#00bcd4" stopOpacity="0" />
                </linearGradient>
            </defs>
            <path
                d={pathData + ` L ${xScale(10)} ${height - padding} L ${xScale(0)} ${height - padding} Z`}
                fill="url(#chartGradient)"
            />
            <path
                d={pathData}
                fill="none"
                stroke="#00bcd4"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

// Typewriter Effect Component
function Typewriter() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [displayText, setDisplayText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const prefersReducedMotion = usePrefersReducedMotion();

    useEffect(() => {
        if (prefersReducedMotion) {
            setDisplayText(typewriterPhrases[0]);
            return;
        }

        const currentPhrase = typewriterPhrases[currentIndex];
        const timeout = setTimeout(() => {
            if (!isDeleting) {
                if (displayText.length < currentPhrase.length) {
                    setDisplayText(currentPhrase.slice(0, displayText.length + 1));
                } else {
                    setTimeout(() => setIsDeleting(true), 2000);
                }
            } else {
                if (displayText.length > 0) {
                    setDisplayText(displayText.slice(0, -1));
                } else {
                    setIsDeleting(false);
                    setCurrentIndex((prev) => (prev + 1) % typewriterPhrases.length);
                }
            }
        }, isDeleting ? 30 : 80);

        return () => clearTimeout(timeout);
    }, [displayText, isDeleting, currentIndex, prefersReducedMotion]);

    return (
        <Box component="span" sx={{ color: 'primary.main' }}>
            {displayText}
            <Box
                component="span"
                sx={{
                    display: 'inline-block',
                    width: 3,
                    height: '1em',
                    bgcolor: 'primary.main',
                    ml: 0.5,
                    animation: 'blink 1s step-end infinite',
                    '@keyframes blink': {
                        '50%': { opacity: 0 },
                    },
                }}
            />
        </Box>
    );
}

export default function Hero() {
    const heroRef = useRef<HTMLDivElement>(null);
    const { prefersReducedMotion } = useMouseGlow({ elementRef: heroRef as React.RefObject<HTMLElement>, smoothing: 0.08 });
    const { register } = useAuth();

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.15, delayChildren: 0.2 },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as const } },
    };

    return (
        <Box
            ref={heroRef}
            sx={{
                position: 'relative',
                minHeight: '100vh',
                pt: { xs: 12, md: 16 },
                pb: 8,
                overflow: 'hidden',
                '--glow-x': '50%',
                '--glow-y': '50%',
                '--glow-opacity': 0,
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    inset: 0,
                    background: prefersReducedMotion
                        ? 'radial-gradient(ellipse at 30% 40%, rgba(0, 188, 212, 0.08), transparent 60%)'
                        : 'radial-gradient(600px circle at var(--glow-x) var(--glow-y), rgba(0, 188, 212, 0.12), transparent 50%)',
                    opacity: prefersReducedMotion ? 1 : 'var(--glow-opacity)',
                    transition: 'opacity 0.3s ease',
                    pointerEvents: 'none',
                },
            }}
        >
            {/* Grid Overlay */}
            <Box className="grid-overlay" />

            <Container maxWidth="xl">
                <Grid container spacing={6} alignItems="center">
                    {/* Left Content */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        <motion.div
                            variants={prefersReducedMotion ? {} : containerVariants}
                            initial="hidden"
                            animate="visible"
                        >
                            <Stack spacing={4}>
                                <motion.div variants={prefersReducedMotion ? {} : itemVariants}>
                                    <Typography
                                        variant="h1"
                                        sx={{
                                            fontSize: { xs: '2.5rem', md: '3.5rem', lg: '4rem' },
                                            fontWeight: 800,
                                            lineHeight: 1.1,
                                        }}
                                    >
                                        <Typewriter />
                                        <br />
                                        <Box component="span" sx={{ color: 'text.primary' }}>
                                            for modern investors.
                                        </Box>
                                    </Typography>
                                </motion.div>

                                <motion.div variants={prefersReducedMotion ? {} : itemVariants}>
                                    <Typography
                                        variant="h6"
                                        sx={{ color: 'text.secondary', maxWidth: 480, fontWeight: 400 }}
                                    >
                                        Lightning-fast data. Crystal-clear insights. Trusted by professionals worldwide.
                                    </Typography>
                                </motion.div>

                                <motion.div variants={prefersReducedMotion ? {} : itemVariants}>
                                    <Stack direction="row" spacing={2}>
                                        <Button
                                            variant="contained"
                                            size="large"
                                            onClick={register}
                                            sx={{
                                                px: 4,
                                                py: 1.5,
                                                background: 'linear-gradient(135deg, #00bcd4, #7c4dff)',
                                                '&:hover': {
                                                    background: 'linear-gradient(135deg, #4dd0e1, #b47cff)',
                                                },
                                            }}
                                        >
                                            Hemen Başla
                                        </Button>
                                        <Button variant="outlined" size="large" sx={{ px: 4, py: 1.5 }}>
                                            View Demo
                                        </Button>
                                    </Stack>
                                </motion.div>

                                <motion.div variants={prefersReducedMotion ? {} : itemVariants}>
                                    <Stack spacing={1}>
                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                            Trusted by leading institutions
                                        </Typography>
                                        <Stack direction="row" spacing={3}>
                                            {['Morgan Stanley', 'BlackRock', 'Citadel', 'Two Sigma'].map((name) => (
                                                <Box
                                                    key={name}
                                                    sx={{
                                                        px: 2,
                                                        py: 1,
                                                        bgcolor: alpha('#fff', 0.03),
                                                        borderRadius: 1,
                                                        border: '1px solid',
                                                        borderColor: alpha('#fff', 0.08),
                                                    }}
                                                >
                                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                                                        {name}
                                                    </Typography>
                                                </Box>
                                            ))}
                                        </Stack>
                                    </Stack>
                                </motion.div>
                            </Stack>
                        </motion.div>
                    </Grid>

                    {/* Right - Dashboard Preview */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        <motion.div
                            initial={prefersReducedMotion ? {} : { opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                        >
                            <Card
                                className="gradient-border"
                                sx={{
                                    p: 3,
                                    background: alpha('#0d1117', 0.9),
                                    backdropFilter: 'blur(20px)',
                                }}
                            >
                                <CardContent sx={{ p: 0 }}>
                                    {/* Chart */}
                                    <Box sx={{ mb: 3 }}>
                                        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                                            Portfolio Performance
                                        </Typography>
                                        <MiniChart />
                                    </Box>

                                    {/* Metrics */}
                                    <Grid container spacing={2} sx={{ mb: 3 }}>
                                        <Grid size={4}>
                                            <Box sx={{ p: 1.5, bgcolor: alpha('#fff', 0.03), borderRadius: 2 }}>
                                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                    Portfolio Value
                                                </Typography>
                                                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                                    ${heroMetrics.portfolioValue.toLocaleString()}
                                                </Typography>
                                            </Box>
                                        </Grid>
                                        <Grid size={4}>
                                            <Box sx={{ p: 1.5, bgcolor: alpha('#fff', 0.03), borderRadius: 2 }}>
                                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                    Daily P/L
                                                </Typography>
                                                <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.main' }}>
                                                    +${heroMetrics.dailyPL.toLocaleString()}
                                                </Typography>
                                            </Box>
                                        </Grid>
                                        <Grid size={4}>
                                            <Box sx={{ p: 1.5, bgcolor: alpha('#fff', 0.03), borderRadius: 2 }}>
                                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                    Risk Score
                                                </Typography>
                                                <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.main' }}>
                                                    {heroMetrics.riskScore}
                                                </Typography>
                                            </Box>
                                        </Grid>
                                    </Grid>

                                    {/* Watchlist */}
                                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                                        Watchlist
                                    </Typography>
                                    <Stack spacing={1}>
                                        {watchlistData.map((item) => (
                                            <Box
                                                key={item.symbol}
                                                sx={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    p: 1,
                                                    borderRadius: 1,
                                                    '&:hover': { bgcolor: alpha('#fff', 0.03) },
                                                }}
                                            >
                                                <Box>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                        {item.symbol}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                        {item.name}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ textAlign: 'right' }}>
                                                    <Typography variant="body2">${item.price}</Typography>
                                                    <Stack direction="row" alignItems="center" spacing={0.5}>
                                                        {item.change >= 0 ? (
                                                            <TrendingUpIcon sx={{ fontSize: 14, color: 'success.main' }} />
                                                        ) : (
                                                            <TrendingDownIcon sx={{ fontSize: 14, color: 'error.main' }} />
                                                        )}
                                                        <Typography
                                                            variant="caption"
                                                            sx={{ color: item.change >= 0 ? 'success.main' : 'error.main' }}
                                                        >
                                                            {item.change >= 0 ? '+' : ''}{item.change}%
                                                        </Typography>
                                                    </Stack>
                                                </Box>
                                            </Box>
                                        ))}
                                    </Stack>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
}
