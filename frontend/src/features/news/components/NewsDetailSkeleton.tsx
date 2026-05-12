import { Card, CardContent, Skeleton, Stack } from "@mui/material";

export function NewsDetailSkeleton() {
    return (
        <Stack direction={{ xs: "column", md: "row" }} sx={{ gap: 3, alignItems: "flex-start" }}>
            <Card sx={{ flex: 1 }}>
                <CardContent>
                    <Skeleton variant="text" width="35%" sx={{ mb: 1 }} />
                    <Skeleton variant="text" width="80%" />
                    <Skeleton variant="text" width="70%" sx={{ mb: 2 }} />
                    <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 1, mb: 2 }} />
                    <Skeleton variant="text" />
                    <Skeleton variant="text" />
                    <Skeleton variant="text" width="65%" />
                </CardContent>
            </Card>
            <Card sx={{ width: { xs: "100%", md: 280 }, flexShrink: 0 }}>
                <CardContent>
                    <Skeleton variant="text" width="55%" sx={{ mb: 2 }} />
                    <Skeleton variant="text" width="70%" />
                    <Skeleton variant="text" width="45%" />
                    <Skeleton variant="text" width="60%" />
                </CardContent>
            </Card>
        </Stack>
    );
}
