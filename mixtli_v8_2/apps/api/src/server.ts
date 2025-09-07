import { app, PORT } from "./app.js";
app.listen(PORT, () => {
  console.log(`🚀 API listening on :${PORT}`);
});
