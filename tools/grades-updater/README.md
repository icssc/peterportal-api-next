# grades-updater

This directory contains the code for updating the grades cache for PeterPortal API _Next_.

## Sanitizing the Data

1. Make sure all dependencies are up-to-date by running `pnpm i` in the project root.
2. Create the `inputData` and `outputData` directories if they do not already exist.
3. Using a spreadsheet editor, edit the grades spreadsheet you obtained from the [UCI Public Records Office](https://pro.uci.edu/) so that it matches the following format, and then save it as a CSV in `inputData`.

| year    | quarter | department | courseNumber | courseCode | instructors | a   | b   | c   | d   | f   | p   | np  | w   | gpaAvg |
| ------- | ------- | ---------- | ------------ | ---------- | ----------- | --- | --- | --- | --- | --- | --- | --- | --- | ------ |
| 2022-23 | Summer  | ...        | ...          | 12345      | ...         | 1   | 0   | 0   | 0   | 0   | 2   | 0   | 3   | 4.00   |
| ...     | ...     | ...        | ...          | ...        | ...         | ... | ... | ... | ... | ... | ... | ... | ... | ...    |

4. Run `pnpm sanitize`.
5. The data should be present in the `outputData` directory, and logs under `logs`.
   - If for some reason the sanitization process failed, the processed data in the `outputData` directory may be incomplete. You may need to remove the processed entries from the input file, and manually merge the processed data.

## Uploading the Data

1. Make sure there are no major issues with the sanitized data in `outputData`.
2. Add the `.env.grades` file to the project root. Note that this is only available to members of the ICSSC Projects Committee, since it grants write access to the production database.
3. Run `pnpm upload` in this directory.
4. The logs should be present under `/logs`.

## Populating GE data

During the sanitization process, the data that encodes what GE categor(y/ies) is not fetched. This can be remedied by running `pnpm populate` after uploading the data.
