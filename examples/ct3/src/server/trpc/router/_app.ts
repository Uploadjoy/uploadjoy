import { router } from "../trpc";
import { exampleRouter } from "./example";
import { uploadjoyRouter } from "./uploadjoy";

export const appRouter = router({
  example: exampleRouter,
  uploadjoy: uploadjoyRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
