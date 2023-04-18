import { createExpressHandler } from "api-core";
import { rawHandler as gradesHandler } from "api-route-grades";
import { rawHandler as websocHandler } from "api-route-websoc";
import { Router } from "express";

const router = Router();

// To add new routes, insert additional router.all calls below this comment.
// You should not need to touch anything else in this file,
// or any other file in this directory.
router.all("/v1/rest/grades/:id", createExpressHandler(gradesHandler));
const websocExpressHandler = createExpressHandler(websocHandler);
router.all("/v1/rest/websoc", websocExpressHandler);
router.all("/v1/rest/websoc/:option", websocExpressHandler);

export default router;
