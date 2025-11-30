SELECT s.student_id, cr.*
FROM "student_course_record" as cr
	JOIN student_profile as s USING(user_id)	
WHERE s.student_id LIKE 'B125%'
order by user_id

SELECT *
FROM "department_profile"

SELECT *
FROM "student_gpa" as d
	JOIN student_profile as s USING(user_id)
order by s.student_id

SELECT s.student_id, cr.*
FROM "student_department" as cr
	JOIN student_profile as s USING(user_id)
order by s.student_id

SELECT *
FROM "company_profile"
order by company_name

SELECT *
FROM "student_profile"
ORDER BY department_id, grade

SELECT u.student_id, r.title, r.quota, r.deadline, a.apply_date, a.status
FROM "application" as a
	JOIN student_profile AS u ON u.user_id = a.user_id
	JOIN resource as r ON r.resource_id = a.resource_id
ORDER BY r.title

SELECT r.*, s.company_name, u.department_name 
FROM "resource" AS r
	LEFT JOIN department_profile AS u ON u.department_id = r.department_supplier_id
	LEFT JOIN company_profile AS s ON s.company_id = r.company_supplier_id

SELECT u.student_id, a.*
FROM "achievement" as a
	JOIN student_profile AS u ON u.user_id = a.user_id
ORDER BY u.student_id

SELECT u.student_id, a.*
FROM "push_record" as a
	JOIN student_profile AS u ON u.user_id = a.receiver_id
ORDER BY push_id

SELECT *
FROM "resource_condition"
WHERE department_id = '5080'

SELECT *
FROM "user"
--TRUNCATE TABLE "user" RESTART IDENTITY CASCADE;
