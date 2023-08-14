const missingDepartments: Record<string, string> = {
  DATA: "Donald Bren School of Information and Computer Sciences",
  ECPS: "Interdisciplinary Studies",
  EHS: "Program in Public Health",
  FIN: "The Paul Merage School of Business",
  GDIM: "Donald Bren School of Information and Computer Sciences",
  "NET SYS": "Interdisciplinary Studies",
  ROTC: "Division of Undergraduate Education",
  UCDC: "Division of Undergraduate Education",
  "UNI AFF": "Division of Undergraduate Education",
  "UNI STU": "Division of Undergraduate Education",
  SPPS: "School of Social Sciences",
};

export default new Map(Object.entries(missingDepartments));
