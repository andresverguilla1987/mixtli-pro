import { app, PORT } from "./app.js";

app.listen(PORT, () => {
  // Keep the exact log phrase Render shows in your logs
  console.log(`🚀 API listening on :${PORT}`);
});