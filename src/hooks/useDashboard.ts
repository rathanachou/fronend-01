import { useState, useEffect } from "react";
import {
  getDashboardSummary,
  getMonthlySales,
  getDailySales,
  getSalesByCategory,
} from "../service/dashboard.service";
import type {
  IDashboardSummary,
  IMonthlySale,
  ICategorySale,
  IDailySales,
} from "../types/dashboard";
import { toast } from "sonner";

export const useDashboard = () => {
  const [summary, setSummary]           = useState<IDashboardSummary | null>(null);
  const [monthlySales, setMonthlySales] = useState<IMonthlySale[]>([]);
  const [dailySales, setDailySales]     = useState<IDailySales | null>(null);
  const [categoryData, setCategoryData] = useState<ICategorySale[]>([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [refreshKey, setRefreshKey]     = useState(0);

  const refetch = () => setRefreshKey(k => k + 1);

  // ── Fetch all dashboard data ────────────────────────────────
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const [sum, monthly, daily, category] = await Promise.all([
          getDashboardSummary(),   // GET /api/v1/dashboard/summary
          getMonthlySales(),       // GET /api/v1/dashboard/sales/monthly
          getDailySales(),         // GET /api/v1/dashboard/sales/daily
          getSalesByCategory(),    // GET /api/v1/dashboard/sales/by-category
        ]);
        setSummary(sum.data);
        setMonthlySales(monthly.data ?? []);
        setDailySales(daily);          // daily response shape: { success, date, summary, data }
        setCategoryData(category.data ?? []);
      } catch (err) {
        console.error("Dashboard error:", err);
        setError("មានបញ្ហាក្នុងការទាញទិន្នន័យ!");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [refreshKey]);

  // ── Listen for POS payment confirmation ────────────────────
  // useConfirmOrder (in usePayment.ts) posts ORDER_CONFIRMED via
  // BroadcastChannel after every successful ABA payment.
  // This listener catches it — even across tabs — and calls refetch()
  // so all dashboard stats, charts, and tables update automatically.
  useEffect(() => {
    let bc: BroadcastChannel;
    try {
      bc = new BroadcastChannel("pos_payment_confirmed");

      bc.onmessage = (event) => {
        if (event.data?.type !== "ORDER_CONFIRMED") return;

        // Re-fetch all dashboard data
        refetch();

        // Show alert so the admin sees the new sale instantly
        toast.success("🛒 New order confirmed!", {
          description: "A POS payment was just completed. Stats are refreshing…",
          duration: 6000,
        });
      };
    } catch {
      // BroadcastChannel not available — graceful no-op
    }

    return () => {
      try { bc?.close(); } catch { /* ignore */ }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount once — refetch is stable (closure over setRefreshKey)

  return {
    // Raw API data
    summary,        // IDashboardSummary | null
    monthlySales,   // IMonthlySale[]
    dailySales,     // IDailySales | null  (.data = Order[], .summary)
    categoryData,   // ICategorySale[]

    // Convenience shortcuts from summary
    topProducts:   summary?.topProducts   ?? [],
    lowStock:      summary?.lowStock      ?? [],
    totalProducts: summary?.totalProducts ?? 0,
    totalCustomers: summary?.totalCustomers ?? 0,

    loading,
    error,
    refetch,
  };
};