import ModulePage from "./ModulePage";

export default function SmartTriggersPage() {
  return (
    <ModulePage
      title="Smart Triggers"
      subtitle="Activate actions based on lead behavior and message intent."
      primaryAction="Create trigger"
      secondaryAction="Review rules"
      helperItems={["Define trigger conditions", "Link to automations", "Monitor real-time events"]}
    />
  );
}
