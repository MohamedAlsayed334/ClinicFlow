import { env } from "./config/env.js";
import { connectDb } from "./config/db.js";
import { app } from "./app.js";

async function main(): Promise<void> {
  await connectDb();
  app.listen(env.PORT, () => {
    process.stdout.write(`Server running on port ${env.PORT}\n`);
  });
}

main().catch((err: unknown) => {
  process.stderr.write(`Failed to start server: ${String(err)}\n`);
  process.exit(1);
});
