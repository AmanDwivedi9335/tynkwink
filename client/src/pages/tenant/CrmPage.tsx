import ModulePage from "./ModulePage";

export default function CrmPage() {
  return (
    <ModulePage
      title="CRM"
      subtitle="Manage leads, conversations, and follow-ups in one place."
      primaryAction="Import leads"
      secondaryAction="Manage pipelines"
      helperItems={["Add your lead sources", "Assign owners to new leads", "Connect WhatsApp for sync"]}
    />
  );
}
