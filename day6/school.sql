


DROP TABLE IF EXISTS enrolments;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS students;



CREATE TABLE students (
    student_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
);

CREATE TABLE courses (
    course_id INTEGER PRIMARY KEY,
    course_name TEXT NOT NULL,
    teacher TEXT NOT NULL
);

CREATE TABLE enrolments (
    enrolment_id INTEGER PRIMARY KEY,
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    grade TEXT,

    FOREIGN KEY (student_id)
        REFERENCES students(student_id),

    FOREIGN KEY (course_id)
        REFERENCES courses(course_id),

    UNIQUE (student_id, course_id)
);



INSERT INTO students (student_id, name, email) VALUES
(1, 'Tambo Prince', 'tambo@example.com'),
(2, 'Alice Smith', 'alice@example.com'),
(3, 'John Doe', 'john@example.com'),
(4, 'Mary Johnson', 'mary@example.com');

INSERT INTO courses (course_id, course_name, teacher) VALUES
(1, 'Database Systems', 'Mr. James'),
(2, 'Web Development', 'Ms. Grace'),
(3, 'Computer Networks', 'Mr. Peter');

INSERT INTO enrolments
    (enrolment_id, student_id, course_id, grade)
VALUES
(1, 1, 1, 'A'),
(2, 1, 2, 'B'),
(3, 2, 1, 'B'),
(4, 2, 3, 'A'),
(5, 3, 2, 'C');


SELECT s.name, c.course_name, e.grade
FROM students AS s
JOIN enrolments AS e
    ON s.student_id = e.student_id
JOIN courses AS c
    ON e.course_id = c.course_id
WHERE s.name = 'Tambo Prince';


SELECT c.course_name, s.name, s.email, e.grade
FROM courses AS c
JOIN enrolments AS e
    ON c.course_id = e.course_id
JOIN students AS s
    ON e.student_id = s.student_id
WHERE c.course_name = 'Database Systems';


SELECT
    c.course_name,
    COUNT(e.student_id) AS number_of_students
FROM courses AS c
LEFT JOIN enrolments AS e
    ON c.course_id = e.course_id
GROUP BY c.course_id, c.course_name;


SELECT s.student_id, s.name, s.email
FROM students AS s
LEFT JOIN enrolments AS e
    ON s.student_id = e.student_id
WHERE e.enrolment_id IS NULL;


UPDATE enrolments
SET grade = 'A'
WHERE enrolment_id = 5;


SELECT *
FROM enrolments
WHERE enrolment_id = 5;


CREATE INDEX idx_enrolments_course_id
ON enrolments(course_id);
