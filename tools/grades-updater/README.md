# Inserting Grade Distribution Data for PeterPortal

This folder contains scripts taking a preprocessed CSV file, sanitizing the data, and inserting it into a remote AWS RDS instance. Please read this file thoroughly before processing the grade distribution data from UCI's Public Records Office (PRO).

## Getting Started

### Sanitizing the Data

1. In this folder, create the `inputData` and `outputData` folders if not already
2. Take the spreadsheet from PRO, follow the format below, and save it as a CSV file to `inputData`

| year    | quarter | department | courseNumber | courseCode | instructors | a   | b   | c   | d   | f   | p   | np  | w   | gpaAvg |
| ------- | ------- | ---------- | ------------ | ---------- | ----------- | --- | --- | --- | --- | --- | --- | --- | --- | ------ |
| 2023-24 | Summer  | ...        | ...          | 12334      | ...         | 0   | 0   | 0   | 0   | 0   | 123 | 23  | 4   | 0      |
| ...     | ...     | ...        | ...          | ...        | ...         | ... | ... | ... | ... | ... | ... | ... | ... | ...    |

3. Run `npm i` on the project root directory
4. Run `npm i` in this directory
5. Execute `npm run sanitize` to start the program
6. Find your data under the `outputData` folder
   - If the program fails, then you may want to manually delete the entries that are already processed in the input file and merge the processed data and the rest together in a separate file once everything is done
   - All messages, warnings, and errors are listed in a log file located under `logs`

### Uploading the Data

1. Make sure all the entries under `outputData` match your expectations
2. Place the `.env` file given by the development team under the project root directory and run `npm i -g dotenv-cli`
3. Run `npm i`, `npm run db:generate`, `dotenv -e env_file -- npm run db:pull`, and `npm run db:generate` in `/db`
   - Replace `env_file` with the path to the `.env` file
4. Execute `npm run upload` to start the program
   - All messages, warnings, and errors are listed in a log file located under `logs`

## Acknowledgments

This project is made possible by University of California, Irvine's Public Records Office (PRO) and ICS Student Council (ICSSC).

## Contributors

- Benson Jing
- Yizhen Liu
- Ethan Wong
