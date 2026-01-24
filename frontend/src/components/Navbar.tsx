import { AppBar, Toolbar, Container, Stack, Button, Typography, Box } from '@mui/material';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import { motion } from 'framer-motion';
import { usePrefersReducedMotion } from '../hooks';
import { useAuth } from '../auth/AuthProvider';

const navItems = ['Markets', 'Portfolio', 'Alerts', 'Insights'];

export default function Navbar() {
    const prefersReducedMotion = usePrefersReducedMotion();
    const { login, register } = useAuth();

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <AppBar position="fixed">
            <Container maxWidth="xl">
                <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
                    {/* Logo */}
                    <motion.div
                        initial={prefersReducedMotion ? {} : { opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <Box
                                sx={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 2,
                                    background: 'linear-gradient(135deg, #00bcd4, #7c4dff)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <ShowChartIcon sx={{ color: 'white', fontSize: 20 }} />
                            </Box>
                            <Typography
                                variant="h6"
                                sx={{
                                    fontWeight: 700,
                                    background: 'linear-gradient(90deg, #00bcd4, #7c4dff)',
                                    backgroundClip: 'text',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                }}
                            >
                                FinPulse
                            </Typography>
                        </Stack>
                    </motion.div>

                    {/* Nav Links */}
                    <Stack
                        direction="row"
                        spacing={1}
                        sx={{ display: { xs: 'none', md: 'flex' } }}
                    >
                        {navItems.map((item, index) => (
                            <motion.div
                                key={item}
                                initial={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.1 }}
                            >
                                <Button
                                    color="inherit"
                                    onClick={() => scrollToSection(item.toLowerCase())}
                                    sx={{
                                        color: 'text.secondary',
                                        '&:hover': { color: 'text.primary', bgcolor: 'rgba(255,255,255,0.05)' },
                                    }}
                                >
                                    {item}
                                </Button>
                            </motion.div>
                        ))}
                    </Stack>

                    {/* Auth Buttons */}
                    <motion.div
                        initial={prefersReducedMotion ? {} : { opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Stack direction="row" spacing={1.5}>
                            <Button
                                variant="outlined"
                                onClick={login}
                                sx={{
                                    borderColor: 'rgba(0, 188, 212, 0.5)',
                                    '&:hover': {
                                        borderColor: 'primary.main',
                                        bgcolor: 'rgba(0, 188, 212, 0.1)',
                                    },
                                }}
                            >
                                Giriş Yap
                            </Button>
                            <Button
                                variant="contained"
                                onClick={register}
                                sx={{
                                    background: 'linear-gradient(135deg, #00bcd4, #7c4dff)',
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #4dd0e1, #b47cff)',
                                    },
                                }}
                            >
                                Kayıt Ol
                            </Button>
                        </Stack>
                    </motion.div>
                </Toolbar>
            </Container>
        </AppBar>
    );
}
