import { Box, Container, Divider, Link, Stack, Typography } from "@mui/material";

const LINKS = ["Hakkında", "Gizlilik", "Kullanım Koşulları", "İletişim"];

export default function Footer() {
    return (
        <Box sx={{ bgcolor: "#0d0d0d", borderTop: "1px solid #222", py: 5 }}>
            <Container maxWidth="lg">
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    sx={{ justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" } }}
                    spacing={3}
                >
                    <Typography variant="h6" sx={{ fontWeight: 700, color: "#fff" }}>
                        Kapital<Box component="span" sx={{ color: "#c1622f" }}>.</Box>
                    </Typography>
                    <Stack direction="row" spacing={3} sx={{ flexWrap: "wrap" }}>
                        {LINKS.map((link) => (
                            <Link
                                key={link}
                                href="#"
                                underline="hover"
                                sx={{ color: "#888", fontSize: "0.85rem", "&:hover": { color: "#c1622f" } }}
                            >
                                {link}
                            </Link>
                        ))}
                    </Stack>
                </Stack>
                <Divider sx={{ my: 3, borderColor: "#222" }} />
                <Typography
                    variant="caption"
                    sx={{ color: "#555", display: "block", textAlign: "center" }}
                >
                    © {new Date().getFullYear()} Kapital. Tüm hakları saklıdır.
                </Typography>
            </Container>
        </Box>
    );
}
