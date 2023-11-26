-- This file is used to control access to the API database.
-- You probably do not need to modify this.
ALTER DEFAULT PRIVILEGES IN SCHEMA dev GRANT
SELECT
  ON TABLES TO public;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT
SELECT
  ON TABLES TO public;

CREATE ROLE api_staging_user LOGIN;

GRANT INSERT ON dev."CalendarTerm" TO api_staging_user;

CREATE ROLE api_prod_user LOGIN;

GRANT INSERT ON public."CalendarTerm" TO api_prod_user;

CREATE ROLE api_grades_updater LOGIN;

GRANT
SELECT
,
  INSERT,
UPDATE,
DELETE ON public."GradesInstructor" TO api_grades_updater;

GRANT
SELECT
,
  INSERT,
UPDATE,
DELETE ON public."GradesSection" TO api_grades_updater;

CREATE ROLE api_registrar_scraper LOGIN;

GRANT
SELECT
,
  INSERT,
UPDATE,
DELETE ON public."Course" TO api_registrar_scraper;

GRANT
SELECT
,
  INSERT,
UPDATE,
DELETE ON public."Instructor" TO api_registrar_scraper;

CREATE ROLE api_websoc_scraper LOGIN;

GRANT
SELECT
,
  INSERT,
UPDATE,
DELETE ON public."WebsocEnrollmentHistory" TO api_websoc_scraper;

GRANT
SELECT
,
  INSERT,
UPDATE,
DELETE ON public."WebsocSection" TO api_websoc_scraper;

GRANT
SELECT
,
  INSERT,
UPDATE,
DELETE ON public."WebsocSectionInstructor" TO api_websoc_scraper;

GRANT
SELECT
,
  INSERT,
UPDATE,
DELETE ON public."WebsocSectionMeeting" TO api_websoc_scraper;

GRANT
SELECT
,
  INSERT,
UPDATE,
DELETE ON public."WebsocSectionMeetingBuilding" TO api_websoc_scraper;
