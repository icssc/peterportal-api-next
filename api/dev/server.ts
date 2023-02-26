import { expressMiddleware } from "@apollo/server/express4";
import { createErrorResult, zeroUUID } from "api-core";
import { graphqlServer } from "api-route-graphql";
import express from "express";
import { createLogger, format, transports } from "winston";

import router from "./router";

const app = express();
const port = process.env.PORT || 8080;
const logger = createLogger({
  level: "info",
  format: format.combine(
    format.colorize({ all: true }),
    format.timestamp(),
    format.printf((info) => `${info.timestamp} [${info.level}] ${info.message}`)
  ),
  transports: [new transports.Console()],
  exitOnError: false,
});

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
