import { prisma } from "../src/prisma";

async function main() {
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    console.log("No tenant found; skipping seed.");
    return;
  }

  const membership = await prisma.tenantUser.findFirst({
    where: { tenantId: tenant.id },
    include: { user: true },
  });
  if (!membership) {
    console.log("No tenant users found; skipping seed.");
    return;
  }

  const existing = await prisma.sequence.findFirst({
    where: { tenantId: tenant.id, name: "New Lead Nurture" },
  });
  if (existing) {
    console.log("Seed sequence already exists.");
    return;
  }

  const sequence = await prisma.sequence.create({
    data: {
      tenantId: tenant.id,
      createdById: membership.userId,
      name: "New Lead Nurture",
      description: "Warm new leads with email, WhatsApp, and a call reminder.",
      triggerType: "ON_LEAD_CREATED",
      triggerConfig: { enabled: true },
      isActive: true,
      steps: {
        create: [
          {
            tenantId: tenant.id,
            stepOrder: 1,
            delayValue: 10,
            delayUnit: "MINUTES",
            actionType: "EMAIL",
            actionConfig: {
              subject: "Thanks for reaching out, {{lead.name}}",
              body: "Hi {{lead.name}}, we just received your inquiry. We will get back to you shortly.",
            },
          },
          {
            tenantId: tenant.id,
            stepOrder: 2,
            delayValue: 2,
            delayUnit: "HOURS",
            actionType: "WHATSAPP",
            actionConfig: {
              messageText: "Hello {{lead.name}}, this is {{tenant.name}}. Reply here if you need any help.",
            },
          },
          {
            tenantId: tenant.id,
            stepOrder: 3,
            delayValue: 1,
            delayUnit: "DAYS",
            actionType: "CALL_REMINDER",
            actionConfig: {
              title: "Follow up with {{lead.name}}",
              description: "Call to understand requirements and move the lead forward.",
              assignTo: "leadOwner",
            },
          },
        ],
      },
    },
  });

  console.log(`Seeded sequence ${sequence.name} for tenant ${tenant.name}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
