import { listGenerationRecords } from "@/lib/store";

type TrendPoint = {
  label: string;
  value: number;
  ordered: number;
};

type BreakdownItem = {
  label: string;
  value: number;
  share: number;
};

type RecentGeneration = {
  id: string;
  productType: string;
  productTitle: string | null;
  outputImageUrl: string;
  sourceImageUrl: string;
  customerEmail: string | null;
  modelUsed: string;
  promptUsed: string;
  orderName: string | null;
  orderId: string | null;
  status: string;
  createdAt: string;
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatShortDate(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function percentage(part: number, total: number) {
  if (!total) return 0;
  return Number(((part / total) * 100).toFixed(1));
}

export async function getDashboardData(shopDomain: string) {
  const rows = await listGenerationRecords(shopDomain);
  const normalizedRows = rows.map((row) => ({
    ...row,
    createdAtDate: new Date(row.createdAt),
  }));

  const now = new Date();
  const todayStart = startOfDay(now);
  const lastWeekStart = addDays(todayStart, -6);
  const previousWeekStart = addDays(todayStart, -13);
  const previousWeekEnd = addDays(todayStart, -7);

  const totalGenerations = normalizedRows.length;
  const orderedCount = normalizedRows.filter((row) => row.orderId).length;
  const pendingCount = normalizedRows.filter((row) => !row.orderId).length;
  const todayCount = normalizedRows.filter((row) => row.createdAtDate >= todayStart).length;
  const last7DaysRows = normalizedRows.filter((row) => row.createdAtDate >= lastWeekStart);
  const prev7DaysRows = normalizedRows.filter(
    (row) => row.createdAtDate >= previousWeekStart && row.createdAtDate < previousWeekEnd,
  );

  const conversionRate = percentage(orderedCount, totalGenerations);
  const averageDaily = Number((last7DaysRows.length / 7).toFixed(1));
  const weekOverWeek = prev7DaysRows.length
    ? Number((((last7DaysRows.length - prev7DaysRows.length) / prev7DaysRows.length) * 100).toFixed(1))
    : last7DaysRows.length > 0
      ? 100
      : 0;

  const trend: TrendPoint[] = Array.from({ length: 7 }, (_, index) => {
    const day = addDays(lastWeekStart, index);
    const nextDay = addDays(day, 1);
    const dayRows = normalizedRows.filter(
      (row) => row.createdAtDate >= day && row.createdAtDate < nextDay,
    );
    return {
      label: formatShortDate(day),
      value: dayRows.length,
      ordered: dayRows.filter((row) => row.orderId).length,
    };
  });

  const byProductMap = new Map<string, number>();
  const byModelMap = new Map<string, number>();
  const recentOrders = rows.filter((row) => row.orderId).slice(0, 6);

  for (const row of rows) {
    byProductMap.set(row.productType, (byProductMap.get(row.productType) ?? 0) + 1);
    byModelMap.set(row.modelUsed, (byModelMap.get(row.modelUsed) ?? 0) + 1);
  }

  const toBreakdown = (map: Map<string, number>): BreakdownItem[] =>
    [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({
        label,
        value,
        share: percentage(value, totalGenerations),
      }));

  return {
    summary: {
      totalGenerations,
      orderedCount,
      pendingCount,
      todayCount,
      averageDaily,
      conversionRate,
      weekOverWeek,
      activeCustomers: new Set(rows.map((row) => row.customerEmail).filter(Boolean)).size,
      activeModels: byModelMap.size,
      activeProducts: byProductMap.size,
    },
    trend,
    productBreakdown: toBreakdown(byProductMap),
    modelBreakdown: toBreakdown(byModelMap),
    recent: rows.slice(0, 8) as RecentGeneration[],
    recentOrders: recentOrders as RecentGeneration[],
  };
}
