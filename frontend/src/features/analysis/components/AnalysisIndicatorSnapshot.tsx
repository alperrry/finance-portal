import { Box, Card, CardContent, Stack, Typography } from "@mui/material";

type SnapshotCard = {
    label: string;
    value: string;
    note: string;
    context: string;
};

type Props = {
    cards: SnapshotCard[];
};

export function AnalysisIndicatorSnapshot({ cards }: Props) {
    if (cards.length === 0) return null;

    return (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 2, mb: 2 }}>
            {cards.map((card) => (
                <Card key={card.label}>
                    <CardContent>
                        <Stack sx={{ gap: 0.5 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                                {card.label}
                            </Typography>
                            <Typography variant="h5" component="div" sx={{ fontWeight: 900 }}>
                                {card.value}
                            </Typography>
                            <Typography variant="body2" sx={{ fontStyle: "italic" }}>
                                {card.note}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {card.context}
                            </Typography>
                        </Stack>
                    </CardContent>
                </Card>
            ))}
        </Box>
    );
}
