import { createExpressHandler } from "api-core";
import { rawHandler as calendarHandler } from "api-route-calendar";
import { rawHandler as coursesHandler } from "api-route-courses";
import { rawHandler as gradesHandler } from "api-route-grades";
import { rawHandler as larcHandler } from "api-route-larc";
import { rawHandler as websocHandler } from "api-route-websoc";
import { Router } from "express";

/**
 * "The inferred type of router cannot be named without a reference ..."
 * @see https://github.com/microsoft/TypeScript/issues/42873
 */
const router: ReturnType<typeof Router> = Router();

// To add new routes, insert additional router.all calls below this comment.
// You should not need to touch anything else in this file,
// or any other file in this directory.
router.all("/v1/rest/calendar", createExpressHandler(calendarHandler));
router.all("/v1/rest/courses/:id", createExpressHandler(coursesHandler));
router.all("/v1/rest/grades/:id", createExpressHandler(gradesHandler));
const websocExpressHandler = createExpressHandler(websocHandler);
router.all("/v1/rest/websoc", websocExpressHandler);
router.all("/v1/rest/websoc/:option", websocExpressHandler);
router.all("/v1/rest/larc", createExpressHandler(larcHandler));

export default router;
