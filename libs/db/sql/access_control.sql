-- This file is used to control access to the API database.
-- You probably do not need to modify this.
ALTER DEFAULT PRIVILEGES IN SCHEMA dev
GRANT
SELECT
  ON TABLES TO public;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT
SELECT
  ON TABLES TO public;

CREATE ROLE api_staging_user LOGIN;

GRANT USAGE ON SCHEMA dev TO api_staging_user;

GRANT
SELECT
  ON ALL TABLES IN SCHEMA dev TO api_staging_user;

GRANT USAGE,
SELECT
  ON ALL SEQUENCES IN SCHEMA dev TO api_staging_user;

GRANT INSERT ON dev."CalendarTerm" TO api_staging_user;

CREATE ROLE api_prod_user LOGIN;

GRANT USAGE ON SCHEMA public TO api_prod_user;

GRANT
SELECT
  ON ALL TABLES IN SCHEMA public TO api_prod_user;

GRANT USAGE,
SELECT
  ON ALL SEQUENCES IN SCHEMA public TO api_prod_user;

GRANT INSERT ON public."CalendarTerm" TO api_prod_user;

CREATE ROLE api_websoc_scraper LOGIN;

GRANT USAGE ON SCHEMA public TO api_websoc_scraper;

GRANT USAGE,
SELECT
  ON ALL SEQUENCES IN SCHEMA public TO api_websoc_scraper;

GRANT
SELECT
,
  INSERT,
UPDATE,
DELETE ON public."WebsocEnrollmentHistoryEntry" TO api_websoc_scraper;

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
