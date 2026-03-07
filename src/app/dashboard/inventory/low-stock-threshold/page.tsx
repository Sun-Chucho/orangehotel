import { InventoryControlView } from "@/components/dashboard/inventory-control-view";

export default function LowStockThresholdPage() {
  return <InventoryControlView initialTab="low-stock-threshold" visibleTabs={["low-stock-threshold"]} />;
}
