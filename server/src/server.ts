import "dotenv/config";
import { app } from "./app";
import { ensureSuperAdmin } from "./utils/ensureSuperAdmin";
import { startWorkers } from "./worker";

const port = Number(process.env.PORT ?? 4000);

const start = async () => {
  await ensureSuperAdmin();
  if (process.env.START_WORKERS !== "false") {
    startWorkers();
  }
  app.listen(port, () => console.log(`API running on :${port}`));
};

start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
