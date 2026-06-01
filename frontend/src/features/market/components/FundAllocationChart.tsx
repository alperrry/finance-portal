import { Box, Skeleton, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { fetchFundAllocation, type FundAllocationResponse } from "../api/marketApi";
import { formatLocalDate } from "../utils/marketFormatters";

const SLICE_COLORS = [
    "#2563eb", "#16a34a", "#dc2626", "#d97706", "#7c3aed",
    "#0891b2", "#be185d", "#65a30d", "#9333ea", "#ea580c",
    "#0d9488", "#b45309", "#1d4ed8", "#15803d", "#9f1239",
    "#6d28d9",
];

type AllocationKey = keyof Omit<FundAllocationResponse, "allocationDate">;
const ALLOCATION_KEYS: AllocationKey[] = ["hs", "yhs", "kb", "ob", "ykb", "yob", "tpp", "vdm", "vm", "r", "t", "d", "gas", "byf", "vint", "diger"];

type SliceEntry = { name: string; value: number; color: string };

type Props = { code: string };

export function FundAllocationChart({ code }: Props) {
    const { t } = useTranslation();

    const { data, isLoading, isError } = useQuery({
        queryKey: ["fund-allocation", code],
        queryFn: () => fetchFundAllocation(code),
        retry: 1,
        staleTime: 5 * 60 * 1000,
    });

    if (isLoading) {
        return (
            <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: "16px", p: "20px 24px" }}>
                <Skeleton variant="text" width={220} height={24} sx={{ mb: 1 }} />
                <Skeleton variant="rectangular" height={280} sx={{ borderRadius: "10px" }} />
            </Box>
        );
    }

    if (isError || !data) {
        return null;
    }

    const slices: SliceEntry[] = ALLOCATION_KEYS
        .map((key, idx) => ({
            name: t(`market.fund.allocation.${key}` as any) as string,
            value: data[key] ?? 0,
            color: SLICE_COLORS[idx % SLICE_COLORS.length],
        }))
        .filter((s) => s.value > 0);

    if (slices.length === 0) return null;

    return (
        <Box
            sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: "16px",
                p: "20px 24px",
                bgcolor: "background.paper",
            }}
        >
            <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: "-0.01em" }}>
                    {t("market.fund.allocationTitle")}
                </Typography>
                {data.allocationDate && (
                    <Typography variant="caption" color="text.secondary">
                        {formatLocalDate(data.allocationDate)} {t("market.fund.asOf")}
                    </Typography>
                )}
            </Box>

            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        data={slices}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={110}
                        innerRadius={52}
                        paddingAngle={2}
                        label={({ name, value }) => `${name} %${(value as number).toFixed(2)}`}
                        labelLine={false}
                    >
                        {slices.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip
                        formatter={(value) => {
                            const numericValue = typeof value === "number" ? value : Number(value ?? 0);
                            return [`%${numericValue.toFixed(2)}`, ""];
                        }}
                        contentStyle={{ borderRadius: 8, fontSize: 13 }}
                    />
                    <Legend
                        iconType="circle"
                        iconSize={9}
                        formatter={(value) => (
                            <Typography component="span" variant="caption" sx={{ color: "text.primary" }}>
                                {value}
                            </Typography>
                        )}
                    />
                </PieChart>
            </ResponsiveContainer>
        </Box>
    );
}
