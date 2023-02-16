import { createErrorResult, zeroUUID } from "api-core";
import express from "express";

import router from "./router";

const app = express();
const port = process.env.PORT || 8080;

app.set("query parser", "simple");
app.use(express.json());
app.use(router);

app.all("*", (req, res) => {
  res.status(404);
  res.send(
    createErrorResult(
      404,
      "The requested resource could not be found.",
      zeroUUID
    )
  );
});

app.listen(port, () => {
  console.log(
    `PeterPortal-API-Next development server listening on port ${port}`
  );
});
