import { Box, Container, Grid, Typography, Card, CardContent, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PieChartIcon from '@mui/icons-material/PieChart';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import SecurityIcon from '@mui/icons-material/Security';
import InsightsIcon from '@mui/icons-material/Insights';
import SpeedIcon from '@mui/icons-material/Speed';
import { usePrefersReducedMotion } from '../hooks';
import { featuresData } from '../data/mockData';

const iconMap: { [key: string]: React.ReactNode } = {
    TrendingUp: <TrendingUpIcon sx={{ fontSize: 32 }} />,
    PieChart: <PieChartIcon sx={{ fontSize: 32 }} />,
    Notifications: <NotificationsActiveIcon sx={{ fontSize: 32 }} />,
    Security: <SecurityIcon sx={{ fontSize: 32 }} />,
    Insights: <InsightsIcon sx={{ fontSize: 32 }} />,
    Speed: <SpeedIcon sx={{ fontSize: 32 }} />,
};

export default function FeatureGrid() {
    const prefersReducedMotion = usePrefersReducedMotion();

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1, delayChildren: 0.2 },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 40 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
    };

    return (
        <Box sx={{ py: 12, bgcolor: 'background.default' }} id="features">
            <Container maxWidth="lg">
                <Box sx={{ textAlign: 'center', mb: 8 }}>
                    <Typography
                        variant="h2"
                        sx={{
                            mb: 2,
                            background: 'linear-gradient(90deg, #00bcd4, #7c4dff)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        Powerful Features
                    </Typography>
                    <Typography variant="h6" sx={{ color: 'text.secondary', maxWidth: 600, mx: 'auto' }}>
                        Everything you need to stay ahead of the markets
                    </Typography>
                </Box>

                <motion.div
                    variants={prefersReducedMotion ? {} : containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                >
                    <Grid container spacing={3}>
                        {featuresData.map((feature, index) => (
                            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                                <motion.div variants={prefersReducedMotion ? {} : itemVariants}>
                                    <Card
                                        sx={{
                                            height: '100%',
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                transform: prefersReducedMotion ? 'none' : 'translateY(-8px)',
                                                boxShadow: '0 20px 40px rgba(0, 188, 212, 0.15)',
                                                borderColor: alpha('#00bcd4', 0.3),
                                            },
                                        }}
                                    >
                                        <CardContent sx={{ p: 4 }}>
                                            <Box
                                                sx={{
                                                    width: 64,
                                                    height: 64,
                                                    borderRadius: 3,
                                                    background: 'linear-gradient(135deg, rgba(0, 188, 212, 0.15), rgba(124, 77, 255, 0.15))',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'primary.main',
                                                    mb: 3,
                                                }}
                                            >
                                                {iconMap[feature.icon]}
                                            </Box>
                                            <Typography variant="h5" sx={{ mb: 1.5 }}>
                                                {feature.title}
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                                                {feature.description}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            </Grid>
                        ))}
                    </Grid>
                </motion.div>
            </Container>
        </Box>
    );
}
