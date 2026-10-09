# School Database Design

## 1. Tables and Entities

### Students

The `students` table stores information about each student. It contains `student_id` as the primary key, `name`, and `email`. The email is required and unique so that two students cannot share the same email address.

### Courses

The `courses` table stores information about available courses. It contains `course_id` as the primary key, `course_name`, and `teacher`. Each course has its own unique identifier.

### Enrolments

The `enrolments` table records which students take which courses. It contains `enrolment_id` as the primary key, `student_id` and `course_id` as foreign keys, and `grade` to store the student's result. A unique constraint on `(student_id, course_id)` prevents duplicate enrolments.

## 2. Relationships

### One-to-Many Relationships

A student can have many enrolments, but each enrolment belongs to one student. This creates a one-to-many relationship between `students` and `enrolments`.

A course can also have many enrolments, but each enrolment belongs to one course. This creates a one-to-many relationship between `courses` and `enrolments`.

### Many-to-Many Relationship

Students and courses have a many-to-many relationship because one student can take multiple courses and one course can have multiple students.

The `enrolments` table acts as a join table connecting students and courses. It is necessary to represent this relationship and store additional information, such as each student's grade for a particular course.

## 3. Index

I would add an index on `enrolments(course_id)` to improve queries that find students enrolled in a particular course and queries that group enrolments by course. The unique constraint on `(student_id, course_id)` already creates an index that helps searches using the student ID as the first column.

## 4. SQL or NoSQL?

I would choose a relational SQL database such as SQLite for this school system. Students, courses, and enrolments have clearly defined relationships, and foreign keys help maintain data integrity. SQL supports JOIN operations, grouping, and counting, making it suitable for reporting on enrolments and grades. Transactions also help ensure that related database changes are handled reliably. A NoSQL database may be useful for flexible or rapidly changing data structures, but a relational database is a better fit for this structured system.
