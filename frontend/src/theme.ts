import { createTheme, alpha } from '@mui/material/styles';

// Custom dark theme for FinPulse
const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#00bcd4', // Teal accent
            light: '#4dd0e1',
            dark: '#0097a7',
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#7c4dff', // Purple accent
            light: '#b47cff',
            dark: '#3f1dcb',
            contrastText: '#ffffff',
        },
        background: {
            default: '#0d1117',
            paper: '#161b22',
        },
        text: {
            primary: '#f0f6fc',
            secondary: '#8b949e',
        },
        success: {
            main: '#3fb950',
            light: '#56d364',
            dark: '#238636',
        },
        error: {
            main: '#f85149',
            light: '#ff7b72',
            dark: '#da3633',
        },
        divider: alpha('#ffffff', 0.08),
    },
    typography: {
        fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        h1: {
            fontSize: '3.5rem',
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
        },
        h2: {
            fontSize: '2.5rem',
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: '-0.01em',
        },
        h3: {
            fontSize: '2rem',
            fontWeight: 600,
            lineHeight: 1.3,
        },
        h4: {
            fontSize: '1.5rem',
            fontWeight: 600,
            lineHeight: 1.4,
        },
        h5: {
            fontSize: '1.25rem',
            fontWeight: 600,
            lineHeight: 1.4,
        },
        h6: {
            fontSize: '1rem',
            fontWeight: 600,
            lineHeight: 1.5,
        },
        body1: {
            fontSize: '1rem',
            lineHeight: 1.7,
        },
        body2: {
            fontSize: '0.875rem',
            lineHeight: 1.6,
        },
        button: {
            textTransform: 'none',
            fontWeight: 600,
        },
    },
    shape: {
        borderRadius: 12,
    },
    shadows: [
        'none',
        '0 1px 2px rgba(0,0,0,0.3)',
        '0 2px 4px rgba(0,0,0,0.3)',
        '0 4px 8px rgba(0,0,0,0.3)',
        '0 8px 16px rgba(0,0,0,0.3)',
        '0 12px 24px rgba(0,0,0,0.3)',
        '0 16px 32px rgba(0,0,0,0.3)',
        '0 20px 40px rgba(0,0,0,0.3)',
        '0 24px 48px rgba(0,0,0,0.3)',
        '0 28px 56px rgba(0,0,0,0.3)',
        '0 32px 64px rgba(0,0,0,0.3)',
        '0 36px 72px rgba(0,0,0,0.3)',
        '0 40px 80px rgba(0,0,0,0.3)',
        '0 44px 88px rgba(0,0,0,0.3)',
        '0 48px 96px rgba(0,0,0,0.3)',
        '0 52px 104px rgba(0,0,0,0.3)',
        '0 56px 112px rgba(0,0,0,0.3)',
        '0 60px 120px rgba(0,0,0,0.3)',
        '0 64px 128px rgba(0,0,0,0.3)',
        '0 68px 136px rgba(0,0,0,0.3)',
        '0 72px 144px rgba(0,0,0,0.3)',
        '0 76px 152px rgba(0,0,0,0.3)',
        '0 80px 160px rgba(0,0,0,0.3)',
        '0 84px 168px rgba(0,0,0,0.3)',
        '0 88px 176px rgba(0,0,0,0.3)',
    ],
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    padding: '10px 24px',
                    fontSize: '0.9375rem',
                },
                contained: {
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: '0 4px 16px rgba(0, 188, 212, 0.3)',
                    },
                },
                outlined: {
                    borderWidth: 1.5,
                    '&:hover': {
                        borderWidth: 1.5,
                    },
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    backgroundColor: alpha('#ffffff', 0.03),
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${alpha('#ffffff', 0.08)}`,
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    backgroundColor: alpha('#0d1117', 0.8),
                    backdropFilter: 'blur(20px)',
                    boxShadow: 'none',
                    borderBottom: `1px solid ${alpha('#ffffff', 0.08)}`,
                },
            },
        },
    },
});

export default theme;
