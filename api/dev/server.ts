import { createErrorResult, logger, zeroUUID } from "api-core";
import { expressHandlerFactory } from "api-route-graphql";
import cors from "cors";
import express from "express";

import router from "./router";

const app = express();
const port = process.env.API_PORT || 8080;

app.set("query parser", "simple");
app.use(express.json());
app.use(router);
app.use("/v1/graphql", cors(), expressHandlerFactory());

app.all("*", (req, res) => {
  logger.info(
    `${req.method} ${req.path} ${JSON.stringify(
      req.method === "GET" ? req.query : req.body
    )}`
  );
  const { statusCode, body, headers } = createErrorResult(
    404,
    "The requested resource could not be found.",
    zeroUUID
  );
  res.status(statusCode).set(headers).json(JSON.parse(body));
});

app.listen(port, () => {
  logger.info(
    `PeterPortal-API-Next development server listening on port ${port}`
  );
});
