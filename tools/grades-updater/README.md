# Updating grade distribution data for PeterPortal
This folder contains scripts taking a preprocessed CSV file, sanitizing the data, and inserting it into a remote AWS RDS instance. It is a part of PeterPortal. Please read this file thoroughly before processing the grade distribution data from UCI's Public Records Office (PRO).

## Getting Started
1. Take the spreadsheet from PRO, follow the format below, and save it as a CSV file named `grades.csv` to this folder

  | year | quarter | department | courseNumber | courseCode | instructors | a | b | c | d | f | p | np | w | gpaAvg
  |--------|----------|----------------------------|--------------|------------|-------------|-------------|-------------|-------------|-------------|-------------|-------------|--------------|--------|-----------|
  | ...    | ...      | ...                        | ...          | ...        | ...         | ...         | ...         | ...         | ...         | ...         | ...         | ...         | ...          | ...    | | ...    | ...       |
2. Execute `npm i` in this folder
3. 

## Acknowledgments
It is made possible by UC Irvine's Public Records Office and ICS Student Council (ICSSC).

## Contributors
+ Benson Jing
+ Yizhen Liu
+ Ethan Wong
