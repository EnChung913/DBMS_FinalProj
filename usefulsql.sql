SELECT s.student_id, cr.*
FROM "student_course_record" as cr
	JOIN student_profile as s USING(user_id)	
WHERE s.student_id = 'B13A01027'
order by user_id

SELECT *
FROM "department_profile"

SELECT *
FROM "student_gpa" as d
	JOIN student_profile as s USING(user_id)
order by s.student_id, semester

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

SELECT u.student_id, r.title, r.quota, r.deadline, r.status, a.apply_date, a.review_status
FROM "application" as a
	JOIN student_profile AS u ON u.user_id = a.user_id
	JOIN resource as r ON r.resource_id = a.resource_id
ORDER BY r.title

SELECT *
FROM "application"

SELECT r.*
FROM "resource" AS r

SELECT u.student_id, a.*
FROM "achievement" as a
	JOIN student_profile AS u ON u.user_id = a.user_id
ORDER BY u.student_id


SELECT *
FROM "push_record" as a

SELECT u.student_id, a.*
FROM "push_record" as a
	JOIN student_profile AS u ON u.user_id = a.receiver_id
ORDER BY push_id

SELECT r.*, rc.*
FROM "resource" AS r
	JOIN "resource_condition" AS rc USING(resource_id)
WHERE rc.department_id = '5080'

SELECT *
FROM "user" as u
WHERE u.role = 'department' or u.role = 'company'
order by user_id

SELECT *
FROM user_application
WHERE status = 'rejected' or status = 'pending'
order by submit_time

SELECT *
FROM achievement
WHERE  status = 'recognized' or status = 'rejected' or status = 'unrecognized'
order by creation_date

SELECT a.user_id, a.category, a.title, a.status as ach_status, av.verification_status as ver_status
FROM achievement as a
	JOIN achievement_verification as av using(achievement_id)
WHERE  a.status = 'rejected' or status = 'unrecognized'
order by a.achievement_id


--TRUNCATE TABLE "user" RESTART IDENTITY CASCADE;
--DROP SCHEMA public CASCADE; CREATE SCHEMA public;
