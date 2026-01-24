import { Box, Typography, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import { tickerData } from '../data/mockData';
import { usePrefersReducedMotion } from '../hooks';

export default function TickerStrip() {
    const prefersReducedMotion = usePrefersReducedMotion();
    const duplicatedData = [...tickerData, ...tickerData];

    return (
        <Box
            sx={{
                py: 2,
                borderTop: '1px solid',
                borderBottom: '1px solid',
                borderColor: alpha('#fff', 0.08),
                bgcolor: alpha('#fff', 0.02),
                overflow: 'hidden',
                '&:hover .ticker-content': {
                    animationPlayState: 'paused',
                },
            }}
        >
            <Box
                className="ticker-content"
                sx={{
                    display: 'flex',
                    width: 'max-content',
                    animation: prefersReducedMotion ? 'none' : 'scroll 30s linear infinite',
                    '@keyframes scroll': {
                        '0%': { transform: 'translateX(0)' },
                        '100%': { transform: 'translateX(-50%)' },
                    },
                }}
            >
                {duplicatedData.map((ticker, index) => (
                    <Box
                        key={`${ticker.symbol}-${index}`}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            px: 4,
                        }}
                    >
                        <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, mr: 1 }}
                        >
                            {ticker.symbol}
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{
                                color: ticker.change >= 0 ? 'success.main' : 'error.main',
                                fontWeight: 500,
                            }}
                        >
                            {ticker.change >= 0 ? '+' : ''}{ticker.change.toFixed(2)}%
                        </Typography>
                        <Box
                            sx={{
                                width: 4,
                                height: 4,
                                borderRadius: '50%',
                                bgcolor: alpha('#fff', 0.2),
                                mx: 4,
                            }}
                        />
                    </Box>
                ))}
            </Box>
        </Box>
    );
}
