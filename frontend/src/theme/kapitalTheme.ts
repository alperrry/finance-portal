import { createTheme } from "@mui/material/styles";

const sharedTypography = {
    fontFamily: '"Sora", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { letterSpacing: 0 },
    h2: { letterSpacing: 0 },
    h3: { letterSpacing: 0 },
    h4: { letterSpacing: 0 },
    h5: { letterSpacing: 0 },
    h6: { letterSpacing: 0 },
    button: {
        textTransform: "none" as const,
        fontWeight: 700,
        letterSpacing: 0,
    },
};

const sharedComponents = {
    MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { borderRadius: 8 } },
    },
    MuiPaper: {
        styleOverrides: { rounded: { borderRadius: 8 } },
    },
    MuiChip: {
        styleOverrides: { root: { borderRadius: 8, fontWeight: 700 } },
    },
    MuiTextField: {
        defaultProps: { size: "small" as const },
    },
    MuiTableCell: {
        styleOverrides: {
            head: {
                fontWeight: 800,
                color: "rgba(17, 17, 17, 0.64)",
            },
        },
    },
};

export const kapitalTheme = createTheme({
    palette: {
        mode: "light",
        primary: {
            main: "#111111",
            contrastText: "#ffffff",
        },
        secondary: {
            main: "#c1622f",
            contrastText: "#ffffff",
        },
        success: { main: "#2f8f58" },
        error: { main: "#c84b4b" },
        warning: { main: "#c98a2e" },
        background: {
            default: "#f7f6f2",
            paper: "#ffffff",
        },
        text: {
            primary: "#111111",
            secondary: "rgba(17, 17, 17, 0.64)",
        },
        divider: "rgba(17, 17, 17, 0.1)",
    },
    typography: sharedTypography,
    shape: { borderRadius: 8 },
    components: {
        ...sharedComponents,
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    boxShadow: "0 14px 40px rgba(17, 17, 17, 0.08)",
                    border: "1px solid rgba(17, 17, 17, 0.08)",
                },
            },
        },
        MuiCssBaseline: {
            styleOverrides: {
                body: { backgroundColor: "#f7f6f2" },
            },
        },
    },
});

export const kapitalDarkTheme = createTheme({
    palette: {
        mode: "dark",
        primary: {
            main: "#f0ede6",
            contrastText: "#111111",
        },
        secondary: {
            main: "#c1622f",
            contrastText: "#ffffff",
        },
        success: { main: "#5bb870" },
        error: { main: "#e05858" },
        warning: { main: "#c98a2e" },
        background: {
            default: "#181512",
            paper: "#211c18",
        },
        text: {
            primary: "rgba(255, 255, 255, 0.92)",
            secondary: "rgba(255, 255, 255, 0.52)",
        },
        divider: "rgba(255, 255, 255, 0.08)",
    },
    typography: sharedTypography,
    shape: { borderRadius: 8 },
    components: {
        ...sharedComponents,
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    boxShadow: "0 14px 40px rgba(0, 0, 0, 0.24)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                },
            },
        },
        MuiCssBaseline: {
            styleOverrides: {
                body: { backgroundColor: "#181512" },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                head: {
                    fontWeight: 800,
                    color: "rgba(255, 255, 255, 0.52)",
                },
            },
        },
    },
});
