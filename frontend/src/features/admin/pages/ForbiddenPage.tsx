import { Box, Button, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export function ForbiddenPage() {
    return (
        <Box
            component="main"
            sx={{
                minHeight: "100vh",
                background: "radial-gradient(circle at 14% -12%, rgba(193, 98, 47, 0.1), transparent 42%), #edeae4",
                display: "grid",
                placeItems: "center",
                p: 3,
            }}
        >
            <Box sx={{ maxWidth: 420, textAlign: "center" }}>
                <Typography sx={{ color: "secondary.main", fontFamily: '"JetBrains Mono", monospace', fontSize: 32, fontWeight: 800 }}>
                    403
                </Typography>
                <Typography variant="h5" sx={{ mt: 1, fontWeight: 800 }}>Yetkisiz erişim</Typography>
                <Typography color="text.secondary" sx={{ mt: 1.5, mb: 3 }}>
                    Bu sayfayı görüntülemek için admin yetkisi gerekir.
                </Typography>
                <Button component={RouterLink} to="/portfolio" variant="contained" color="secondary">
                    Piyasalara dön
                </Button>
            </Box>
        </Box>
    );
}
