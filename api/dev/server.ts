import { expressMiddleware } from "@apollo/server/express4";
import { createErrorResult, logger, zeroUUID } from "api-core";
import { graphqlServer } from "api-route-graphql";
import express from "express";

import router from "./router";

const app = express();
const port = process.env.PORT || 8080;

app.set("query parser", "simple");
app.use(express.json());
app.use(router);
graphqlServer.start().catch(() => {
  // noop
});
app.use("/v1/graphql", expressMiddleware(graphqlServer));

app.all("*", (req, res) => {
  logger.info(
    `${req.method} ${req.path} ${JSON.stringify(
      req.method === "GET" ? req.query : req.body
    )}`
  );
  const { statusCode, body, headers } = createErrorResult(
    logger,
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
