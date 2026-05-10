import { Grid, Skeleton } from "@mui/material";
import { MetricCard, SectionPanel } from "../../../components/ui";
import type { SummaryCard } from "../types";

type Props = {
    summaryCards: SummaryCard[];
    loading: boolean;
};

export function MarketSummaryCards({ summaryCards, loading }: Props) {
    if (loading) {
        return (
            <Grid container spacing={1.75}>
                {Array.from({ length: 3 }).map((_, index) => (
                    <Grid key={`summary-skeleton-${index}`} size={{ xs: 12, md: 4 }}>
                        <SectionPanel>
                            <Skeleton width="35%" />
                            <Skeleton width="70%" height={44} />
                            <Skeleton width="55%" />
                        </SectionPanel>
                    </Grid>
                ))}
            </Grid>
        );
    }

    return (
        <Grid container spacing={1.75}>
            {summaryCards.map((card) => (
                <Grid key={card.label} size={{ xs: 12, md: 4 }}>
                    <MetricCard label={card.label} value={card.value} note={card.note} tone={card.tone} />
                </Grid>
            ))}
        </Grid>
    );
}
