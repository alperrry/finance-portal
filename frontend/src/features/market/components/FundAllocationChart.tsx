import { Box, Skeleton, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { fetchFundAllocation, type FundAllocationResponse } from "../api/marketApi";
import { formatLocalDate } from "../utils/marketFormatters";

const ALLOCATION_LABELS: Record<keyof Omit<FundAllocationResponse, "allocationDate">, string> = {
    hs: "Hisse Senedi",
    yhs: "Yabancı Hisse",
    kb: "Kamu Borçlanma",
    ob: "Özel Borçlanma",
    ykb: "Yabancı Kamu Borç.",
    yob: "Yabancı Özel Borç.",
    tpp: "Para Piyasası",
    vdm: "Vadeli Mevduat",
    vm: "Vadesiz Mevduat",
    r: "Repo",
    t: "Ters Repo",
    d: "Döviz",
    gas: "Altın/Gümüş/Emtia",
    byf: "Borsa Yat. Fonu",
    vint: "Yabancı Menkul",
    diger: "Diğer",
};

const SLICE_COLORS = [
    "#2563eb", "#16a34a", "#dc2626", "#d97706", "#7c3aed",
    "#0891b2", "#be185d", "#65a30d", "#9333ea", "#ea580c",
    "#0d9488", "#b45309", "#1d4ed8", "#15803d", "#9f1239",
    "#6d28d9",
];

type SliceEntry = { name: string; value: number; color: string };

function buildSlices(data: FundAllocationResponse): SliceEntry[] {
    const keys = Object.keys(ALLOCATION_LABELS) as Array<keyof typeof ALLOCATION_LABELS>;
    return keys
        .map((key, idx) => ({
            name: ALLOCATION_LABELS[key],
            value: data[key] ?? 0,
            color: SLICE_COLORS[idx % SLICE_COLORS.length],
        }))
        .filter((s) => s.value > 0);
}

type Props = { code: string };

export function FundAllocationChart({ code }: Props) {
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

    const slices = buildSlices(data);
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
                    Portföy Dağılımı
                </Typography>
                {data.allocationDate && (
                    <Typography variant="caption" color="text.secondary">
                        {formatLocalDate(data.allocationDate)} tarihi itibarıyla
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
                        formatter={(value: number) => [`%${value.toFixed(2)}`, ""]}
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
