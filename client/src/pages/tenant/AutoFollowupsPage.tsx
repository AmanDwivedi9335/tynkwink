import ModulePage from "./ModulePage";

export default function AutoFollowupsPage() {
  return (
    <ModulePage
      title="Auto Follow-ups"
      subtitle="Automate sequences to keep every lead warm."
      primaryAction="Create automation"
      secondaryAction="View templates"
      helperItems={["Choose a trigger", "Personalize message content", "Schedule follow-up windows"]}
    />
  );
}
