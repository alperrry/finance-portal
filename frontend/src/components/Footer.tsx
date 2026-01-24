import { Box, Container, Grid, Typography, Stack, Link, alpha } from '@mui/material';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import { footerLinks } from '../data/mockData';

export default function Footer() {
    const sections = [
        { title: 'Product', links: footerLinks.product },
        { title: 'Resources', links: footerLinks.resources },
        { title: 'Company', links: footerLinks.company },
        { title: 'Legal', links: footerLinks.legal },
    ];

    return (
        <Box
            component="footer"
            sx={{
                py: 8,
                borderTop: '1px solid',
                borderColor: alpha('#fff', 0.08),
                bgcolor: 'background.paper',
            }}
        >
            <Container maxWidth="lg">
                <Grid container spacing={4}>
                    {/* Logo and tagline */}
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Stack spacing={2}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <Box
                                    sx={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 1.5,
                                        background: 'linear-gradient(135deg, #00bcd4, #7c4dff)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <ShowChartIcon sx={{ color: 'white', fontSize: 18 }} />
                                </Box>
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                    FinPulse
                                </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 280 }}>
                                Professional-grade financial tools for modern investors. Built for speed, designed for clarity.
                            </Typography>
                        </Stack>
                    </Grid>

                    {/* Link columns */}
                    {sections.map((section) => (
                        <Grid size={{ xs: 6, sm: 3, md: 2 }} key={section.title}>
                            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                                {section.title}
                            </Typography>
                            <Stack spacing={1.5}>
                                {section.links.map((link) => (
                                    <Link
                                        key={link}
                                        href="#"
                                        underline="none"
                                        sx={{
                                            color: 'text.secondary',
                                            fontSize: '0.875rem',
                                            transition: 'color 0.2s',
                                            '&:hover': { color: 'primary.main' },
                                        }}
                                    >
                                        {link}
                                    </Link>
                                ))}
                            </Stack>
                        </Grid>
                    ))}
                </Grid>

                {/* Copyright */}
                <Box
                    sx={{
                        mt: 6,
                        pt: 4,
                        borderTop: '1px solid',
                        borderColor: alpha('#fff', 0.08),
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 2,
                    }}
                >
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        © 2026 FinPulse. All rights reserved.
                    </Typography>
                    <Stack direction="row" spacing={3}>
                        <Link href="#" underline="none" sx={{ color: 'text.secondary', fontSize: '0.875rem', '&:hover': { color: 'text.primary' } }}>
                            Privacy Policy
                        </Link>
                        <Link href="#" underline="none" sx={{ color: 'text.secondary', fontSize: '0.875rem', '&:hover': { color: 'text.primary' } }}>
                            Terms of Service
                        </Link>
                    </Stack>
                </Box>
            </Container>
        </Box>
    );
}
