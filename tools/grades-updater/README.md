# Inserting/updating grade distribution data for PeterPortal
This folder contains scripts taking a preprocessed CSV file, sanitizing the data, and inserting it into a remote AWS RDS instance. It is a part of PeterPortal. Please read this file thoroughly before processing the grade distribution data from UCI's Public Records Office (PRO).

## Getting Started
### Sanitizing the data
1. Create two folders named `inputData` and `outputData` in this directory if not already
2. Take the spreadsheet from PRO, follow the format below, and save it as a CSV file to `inputData`

  | year | quarter | department | courseNumber | courseCode | instructors | a | b | c | d | f | p | np | w | gpaAvg
  |--------|----------|----------------------------|--------------|------------|-------------|-------------|-------------|-------------|-------------|-------------|-------------|--------------|--------|-----------|
  | ...    | ...      | ...                        | ...          | ...        | ...         | ...         | ...         | ...         | ...         | ...         | ...         | ...         | ...          | ...    | | ...    | ...       |
3. Run `npm i` in this folder
4. Execute `npm run sanitize` to execute the program
5. Find your data under the `outputData` folder
   + If the program fails, then you may want to manually delete the entries that are already processed in the input file and merge the processed data and the rest together in a separate file once the rest is processed.
   + All messages, warnings, and errors in the process are listed in a log file located under `logs`

### Uploading the data

## Acknowledgments
It is made possible by UC Irvine's Public Records Office and ICS Student Council (ICSSC).

## Contributors
+ Benson Jing
+ Yizhen Liu
+ Ethan Wong
