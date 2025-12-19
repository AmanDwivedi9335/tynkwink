import ModulePage from "./ModulePage";

export default function AnalyticsPage() {
  return (
    <ModulePage
      title="Analytics"
      subtitle="Track conversions, response times, and ROI across channels."
      primaryAction="View reports"
      secondaryAction="Export data"
      helperItems={["Set your reporting window", "Compare campaign performance", "Share dashboards with stakeholders"]}
    />
  );
}
