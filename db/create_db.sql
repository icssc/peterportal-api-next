DROP
  DATABASE IF EXISTS peterportal_api_next_prod;

CREATE DATABASE peterportal_api_next_prod;

USE peterportal_api_next_prod;

CREATE TABLE
  departments (
    department_id VARCHAR(7) PRIMARY KEY,
    department_name VARCHAR(191) UNIQUE NOT NULL
  );

CREATE TABLE
  ge_categories (
    ge_full_name VARCHAR(36) AS (CONCAT ('GE ', ge_id, ': ', ge_name)) VIRTUAL,
    ge_id VARCHAR(4) NOT NULL UNIQUE,
    ge_name VARCHAR(28) NOT NULL UNIQUE,
    PRIMARY KEY (ge_id, ge_name)
  );

CREATE TABLE
  instructors (
    ucinetid VARCHAR(8) PRIMARY KEY,
    instructor_name VARCHAR(191) NOT NULL UNIQUE,
    shortened_name VARCHAR(191) NOT NULL UNIQUE,
    title VARCHAR(191) NOT NULL UNIQUE,
    department VARCHAR(191) NOT NULL UNIQUE
  );

CREATE TABLE
  schools (school_name VARCHAR(191) PRIMARY KEY);

CREATE TABLE
  terms (
    term_name VARCHAR(15) AS (CONCAT (term_year, ' ', term_quarter)) STORED UNIQUE,
    term_year VARCHAR(4) NOT NULL,
    term_quarter VARCHAR(10) NOT NULL,
    CHECK (
      term_quarter IN (
        'Fall',
        'Winter',
        'Spring',
        'Summer1',
        'Summer10wk',
        'Summer2'
      )
    ),
    PRIMARY KEY (term_year, term_quarter)
  );

CREATE TABLE
  courses (
    course_id VARCHAR(191) PRIMARY KEY,
    department VARCHAR(7) NOT NULL,
    course_number VARCHAR(191) NOT NULL,
    school VARCHAR(191) NOT NULL,
    title VARCHAR(191) NOT NULL,
    course_level VARCHAR(33) NOT NULL,
    minimum_units VARCHAR(5) NOT NULL,
    maximum_units VARCHAR(5) NOT NULL,
    course_description TEXT NOT NULL,
    department_name VARCHAR(191) NOT NULL,
    prerequisite_tree JSON NOT NULL,
    prerequisite_text TEXT NOT NULL,
    repeatability VARCHAR(191) NOT NULL,
    grading_option VARCHAR(191) NOT NULL,
    concurrent_with VARCHAR(191) NOT NULL,
    same_as VARCHAR(191) NOT NULL,
    restriction VARCHAR(191) NOT NULL,
    overlap VARCHAR(191) NOT NULL,
    corequisite VARCHAR(191) NOT NULL,
    ge_text TEXT NOT NULL,
    CHECK (
      course_level IN (
        'Lower Division (1-99)',
        'Upper Division (100-199)',
        'Graduate/Professional Only (200+)'
      )
    ),
    FOREIGN KEY (department) REFERENCES departments (department_id),
    FOREIGN KEY (school) REFERENCES schools (school_name),
    FOREIGN KEY (department_name) REFERENCES departments (department_name)
  );

CREATE TABLE
  course_history (
    course_id VARCHAR(191) NOT NULL,
    instructor_ucinetid VARCHAR(8) NOT NULL,
    term_name VARCHAR(15) NOT NULL,
    FOREIGN KEY (course_id) REFERENCES courses (course_id),
    FOREIGN KEY (instructor_ucinetid) REFERENCES instructors (ucinetid),
    FOREIGN KEY (term_name) REFERENCES terms (term_name),
    PRIMARY KEY (course_id, instructor_ucinetid, term_name)
  );

CREATE TABLE
  grades (
    academic_year INT UNSIGNED NOT NULL,
    academic_quarter VARCHAR(10) NOT NULL,
    department VARCHAR(7) NOT NULL,
    course_number VARCHAR(191) NOT NULL,
    course_code INT UNSIGNED NOT NULL,
    grade_a_count INT UNSIGNED NOT NULL,
    grade_b_count INT UNSIGNED NOT NULL,
    grade_c_count INT UNSIGNED NOT NULL,
    grade_d_count INT UNSIGNED NOT NULL,
    grade_f_count INT UNSIGNED NOT NULL,
    grade_p_count INT UNSIGNED NOT NULL,
    grade_np_count INT UNSIGNED NOT NULL,
    grade_w_count INT UNSIGNED NOT NULL,
    average_gpa DOUBLE NOT NULL,
    pnp_only BOOL AS (
      grade_a_count = 0
      AND grade_b_count = 0
      AND grade_c_count = 0
      AND grade_d_count = 0
      AND grade_f_count = 0
    ) VIRTUAL,
    CHECK (
      academic_quarter IN (
        'Fall',
        'Winter',
        'Spring',
        'Summer1',
        'Summer10wk',
        'Summer2'
      )
    ),
    CHECK (
      course_code >= 0
      AND course_code <= 99999
    ),
    PRIMARY KEY (academic_year, academic_quarter, course_code)
  );

CREATE TABLE
  grades_instructors_mappings (
    academic_year INT UNSIGNED NOT NULL,
    academic_quarter VARCHAR(10) NOT NULL,
    course_code INT UNSIGNED NOT NULL,
    instructor VARCHAR(50) NOT NULL,
    FOREIGN KEY (academic_year, academic_quarter, course_code) REFERENCES grades (academic_year, academic_quarter, course_code),
    PRIMARY KEY (
      academic_year,
      academic_quarter,
      course_code,
      instructor
    )
  );

CREATE TABLE
  department_mappings (
    instructor_ucinetid VARCHAR(8) NOT NULL,
    department_id VARCHAR(7) NOT NULL,
    FOREIGN KEY (instructor_ucinetid) REFERENCES instructors (ucinetid),
    FOREIGN KEY (department_id) REFERENCES departments (department_id),
    PRIMARY KEY (instructor_ucinetid, department_id)
  );

CREATE TABLE
  ge_mappings (
    course_id VARCHAR(191) NOT NULL,
    ge_id VARCHAR(4) NOT NULL,
    FOREIGN KEY (ge_id) REFERENCES ge_categories (ge_id),
    PRIMARY KEY (course_id, ge_id)
  );

CREATE TABLE
  prerequisite_mappings (
    course_id VARCHAR(191) NOT NULL,
    for_id VARCHAR(191) NOT NULL,
    FOREIGN KEY (course_id) REFERENCES courses (course_id),
    FOREIGN KEY (for_id) REFERENCES courses (course_id),
    PRIMARY KEY (course_id, for_id)
  );

CREATE TABLE
  school_mappings (
    instructor_ucinetid VARCHAR(8) NOT NULL,
    school_name VARCHAR(191) NOT NULL,
    FOREIGN KEY (instructor_ucinetid) REFERENCES instructors (ucinetid),
    FOREIGN KEY (school_name) REFERENCES schools (school_name),
    PRIMARY KEY (instructor_ucinetid, school_name)
  );
