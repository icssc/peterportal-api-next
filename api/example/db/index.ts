import {
  createErrorResult,
  createLambdaHandler,
  createOKResult,
  IRequest,
} from "api-core";
import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { PrismaClient } from "db";
import { createLogger, format, transports } from "winston";

export const rawHandler = async (
  request: IRequest
): Promise<APIGatewayProxyResult> => {
  const devFormat = format.combine(
    format.colorize({ all: true }),
    format.timestamp(),
    format.printf((info) => `${info.timestamp} [${info.level}] ${info.message}`)
  );
  const prodFormat = format.printf((info) => `[${info.level}] ${info.message}`);
  const logger = createLogger({
    level: "info",
    format: process.env.NODE_ENV === "development" ? devFormat : prodFormat,
    transports: [new transports.Console()],
    exitOnError: false,
  });
  const { method, path, requestId } = request.getParams();
  const prisma = new PrismaClient();
  switch (method) {
    case "GET":
    case "HEAD":
      return createOKResult(logger, {}, requestId);
    default:
      return createErrorResult(
        logger,
        400,
        `Cannot ${method} ${path}`,
        requestId
      );
  }
};

export const lambdaHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> =>
  createLambdaHandler(rawHandler)(event, context);
