import "dotenv/config";
import { app } from "./app";
import { ensureSuperAdmin } from "./utils/ensureSuperAdmin";

const port = Number(process.env.PORT ?? 4000);

const start = async () => {
  await ensureSuperAdmin();
  app.listen(port, () => console.log(`API running on :${port}`));
};

start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
