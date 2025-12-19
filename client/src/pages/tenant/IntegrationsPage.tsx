import ModulePage from "./ModulePage";

export default function IntegrationsPage() {
  return (
    <ModulePage
      title="Integrations"
      subtitle="Connect CRMs, calendars, and data sources." 
      primaryAction="Add integration"
      secondaryAction="View API keys"
      helperItems={["Connect your CRM", "Enable webhooks", "Sync data every 15 minutes"]}
    />
  );
}
