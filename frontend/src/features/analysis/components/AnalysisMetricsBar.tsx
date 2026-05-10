import { Box, Skeleton } from "@mui/material";
import { MetricCard } from "../../../components/ui/MetricCard";
import { formatDateLabel } from "../utils/analysisFormatters";

type MetricCardItem = {
    label: string;
    value: string;
};

type Props = {
    cards: MetricCardItem[];
    isLoading: boolean;
    latestDate: string | null;
};

export function AnalysisMetricsBar({ cards, isLoading, latestDate }: Props) {
    return (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 2, mb: 2 }}>
            {cards.map((card) => (
                <MetricCard
                    key={card.label}
                    label={card.label}
                    value={isLoading ? <Skeleton width="60%" /> : card.value}
                    note={formatDateLabel(latestDate)}
                />
            ))}
        </Box>
    );
}
