import { Card, CardContent, Skeleton } from "@mui/material";

export function NewsCardSkeleton() {
    return (
        <Card sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <Skeleton variant="rectangular" height={160} />
            <CardContent sx={{ flexGrow: 1 }}>
                <Skeleton variant="text" width="40%" sx={{ mb: 0.5 }} />
                <Skeleton variant="text" width="80%" />
                <Skeleton variant="text" width="90%" />
                <Skeleton variant="text" width="75%" sx={{ mb: 1 }} />
                <Skeleton variant="text" width="50%" />
            </CardContent>
        </Card>
    );
}
