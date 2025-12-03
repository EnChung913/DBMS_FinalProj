# notes

- At psql cli
``` sql
-- list dbs: 
\l
-- connect to db: 
\c <db_name>
-- e.g.
\c group_7

-- list tables: 
\dt

-- call system command: 
\! <command>
-- e.g. 
\! clear
```
- schema draft
user(user_id PK, real_name, email, username, password, nickname, role, is_admin, registered_at, is_deleted)

student_profile(user_id FK→user, student_id, department_id, entry, grade)
department_profile(user_id FK→user, department_id, department_name)
company_profile(user_id FK→user, company_name, contact_person, industry)

student_department(user_id FK→user, department_id, role, start_semester, end_semester)
student_gpa(user_id FK→user, semester, gpa)
student_course_record(user_id FK→user, semester, course_id, score)
achievement(achievement_id PK, user_id FK→user, category, title, description, creation_date, status)
resource(resource_id PK, resource_type, quota, supplier_id FK→user, title, deadline, description, email, status, is_deleted)
resource_condition(resource_id FK→resource, department_id, avg_gpa, current_gpa, is_poor)

application(user_id FK→user, resource_id FK→resource, apply_date, status)

push_record(push_id PK, pusher_id FK→user, student_id FK→user, resource_id FK→resource, push_datetime)

- How to create the database from schema.sql

0. let your location be the folder where schema.sql is located

1. connect to db
``` bash
sudo -u postgres psql
```
2. execute sql file
``` bash
CREATE DATABASE group_7;
\c group_7;

\i schema.sql
```

src/modules/
  auth/                     # 身分驗證（登入/註冊/JWT）
  user/                     # 基本使用者資料（不分角色）
  student/                  # 學生 Domain
      profile/              # student_profile
      application/          # 申請資源
      achievement/          # 上傳成就
  department/               # 校方使用者 Profile
  company/                  # 企業 Profile
  resource/                 # 資源主功能
      resource-condition/   # 資源條件
  push/                     # 推播推薦
  admin/                    # 管理員治理層（最大權限）


I remove all the old codes and start a new project structure as above.
Here are some commands:

To rebuild the whole docker environment from scratch:()
``` bash
sudo docker compose down --volumes
sudo docker compose build --no-cache
sudo docker compose up -d
```

modify code
``` bash
sudo docker compose restart backend
```

update the backend requirements.txt:
``` bash
sudo docker compose build backend
sudo docker compose up -d
```

modify Dockerfile               
``` bash
sudo docker compose build --no-cache backend
sudo docker compose up -d
``` 

- Anyone who wants to test this project should follow these steps to generate basic data in the database

``` sql
insert into "user" (real_name, email, username, password, nickname, role)
values ('bmeHost', 'bme@example.com', 'bmeHost', '123456789', 'bmeHost', 'department'),
 ('csHost', 'cs@example.com', 'csHost', '123456789', 'csHost', 'department'),
 ('tsmcHost', 'tsmc@example.com', 'tsmcHost', '123456789', 'tsmcHost', 'company'),
 ('711Host', '711@example.com', '711Host', '123456789', '711Host', 'company');

insert into "department_profile"(department_id, department_name, contact_person)
values (5080, 'BME', '41b7a321-6e43-4b88-ba2e-29d54bfa3fc8');
values (9020, 'CS', '303ac774-7f03-4863-85b1-3382fa4a52ca');

insert into "company_profile"(company_name, contact_person, industry)
values ('tsmc', '61255770-b939-4d4b-815f-55a0f70abee2', 'IC'),
 ('711', '250ab829-efe5-4243-8d4e-df6b4780d244', 'Retail Store');
 ```
 Note that the department_id and contact_person should match the actual user_id in your database. You can find them by querying the user table.
 ``` sql
select user_id, real_name from "user";
 ```

 For more details, this is a section cited from diary.md:
> [2025-11-27 16:05]
Finally I fixed the problem, now I can upsert student profile by api calls. User has to manually add a default user and add this user's department in student_department table first, then he can upsert his profile because the foreign key constraint needs to be satisfied. It's a little bit inconvenient now, but in pratical there won't be such situation that start up with an empty databse.

You can check the whole change log in diary.md for more details.

## To reset the database to a clean state

- remove all docker and start from scratch
``` bash
docker compose down
docker volume rm dbms_finalproj_group7_pgdata
docker compose up -d db redis
```

- restore database from backup.sql
```bash
docker exec -i group7_psql psql -U postgres -d group7_db < backup.sql
```

- set superadmin
```bash
update "user" set is_admin=true where username='b12508026';
```

## Insert data into database
``` bash
docker cp insert_.sql group7_psql:/tmp/
docker exec -it group7_psql psql -U postgres -d group7_db -f /tmp/insert_.sql
docker exec group7_psql rm /tmp/xxxxx.sql 
docker exec group7_psql rm -rf /tmp/*
docker exec group7_psql ls /tmp 
```

## Here are some test accounts:

- company user

user_id: 9b541a87-7eec-470b-baaf-a26e952062c9 
real_name: 公司測試 
email: josh@mail.com
username: testcompany
password: 123456
nickname: testc 
role: company 

## Misc notes
UPDATE public.user AS u
SET company_id = c.company_id
FROM public.company_profile AS c
WHERE u.user_id = c.contact_person;

UPDATE public.user AS u
SET department_id = d.department_id
FROM public.department_profile AS d
WHERE u.user_id = d.contact_person;

