import { Chip, Stack, TextField } from "@mui/material";
import { useTranslation } from "react-i18next";
import { formatWholeNumber } from "../utils/marketFormatters";

type Props = {
    query: string;
    onQueryChange: (value: string) => void;
    placeholder: string;
    visibleCount: number;
    totalCount: number;
    datasetDate: string;
};

export function MarketSearchBar({ query, onQueryChange, placeholder, visibleCount, totalCount, datasetDate }: Props) {
    const { t } = useTranslation();

    return (
        <Stack direction={{ xs: "column", sm: "row" }} sx={{ gap: 1, alignItems: { xs: "stretch", sm: "center" } }}>
            <TextField
                id="market-search"
                type="search"
                value={query}
                placeholder={placeholder}
                onChange={(event) => onQueryChange(event.target.value)}
                label={t("market.tables.search")}
            />
            <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
                <Chip label={`${formatWholeNumber(visibleCount)} / ${formatWholeNumber(totalCount)} ${t("market.tables.records")}`} />
                <Chip variant="outlined" label={`${t("market.tables.dataDate")} ${datasetDate}`} />
            </Stack>
        </Stack>
    );
}
