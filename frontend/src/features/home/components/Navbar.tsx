import { AppBar, Box, Button, Toolbar, Typography } from "@mui/material";
import { useAuth } from "../../../app/auth/AuthContext";

export default function Navbar() {
    const { login, register } = useAuth();

    return (
        <AppBar position="sticky" elevation={0} sx={{ bgcolor: "#111111", borderBottom: "1px solid #222" }}>
            <Toolbar sx={{ justifyContent: "space-between" }}>
                <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 1, color: "#fff" }}>
                    Kapital<Box component="span" sx={{ color: "#c1622f" }}>.</Box>
                </Typography>
                <Box sx={{ display: "flex", gap: 1 }}>
                    <Button
                        variant="outlined"
                        onClick={login}
                        sx={{ color: "#fff", borderColor: "#444", "&:hover": { borderColor: "#c1622f", bgcolor: "transparent" } }}
                    >
                        Giriş Yap
                    </Button>
                    <Button
                        variant="contained"
                        onClick={register}
                        sx={{ bgcolor: "#c1622f", "&:hover": { bgcolor: "#a8512a" } }}
                    >
                        Kayıt Ol
                    </Button>
                </Box>
            </Toolbar>
        </AppBar>
    );
}
