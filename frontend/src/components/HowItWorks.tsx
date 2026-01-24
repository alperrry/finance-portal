import { Box, Container, Grid, Typography, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import { usePrefersReducedMotion } from '../hooks';
import { howItWorksData } from '../data/mockData';

export default function HowItWorks() {
    const prefersReducedMotion = usePrefersReducedMotion();

    return (
        <Box sx={{ py: 12, bgcolor: 'background.paper' }}>
            <Container maxWidth="lg">
                <Box sx={{ textAlign: 'center', mb: 8 }}>
                    <Typography variant="h2" sx={{ mb: 2 }}>
                        How It Works
                    </Typography>
                    <Typography variant="h6" sx={{ color: 'text.secondary', maxWidth: 500, mx: 'auto' }}>
                        Get started in minutes with our simple onboarding process
                    </Typography>
                </Box>

                <Grid container spacing={4} alignItems="stretch">
                    {howItWorksData.map((item, index) => (
                        <Grid size={{ xs: 12, md: 4 }} key={index}>
                            <motion.div
                                initial={prefersReducedMotion ? {} : { opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.15 }}
                                style={{ height: '100%' }}
                            >
                                <Box
                                    sx={{
                                        height: '100%',
                                        p: 4,
                                        textAlign: 'center',
                                        position: 'relative',
                                        '&::after': index < howItWorksData.length - 1 ? {
                                            content: '""',
                                            position: 'absolute',
                                            top: '50%',
                                            right: -16,
                                            width: 32,
                                            height: 2,
                                            bgcolor: alpha('#00bcd4', 0.3),
                                            display: { xs: 'none', md: 'block' },
                                        } : {},
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 64,
                                            height: 64,
                                            borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #00bcd4, #7c4dff)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            mx: 'auto',
                                            mb: 3,
                                        }}
                                    >
                                        <Typography variant="h4" sx={{ fontWeight: 700 }}>
                                            {item.step}
                                        </Typography>
                                    </Box>
                                    <Typography variant="h5" sx={{ mb: 2 }}>
                                        {item.title}
                                    </Typography>
                                    <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                                        {item.description}
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
