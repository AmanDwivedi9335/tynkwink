import ModulePage from "./ModulePage";

export default function KnowledgeBasePage() {
  return (
    <ModulePage
      title="Knowledge Base"
      subtitle="Train your AI with documents, FAQs, and team playbooks."
      primaryAction="Upload files"
      secondaryAction="Manage sources"
      helperItems={["Add PDFs, docs, or URLs", "Tag content by product", "Review AI answers"]}
    />
  );
}
