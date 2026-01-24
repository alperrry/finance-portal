import { useEffect, useState, useRef } from 'react';
import { Box, Container, Grid, Typography, alpha } from '@mui/material';
import { motion, useInView } from 'framer-motion';
import { usePrefersReducedMotion } from '../hooks';
import { statsData } from '../data/mockData';

interface CountUpProps {
    end: number;
    duration?: number;
    prefix?: string;
    suffix?: string;
}

function CountUp({ end, duration = 2, prefix = '', suffix = '' }: CountUpProps) {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);
    const isInView = useInView(ref, { once: true });
    const prefersReducedMotion = usePrefersReducedMotion();

    useEffect(() => {
        if (!isInView) return;
        if (prefersReducedMotion) {
            setCount(end);
            return;
        }

        let startTime: number;
        let animationFrame: number;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(easeOut * end));

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [isInView, end, duration, prefersReducedMotion]);

    return (
        <span ref={ref}>
            {prefix}{count.toLocaleString()}{suffix}
        </span>
    );
}

export default function Stats() {
    const prefersReducedMotion = usePrefersReducedMotion();

    return (
        <Box
            sx={{
                py: 10,
                background: 'linear-gradient(180deg, rgba(0, 188, 212, 0.05) 0%, transparent 100%)',
            }}
        >
            <Container maxWidth="lg">
                <Grid container spacing={4} justifyContent="center">
                    {statsData.map((stat, index) => (
                        <Grid size={{ xs: 12, sm: 4 }} key={index}>
                            <motion.div
                                initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                            >
                                <Box sx={{ textAlign: 'center' }}>
                                    <Typography
                                        variant="h2"
                                        sx={{
                                            fontWeight: 800,
                                            fontSize: { xs: '2.5rem', md: '3.5rem' },
                                            background: 'linear-gradient(90deg, #00bcd4, #7c4dff)',
                                            backgroundClip: 'text',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                            mb: 1,
                                        }}
                                    >
                                        <CountUp
                                            end={stat.value}
                                            prefix={stat.prefix || ''}
                                            suffix={stat.suffix || ''}
                                        />
                                    </Typography>
                                    <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 400 }}>
                                        {stat.label}
                                    </Typography>
                                </Box>
                            </motion.div>
                        </Grid>
                    ))}
                </Grid>
            </Container>
        </Box>
    );
}
