import type { Content, TDocumentDefinitions, TableCell } from "pdfmake/interfaces";
import i18n from "../i18n";
import type { ManualPositionResponse, PortfolioItemResponse, PortfolioInstrumentType, PortfolioResponse } from "../features/portfolio/api/portfolioApi";

type ExportOptions = {
    portfolio: PortfolioResponse;
    manualPositions?: ManualPositionResponse[];
    generatedAt?: Date;
};

type PdfMakeApi = {
    createPdf: (documentDefinition: TDocumentDefinitions) => {
        getBlob: (callback: (blob: Blob) => void) => void;
    };
    addVirtualFileSystem?: (vfs: Record<string, string>) => void;
    vfs?: Record<string, string>;
};

type PdfLanguage = "tr" | "en";

function getPdfLanguage(): PdfLanguage {
    const language = (i18n.resolvedLanguage || i18n.language || "tr").toLowerCase();
    return language.startsWith("en") ? "en" : "tr";
}

function getIntlLocale() {
    return getPdfLanguage() === "en" ? "en-US" : "tr-TR";
}

function getInstrumentLabels(): Record<PortfolioInstrumentType, string> {
    return {
        STOCK: i18n.t("portfolio.types.stock"),
        FUND: i18n.t("portfolio.types.fund"),
        CURRENCY: i18n.t("portfolio.types.currency"),
        BOND: i18n.t("portfolio.types.bond"),
        VIOP: i18n.t("portfolio.types.viop"),
        DEPOSIT: i18n.t("portfolio.types.deposit"),
    };
}

function toNumber(value: number | null | undefined) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatNumber(value: number | null | undefined, digits = 2) {
    const normalized = toNumber(value);
    if (normalized === null) return "-";

    return new Intl.NumberFormat(getIntlLocale(), {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    }).format(normalized);
}

function formatQuantity(value: number | null | undefined) {
    const normalized = toNumber(value);
    if (normalized === null) return "-";

    return new Intl.NumberFormat(getIntlLocale(), {
        minimumFractionDigits: 0,
        maximumFractionDigits: 6,
    }).format(normalized);
}

function formatMoney(value: number | null | undefined, currency = "TRY", digits = 2) {
    const normalized = toNumber(value);
    if (normalized === null) return "-";

    try {
        return new Intl.NumberFormat(getIntlLocale(), {
            style: "currency",
            currency,
            minimumFractionDigits: digits,
            maximumFractionDigits: digits,
        }).format(normalized);
    } catch {
        return `${formatNumber(normalized, digits)} ${currency}`;
    }
}

function formatPercent(value: number | null | undefined) {
    const normalized = toNumber(value);
    if (normalized === null) return "-";
    const sign = normalized > 0 ? "+" : "";
    return `${sign}${formatNumber(normalized, 2)}%`;
}

function formatSignedMoney(value: number | null | undefined, currency = "TRY") {
    const normalized = toNumber(value);
    if (normalized === null) return "-";
    const sign = normalized > 0 ? "+" : "";
    return `${sign}${formatMoney(normalized, currency)}`;
}

function formatDateTime(value: string | Date | null | undefined) {
    if (!value) return "-";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat(getIntlLocale(), {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function formatDate(value: string | Date | null | undefined) {
    if (!value) return "-";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat(getIntlLocale(), {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(date);
}

function sanitizeFilePart(value: string) {
    const normalized = value
        .toLocaleLowerCase(getIntlLocale())
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ı/g, "i")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    return normalized || i18n.t("portfolio.pdf.fileNameFallback");
}

function metric(label: string, value: string, caption: string): Content {
    return {
        stack: [
            { text: label, style: "metricLabel" },
            { text: value, style: "metricValue" },
            { text: caption, style: "metricCaption" },
        ],
        margin: [0, 0, 0, 8],
    };
}

function primaryCell(text: string): TableCell {
    return { text, style: "primaryCell" };
}

function rightCell(text: string): TableCell {
    return { text, alignment: "right" };
}

function positionName(item: PortfolioItemResponse) {
    return item.instrumentSymbol || item.instrumentName || `${getInstrumentLabels()[item.instrumentType]} #${item.instrumentId}`;
}

function positionDisplayName(item: PortfolioItemResponse) {
    const name = positionName(item);
    if (item.instrumentSymbol && item.instrumentName) {
        return `${name}
${item.instrumentName}`;
    }
    return name;
}

function manualPositionName(position: ManualPositionResponse) {
    return position.instrumentSymbol
        ?? position.underlyingSymbol
        ?? position.bankName
        ?? position.instrumentName
        ?? getInstrumentLabels()[position.instrumentType];
}

function manualPositionDisplayName(position: ManualPositionResponse) {
    const name = manualPositionName(position);
    const detail = position.instrumentName && position.instrumentName !== name
        ? position.instrumentName
        : position.bankName && position.bankName !== name
          ? position.bankName
          : null;
    const entryDate = formatDate(position.entryDate);
    const entryLabel = i18n.t("portfolio.pdf.entryDate", { date: entryDate });

    return detail ? `${name}
${detail}
${entryLabel}` : `${name}
${entryLabel}`;
}

function positionKindLabel(kind: ManualPositionResponse["positionKind"]) {
    return kind === "OPEN" ? i18n.t("portfolio.pdf.kind.open") : i18n.t("portfolio.pdf.kind.closed");
}

function directionLabel(direction: ManualPositionResponse["direction"]) {
    return direction === "SHORT" ? i18n.t("portfolio.pdf.direction.short") : i18n.t("portfolio.pdf.direction.long");
}

function createSummaryMetrics(portfolio: PortfolioResponse): Content {
    return {
        columns: [
            metric(
                i18n.t("portfolio.pdf.metrics.positionValue"),
                formatMoney(portfolio.totalValue, portfolio.displayCurrency),
                i18n.t("portfolio.pdf.metrics.positionValueCaption"),
            ),
            metric(
                i18n.t("portfolio.pdf.metrics.costBasis"),
                formatMoney(portfolio.totalCostBasis, portfolio.displayCurrency),
                i18n.t("portfolio.pdf.metrics.costBasisCaption"),
            ),
            metric(
                i18n.t("portfolio.pdf.metrics.profitLoss"),
                formatSignedMoney(portfolio.totalProfitLoss, portfolio.displayCurrency),
                formatPercent(portfolio.totalProfitLossPct),
            ),
        ],
        columnGap: 14,
        margin: [0, 12, 0, 12],
    };
}

function createPositionsTable(portfolio: PortfolioResponse): Content {
    const items = [...(portfolio.items ?? [])].sort((left, right) => (toNumber(right.currentValue) ?? 0) - (toNumber(left.currentValue) ?? 0));
    if (items.length === 0) {
        return { text: i18n.t("portfolio.pdf.noPositions"), style: "emptyText", margin: [0, 2, 0, 14] };
    }

    const body: TableCell[][] = [
        [i18n.t("portfolio.pdf.cols.instrument"), i18n.t("portfolio.pdf.cols.type"), i18n.t("portfolio.pdf.cols.quantity"), i18n.t("portfolio.pdf.cols.avgCost"), i18n.t("portfolio.pdf.cols.currentPrice"), i18n.t("portfolio.pdf.cols.currentValue"), i18n.t("portfolio.pdf.cols.pnl"), i18n.t("portfolio.pdf.cols.pnlPercent")],
        ...items.map((item) => [
            primaryCell(positionDisplayName(item)),
            getInstrumentLabels()[item.instrumentType],
            rightCell(formatQuantity(item.quantity)),
            rightCell(formatMoney(item.avgCost, item.nativeCurrency ?? "TRY", 4)),
            rightCell(formatMoney(item.currentPrice, item.nativeCurrency ?? "TRY", 4)),
            rightCell(formatMoney(item.currentValue, portfolio.displayCurrency)),
            rightCell(formatSignedMoney(item.profitLoss, portfolio.displayCurrency)),
            rightCell(formatPercent(item.profitLossPct)),
        ]),
    ];

    return {
        table: {
            headerRows: 1,
            widths: ["*", 42, 48, 62, 62, 62, 62, 42],
            body,
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 16],
    };
}

function createAllocationSummary(portfolio: PortfolioResponse): Content {
    const total = toNumber(portfolio.totalValue) ?? 0;
    const rows = [...(portfolio.items ?? [])]
        .map((item) => ({
            name: positionName(item),
            value: toNumber(item.currentValue) ?? 0,
        }))
        .filter((item) => item.value > 0)
        .sort((left, right) => right.value - left.value)
        .slice(0, 8);

    if (rows.length === 0 || total <= 0) {
        return { text: i18n.t("portfolio.pdf.noAllocationData"), style: "emptyText", margin: [0, 2, 0, 14] };
    }

    return {
        table: {
            headerRows: 1,
            widths: ["*", 76, 48],
            body: [
                [i18n.t("portfolio.pdf.cols.instrument"), i18n.t("portfolio.pdf.cols.value"), i18n.t("portfolio.pdf.cols.share")],
                ...rows.map((row) => [
                    row.name,
                    rightCell(formatMoney(row.value, portfolio.displayCurrency)),
                    rightCell(formatPercent((row.value / total) * 100)),
                ]),
            ],
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 16],
    };
}

function createManualPositionsSection(portfolio: PortfolioResponse, positions: ManualPositionResponse[]): Content[] {
    if (!positions.length) return [];

    const byType = new Map<PortfolioInstrumentType, ManualPositionResponse[]>();
    for (const pos of positions) {
        const existing = byType.get(pos.instrumentType) ?? [];
        existing.push(pos);
        byType.set(pos.instrumentType, existing);
    }

    const sections: Content[] = [{ text: i18n.t("portfolio.pdf.manualPositionsTitle"), style: "sectionTitle" }];

    for (const [type, rows] of byType) {
        sections.push({ text: getInstrumentLabels()[type], style: "subSectionTitle" });

        const body: TableCell[][] = [
            [
                i18n.t("portfolio.pdf.cols.instrument"),
                i18n.t("portfolio.pdf.cols.status"),
                i18n.t("portfolio.pdf.cols.direction"),
                i18n.t("portfolio.pdf.cols.quantity"),
                i18n.t("portfolio.pdf.cols.buyPriceShort"),
                i18n.t("portfolio.pdf.cols.currentOrExitPriceShort"),
                i18n.t("portfolio.pdf.cols.currentValue"),
                i18n.t("portfolio.pdf.cols.pnl"),
                i18n.t("portfolio.pdf.cols.pnlPercent"),
            ],
            ...rows.map((pos) => {
                const pnl = pos.unrealizedPnl ?? pos.realizedPnl;
                const lastPrice = pos.positionKind === "CLOSED" ? pos.exitPrice : pos.currentPrice;
                return [
                    primaryCell(manualPositionDisplayName(pos)),
                    positionKindLabel(pos.positionKind),
                    directionLabel(pos.direction),
                    rightCell(formatQuantity(pos.quantity)),
                    rightCell(formatMoney(pos.entryPrice, "TRY", 4)),
                    rightCell(lastPrice != null ? formatMoney(lastPrice, "TRY", 4) : "-"),
                    rightCell(formatMoney(pos.currentValue, portfolio.displayCurrency)),
                    rightCell(pnl != null ? formatSignedMoney(pnl, portfolio.displayCurrency) : "-"),
                    rightCell(pos.pnlPercent != null ? formatPercent(pos.pnlPercent) : "-"),
                ];
            }),
        ];

        sections.push({
            table: { headerRows: 1, widths: ["*", 42, 42, 48, 58, 58, 58, 58, 42], body },
            layout: "lightHorizontalLines",
            margin: [0, 0, 0, 10] as [number, number, number, number],
        });
    }

    return sections;
}

function createDocumentDefinition({ portfolio, manualPositions, generatedAt = new Date() }: ExportOptions): TDocumentDefinitions {
    return {
        pageSize: "A4",
        pageOrientation: "landscape",
        pageMargins: [32, 42, 32, 34],
        info: {
            title: `${portfolio.name} ${i18n.t("portfolio.pdf.reportTitle")}`,
            author: "Kapital",
            subject: i18n.t("portfolio.pdf.report"),
        },
        footer: (currentPage, pageCount) => ({
            columns: [
                { text: i18n.t("portfolio.pdf.disclaimer"), alignment: "left" },
                { text: `${currentPage}/${pageCount}`, alignment: "right" },
            ],
            margin: [32, 8, 32, 0],
            style: "footer",
        }),
        content: [
            { text: i18n.t("portfolio.pdf.reportTitle"), style: "title" },
            {
                columns: [
                    { text: portfolio.name, style: "subtitle" },
                    { text: i18n.t("portfolio.pdf.currencyMeta", { currency: portfolio.displayCurrency }), style: "meta", alignment: "right" },
                ],
                margin: [0, 0, 0, 4],
            },
            { text: i18n.t("portfolio.pdf.generatedAt", { date: formatDateTime(generatedAt) }), style: "meta", margin: [0, 0, 0, 8] },
            createSummaryMetrics(portfolio),
            { text: i18n.t("portfolio.pdf.allocationTitle"), style: "sectionTitle" },
            createAllocationSummary(portfolio),
            { text: i18n.t("portfolio.pdf.trackedPositionsTitle"), style: "sectionTitle" },
            createPositionsTable(portfolio),
            ...(manualPositions?.length ? createManualPositionsSection(portfolio, manualPositions) : []),
        ],
        defaultStyle: {
            font: "Roboto",
            fontSize: 8,
            color: "#111111",
        },
        styles: {
            title: { fontSize: 20, bold: true, color: "#111111", margin: [0, 0, 0, 6] },
            subtitle: { fontSize: 13, bold: true, color: "#c1622f" },
            sectionTitle: { fontSize: 12, bold: true, color: "#111111", margin: [0, 10, 0, 6] },
            meta: { fontSize: 8, color: "#666666" },
            metricLabel: { fontSize: 8, color: "#666666" },
            metricValue: { fontSize: 13, bold: true, color: "#111111", margin: [0, 2, 0, 1] },
            metricCaption: { fontSize: 8, color: "#666666" },
            primaryCell: { bold: true },
            subSectionTitle: { fontSize: 10, bold: true, color: "#444444", margin: [0, 6, 0, 4] },
            emptyText: { color: "#666666", italics: true },
            footer: { fontSize: 7, color: "#777777" },
        },
    };
}

export async function exportPortfolioPdf(options: ExportOptions) {
    const [pdfMakeModule, vfsFontsModule] = await Promise.all([
        import("pdfmake/build/pdfmake.js"),
        import("pdfmake/build/vfs_fonts.js"),
    ]);
    const generatedAt = options.generatedAt ?? new Date();
    const datePart = generatedAt.toISOString().slice(0, 10);
    const fileName = `${i18n.t("portfolio.pdf.fileNamePrefix")}-${sanitizeFilePart(options.portfolio.name)}-${datePart}.pdf`;
    const pdfMake = resolvePdfMakeApi(pdfMakeModule);
    const fontVfs = resolveFontVfs(vfsFontsModule);

    if (pdfMake.addVirtualFileSystem) {
        pdfMake.addVirtualFileSystem(fontVfs);
    } else {
        pdfMake.vfs = fontVfs;
    }

    const blob = await createPdfBlob(pdfMake, createDocumentDefinition({
        portfolio: options.portfolio,
        manualPositions: options.manualPositions,
        generatedAt,
    }));
    downloadBlob(blob, fileName);
}

function createPdfBlob(pdfMake: PdfMakeApi, documentDefinition: TDocumentDefinitions) {
    return new Promise<Blob>((resolve) => {
        pdfMake.createPdf(documentDefinition).getBlob(resolve);
    });
}

function downloadBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function resolvePdfMakeApi(module: unknown): PdfMakeApi {
    const candidate = module as Partial<PdfMakeApi> & { default?: Partial<PdfMakeApi> };
    if (isPdfMakeApi(candidate.default)) return candidate.default;
    if (isPdfMakeApi(candidate)) return candidate;
    throw new Error(i18n.t("portfolio.pdf.failed"));
}

function isPdfMakeApi(value: unknown): value is PdfMakeApi {
    return typeof (value as Partial<PdfMakeApi> | null)?.createPdf === "function";
}

function resolveFontVfs(module: unknown): Record<string, string> {
    const candidate = module as {
        default?: Record<string, string> | { vfs?: Record<string, string> };
        vfs?: Record<string, string>;
    } & Record<string, unknown>;
    const defaultValue = candidate.default;
    if (candidate.vfs) return candidate.vfs;
    if (hasFontVfs(defaultValue)) return defaultValue.vfs;
    if (defaultValue && Object.keys(defaultValue).length > 0) return defaultValue as Record<string, string>;
    return candidate as Record<string, string>;
}

function hasFontVfs(value: unknown): value is { vfs: Record<string, string> } {
    return typeof value === "object"
        && value !== null
        && "vfs" in value
        && typeof (value as { vfs?: unknown }).vfs === "object"
        && (value as { vfs?: unknown }).vfs !== null;
}
