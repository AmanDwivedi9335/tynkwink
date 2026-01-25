type TemplateContext = {
  lead: {
    id: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  owner: {
    id: string;
    name?: string | null;
    email?: string | null;
  };
  tenant: {
    id: string;
    name?: string | null;
  };
};

const tokenRegex = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

function resolvePath(context: TemplateContext, path: string) {
  const parts = path.split(".");
  let current: any = context;
  for (const part of parts) {
    if (!current || typeof current !== "object") return "";
    current = current[part];
  }
  if (current === null || current === undefined) return "";
  return String(current);
}

export function renderTemplate(template: string, context: TemplateContext) {
  if (!template) return "";
  return template.replace(tokenRegex, (_match, token) => resolvePath(context, token));
}

export function buildTemplateContext(params: {
  lead: { id: string; name?: string | null; email?: string | null; phone?: string | null };
  owner?: { id: string; name?: string | null; email?: string | null } | null;
  tenant: { id: string; name?: string | null };
}): TemplateContext {
  return {
    lead: {
      id: params.lead.id,
      name: params.lead.name ?? "",
      email: params.lead.email ?? "",
      phone: params.lead.phone ?? "",
    },
    owner: {
      id: params.owner?.id ?? "",
      name: params.owner?.name ?? "",
      email: params.owner?.email ?? "",
    },
    tenant: {
      id: params.tenant.id,
      name: params.tenant.name ?? "",
    },
  };
}
