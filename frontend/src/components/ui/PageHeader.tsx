import { Box, Stack, Typography, type SxProps, type Theme } from "@mui/material";
import type { ReactNode } from "react";

type PageHeaderProps = {
    kicker?: string;
    title: string;
    subtitle?: string;
    actions?: ReactNode;
    sx?: SxProps<Theme>;
};

export function PageHeader({ kicker, title, subtitle, actions, sx }: PageHeaderProps) {
    return (
        <Stack
            direction={{ xs: "column", md: "row" }}
            sx={{
                alignItems: { xs: "flex-start", md: "flex-end" },
                justifyContent: "space-between",
                gap: 2,
                ...sx,
            }}
        >
            <Box>
                {kicker ? (
                    <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>
                        {kicker}
                    </Typography>
                ) : null}
                <Typography variant="h4" component="h1" sx={{ fontWeight: 900 }}>
                    {title}
                </Typography>
                {subtitle ? (
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 760, mt: 0.75 }}>
                        {subtitle}
                    </Typography>
                ) : null}
            </Box>
            {actions ? <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>{actions}</Stack> : null}
        </Stack>
    );
}
