import ModulePage from "./ModulePage";

export default function WhatsAppPage() {
  return (
    <ModulePage
      title="WhatsApp"
      subtitle="Sync WhatsApp conversations and send broadcasts securely."
      primaryAction="Connect WhatsApp"
      secondaryAction="Manage sessions"
      helperItems={["Install the Chrome extension", "Link a WhatsApp number", "Set message limits"]}
    />
  );
}
