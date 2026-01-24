import { Box, Container, Grid, Typography, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import LockIcon from '@mui/icons-material/Lock';
import HistoryIcon from '@mui/icons-material/History';
import PeopleIcon from '@mui/icons-material/People';
import VerifiedIcon from '@mui/icons-material/Verified';
import { usePrefersReducedMotion } from '../hooks';
import { securityFeatures } from '../data/mockData';

const iconMap: { [key: string]: React.ReactNode } = {
    Lock: <LockIcon sx={{ fontSize: 28 }} />,
    History: <HistoryIcon sx={{ fontSize: 28 }} />,
    People: <PeopleIcon sx={{ fontSize: 28 }} />,
    Verified: <VerifiedIcon sx={{ fontSize: 28 }} />,
};

export default function SecuritySection() {
    const prefersReducedMotion = usePrefersReducedMotion();

    return (
        <Box sx={{ py: 12, bgcolor: 'background.default' }}>
            <Container maxWidth="lg">
                <Box sx={{ textAlign: 'center', mb: 8 }}>
                    <Typography variant="h2" sx={{ mb: 2 }}>
                        Trust & Security
                    </Typography>
                    <Typography variant="h6" sx={{ color: 'text.secondary', maxWidth: 600, mx: 'auto' }}>
                        Your data is protected by enterprise-grade security. We take privacy seriously.
                    </Typography>
                </Box>

                <Grid container spacing={3}>
                    {securityFeatures.map((feature, index) => (
                        <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
                            <motion.div
                                initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: index * 0.1 }}
                            >
                                <Box
                                    sx={{
                                        p: 3,
                                        height: '100%',
                                        bgcolor: alpha('#fff', 0.02),
                                        borderRadius: 3,
                                        border: '1px solid',
                                        borderColor: alpha('#fff', 0.08),
                                        textAlign: 'center',
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            borderColor: alpha('#00bcd4', 0.3),
                                            bgcolor: alpha('#00bcd4', 0.05),
                                        },
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 56,
                                            height: 56,
                                            borderRadius: 2,
                                            bgcolor: alpha('#00bcd4', 0.1),
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'primary.main',
                                            mx: 'auto',
                                            mb: 2,
                                        }}
                                    >
                                        {iconMap[feature.icon]}
                                    </Box>
                                    <Typography variant="h6" sx={{ mb: 1 }}>
                                        {feature.title}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                        {feature.description}
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
