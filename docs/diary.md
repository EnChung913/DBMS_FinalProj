[2025-11-04 16:32]
I established the baseline of the system, just including the student table and login, logout function. Using redis to store session information. Next step would be think the architecture of the whole system strcutrely so that I'll feel more comfortable when adding new features.

[2025-11-05 11:19]
I redesign the database schema so that I can develop the system more smoothly. Including considering some student that may have multiple departments (double major, minor, transfer history), so I add a new table to store the relationship between student and department.
The total system is relying on "user_id" as the primary key, so I use UUID to generate unique user_id for each user.

[2025-11-05 12:06]
I finish the final DDL of the database schema, which clearly defines all the tables and their relationships. It's a huge step for the project.

[2025-11-05 12:13]
I create the tables with schema.sql file in the PostgreSQL database, besides, leave a instruction in note.md on how to create the database from schema.sql file.

[2025-11-05 14:51]
I combine the login and register function into one single auth module, which makes the code structure more clear and easier to maintain.
I try to establish a simple frontend web site(pure html), but the bridge between frontend and backend is not done yet.

[2025-11-19 15:24]
I need to redesign the development plan. The first step should be the cli interface not the web interface. Still, the socket for vue communication is needed, but the frontend would be design later.

This system would be built on docker to sync the development environment.

[2025-11-21 01:53]
I constructed the whole file structure for docker. But it just contains some folders and empty files now, just a skeleton structure.

Next step would be generate the ORM model files and establish the docker environment and make sure the backend can run inside the docker container.

[2025-11-21 16:18]
I tried to establish a simple register function, but there's lot of bugs to fix.

WTF a typing error waste me a half hour to fix. I just wrote "cofig.py" instead of "config.py". Such a silly mistake.

There's still some errors in the relation rules of the ORM model, need to fix them later.
The problem is, our relationships are too complex, and some relationships are many-to-many relationships, which makes the ORM model confusing. Thus, I decided to remove the relationship rules in the ORM model, just utilize SQL to handle the relationships.

[2025-11-22 10:12]
This project is too complex with FastAPI. I decided to switch to NestJS for the backend. The old files are stored in the "backend_old" and compressed.

[2025-11-23 11:21]
Lyy finished a simple frontend interface of login and register, but she havn't connected the backend api yet. There's some error of the ports(the local psql and container's psql port are conflicted), so I changed the container's psql port to 6666, and redis port to 6667.

[2025-11-23 11:55]
Fix the env error of missing JWT_SECRET variable.

[2025-11-24 19:17]
I finish the connect between frontend and backend for the register function. The register function works well now. But I havn't finished the login function and JWT authentication yet.

[2025-11-24 19:53]
I put .env.local and .env.*.local into .gitignore so that my partners can't run the container smoothly. I commented these lines in .gitignore for now, but remember to uncomment them later.

[2025-11-24 23:56]
I wrote 7 hours today on this project. But there's still a lot of work to do. Next step would be finish the login function with JWT authentication. I have to spent more time on studying JWT.

[20285-11-25 22:43]
I've finished all the auth functions including register, login, logout and refresh token. The JWT authentication works well now. I utilize rotating refresh token strategy to enhance the security of the system. Besides, if frontend ask for a new access token, he sould also provide the expired access token and his refresh token to verify his identity.
Next step would be the student profile management functions.

[2025-11-26 10:18]
I decided to add 2FA function to enhance the security of the system. So I modified the user table to add otp_secret and is_2fa_enabled columns. The other function still needs more time to implement.

[2025-11-26 11:35]
There are several bugs after modifying the user entity. I fixed them one by one. I shouldn't push the temporary broken code to the main repository.

[2025-11-26 17:42]
I change the schema again, deleting the is_deleted boolean column and adding deleted_at timestamp column instead. This is more flexible for future use. If deleted_at is '9999-12-31 23:59:59', then the user is not deleted. Otherwise, the user is deleted. Besides, I'll design a function to automatically purge the deleted user after 1 year. This function would be placed at /modules/scheduler/tasks.

[2025-11-27 00:54]
I forgot to set JWT_SECRET in the generateToken function in auth.service.ts. This bug bothers me for several hours. Finally I found the problem and fixed it.

[2025-11-27 01:13]
There's an error of relation in student profile entity. I marked it and will fix it tomorrow. I'll merge the dev branch to main branch after fixing that bug.

[2025-11-27 11:55]
I tried hard to fix this, but still need some more time.

[2025-11-27 16:05]
Finally I fixed the problem, now I can upsert student profile by api calls. User has to manually add a default user and add this user's department in student_department table first, then he can upsert his profile because the foreign key constraint needs to be satisfied. It's a little bit inconvenient now, but in pratical there won't be such situation that start up with an empty databse.

[2025-11-27 22:32]
I decided to put JWT in http-only cookie, which means I cann't use the expiredAccess token and refresh token for double security check. But putting JWT in http-only cookie is more secure. Remember that this project should use HTTPS in production environment to enhance security. This should be mentioned in the report.

The user information previously stored in pinia, if the page is refreshed, the user information would be lost. So I add a function to load user information from localStorage when the app is initialized. This can enhance user experience. Besides, I finish the logout function in frontend. Now the JWTs would be deleted from http-only cookie when user logout, and the refresh token session would be deleted from redis too.

This branch is ready to merge to main branch, cheers!

[2025-11-28 11:12]
Starting a new branch to implement register function.

[2025-11-28 16:21]
I export the database to backup.sql, now anyone can restore the database from backup.sql to get the basic data.

[2025-11-28 17:05]
Now the register function works well. After registering, user would be automatically logged in, and the JWTs would be stored in http-only cookie.

[2025-11-29 00:13]
I finished the api call for upserting department profile. Next step would be the re-arrange of schema.sql (cascade function).

[2025-11-29 00:35]
Add a little function: limit the number of requests from same IP address in a certain time period to prevent brute-force attacks. (1000 requests per 10 minutes)

[2025-12-1 12:04]
From 11/4, this project has been developed for almost a month. Kill me....
I changed the schema.sql to add cascade delete function and some achievement functions. Now when a user is deleted, all his related profiles would be deleted automatically. 
Next step would be list the departments while registering.

Hope I can finish the whole project before the deadline.....

[2025-12-1 12:46]
I finished listing the departments while registering. User can select his department from a dropdown list. The department list is fetched from /api/common/departments api. Next step would be resource management functions.

Remember to fix the bug: 
src/modules/auth/auth.service.ts:153:28 - error TS2353: Object literal may only specify known properties, and 'user_id' does not exist in type 'FindOptionsWhere<DepartmentProfile> | FindOptionsWhere<DepartmentProfile>[]'.

153         .exists({ where: { user_id: user.user_id } });

[2025-12-1 22:36]
There's no need of checking profile setup for company and department role (this system is majorly for students), so I modified the auth.service.ts file to fix that bug.

There are lots of apis need to be implemented:
1. delete user account after soft delete 1 year
2. delete application after 30 days if the application is not accepted
3. assign another to be an admin v

I finished the assign admin function in common.service.ts. Admin can promote other users to be admin too.
e.g. promote username 'b12508025' to be admin can be done by calling this api:
``` api
http://localhost:3000/api/common/set-admin/b12508025
```

There's an issue in the schema that I forget to record the department_id or company_id in the user table. So that admin can't know which department or company he is managing. I need to modify the schema again, perhaps tomorrow. The schema should be modified and the generate code should be updated.

[2025-12-2 11:42]
Ok the schema is fine in this stage. Now I'm striving to finish the function that company can filter students by certain conditions.

To efficiently filter the students, I generate a materialized view named "student_search_mv" to store the searchable fields of student profile. This can greatly enhance the performance of filtering students.
Update the mv: REFRESH MATERIALIZED VIEW student_search_mv;

[2025-12-2 17:20]
I finish the student filtering function. Company can filter students by some conditions such as department, grade, gpa range, achievements, etc.
Now I want to try to implement the resource posting function.

A new function need to be added that department can set their student as poor student. 

If a user (department or company) wants to post a resource, he need to create a resource first, all resource are unavailable by default. Then the creator need to set its conditions in resource_condition table. This step, system would estimate how many students are eligible for this resource according to the conditions set by the creator. If the conditions are too strict that no student is eligible, the creator need to relax the conditions.

There should be a function that admin can add a new company. For departments, maybe later (perhaps useless).

I finished the resource condition setting function. Now department or company can create a resource and set its conditions. The analysis of eligible students wouild be done later.

[2025-12-3 00:31]
I generate the api manual with copilot.

[2025-12-3 00:35]
Next step would be the application of resource by students. I generated 3 entities, next day would be the api implementation.

[2025-12-3 13:15]
I export current database to backup.sql. Export the csv files of the database tables for testing purpose.

[2025-12-3 14:51]
The password of the generated data isn't 'ntu-2025-test'.....Waste me lot of time. I change it into '123456'
I finished the api of get students' gpa records.
If frontend ask for user data, the password field would be masked as '*********' for security reason.

[2025-12-3 21:11]
I fix the bug that usrt need to fill his profile again after next login even if he has filled it before. The problem is that in the auth.service.ts file, I only check if the student_profile exists, but forget to check if the department_profile exists. Now both of them are checked. Now I'm striving to finish the resource query and recommendation function.
I've finished the list resource api and optimized the frontend that it would show if the student is eligible for that resource. Next step would be the recommendation function.

[2025-12-3 01:26]
I'll try to implement the recommendation function. 
There are three rules for recommendation:
1. I have great advantage (my condition is better than other applicants)
2. What I've clicked before
3. What people like me clicked before
And the final score would be calculated by weighted sum of these three factors.

[2025-12-4 09:30]
I'm trying to implement the recommendation function. 

A test student
std_479_159067

I should add uuid to each condition. If a resource has multiple conditions, the system would find if there's any condition that matches the student's department. If so, applying this condition to this student. Otherwise, if there's no condition matching the student's department and there's a condition that doesn't has eligible department (which means this resource is for all departments), this condition would be applied to this student. If there's no condition matching the student's department and no condition for all departments, then this student is not eligible for this resource.

[2025-12-4 11:28]
I update the router of resource condition.

[2025-12-4 19:56]
I decide to remove the function that count eligible students. It's a minor funciton that I need to focus on the major functions first. Besides, now the frontend would store data in localStorage to enhance user experience. Utilize swagger to generate the api manual.

[2025-12-4 23:08]
I'm trying to implement the recommendation function. Now recording the click history of student on resources. The api of recording click would be /events/...  not /api/... to independently handle the rate limiting.
The rule of recommendation is, 

For pushing resource to student:
1. I have great advantage (my condition is better than other applicants)
2. What I've clicked before
3. What people like me clicked before
4. (new) Hot resources (most clicks in recent period)

For pushing student to company:
1. Students that the company has clicked before
2. Students that are similar to the students that the company has clicked before (based on department, gpa, grade, achievements, etc)
3. Hot students (most viewed in recent period)

A BIG TASK.
Timezone should be consider later.

I've finish the record click api and recommendation function for resources. I havn't test them yet.

I leverage wrk to test my rate limiting function. It works well.
(base) josh@josh-ubuntu:proj$ wrk -t12 -c400 -d30s \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5YjU0MWE4Ny03ZWVjLTQ3MGItYmFhZi1hMjZlOTUyMDYyYzkiLCJyb2xlIjoiY29tcGFueSIsImlhdCI6MTc2NDY1MTQ1MiwiZXhwIjoxNzY1NTE1NDUyfQ.9VioKGbyW9DR6xh7AT5eAFZrHYcEOJ7__WNVlr4Gg1M" \
  http://localhost:3000/api/resource/list
Running 30s test @ http://localhost:3000/api/resource/list
  12 threads and 400 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency    75.00ms  191.31ms   1.96s    94.28%
    Req/Sec   781.45    508.62     2.98k    65.52%
  160822 requests in 30.03s, 1.14GB read
  Socket errors: connect 0, read 0, write 0, timeout 366
  Non-2xx or 3xx responses: 159823
Requests/sec:   5355.46
Transfer/sec:     38.91MB

[2025-12-5 17:03]
I tried to implement the project to docker but failed. Need to study more about docker networking.

[2025-12-6 01:02]
I successfully established the docker environment for the whole project. Now everyone can run the whole system in docker container smoothly.
To rebuild the docker containers, just run:
``` shell
docker compose build
```
The command above would build images, to create and start containers, run:
``` shell
docker compose up
```

Here are the containers I want to add:
pgAdmin
Prometheus
Grafana
Loki
Autohealth

Perhaps I'll use GHCR to store the docker images. Of course I'll also provide the source code and Dockerfile for building the images locally.

[2025-12-6 13:40]
This is a test account for company
comp_8_683397
and for department
1010_host_629903

I'm trying to deploy a file upload function so that user can upload the cert. files to the system. Now this only applys on the achievement function, next step would be application.

I successfully implemented the file upload function for achievement. User can upload a cert. file while creating an achievement. The file would be stored in the server's local storage under /uploads/achievement/ folder. The file path would be stored in the database. Good news! 
Now I finished the get application and create application api. Student can apply for a resource now. Next step would be the company or the department to review the applications.

[2025-12-6 17:22]
This system should automatically delete the canceled applications after 30 days.
I've finished the cancel application api, but havn't finish the create application api yet. A little strange order.

[2025-12-6 18:56]
I deployed the application functions at sutdent.servece, this sholdn't occur, the functions should be placed in application.service. I'll test the cencel function after finishing the create application function.
This is a test student account:
std_479_159067
std_196_515035

I've finished the create application api. Now student can apply for a resource. Next step would be the company or department to review the applications.
Besides, I modify the design of the resource page, now if user clicks the "Apply" button, a modal would pop up to show the resource conditions and ask for confirmation. This can enhance user experience.
There should be a status attribute for user entity, the status can be 'active', 'suspended', 'deleted'. This can enhance the user management function, but this is a minor function. Resource page also need to be modified that hidden the resources that the student has applied. 

[2025-12-6 21:49]
Now I want to implement the 2FA function. I know it's a minor function but I want to take a rest now.
I've finished the apis for 2FA but Lyy thinks that we are running out of time, so I'll implement the 2FA function frontend later. Now I'm going to implement the review achievement function for department.

[2025-12-6 22:50]
If user cancel the application, the file uploaded would be deleted too. Great!
I finish the verify achievement api for department. Department can review the achievements uploaded by students. Next step would be the review application function for company and department.
Some details need to be improved later: the review ui should show the achievement title and description, the status of recognized should be green not gray.

[2025-12-7 13:16]
I add "last_modified" timestamp column to resource table to record the last modified time of a resource. If the resource is canceled for 1 month, the system would automatically delete this resource and all its related applications and conditions. This function would be implemented in the scheduled task module later.
There should be a function that the database prunges the soft deleted items each year after it makes a snapshot backup.

[2025-12-7 15:17]
I tried to implement the docker version of my project, especially for tyhe file upload function. Besides, I found that the resource condition function has some bugs: user can't upsert the condition by its id. 

[2025-12-7 22:48]
A hell of connect apis.

[2025-12-8 00:00]
There should be some scheduled tasks:
for purge
1. purge soft deleted users after 1 year
2. purge canceled applications after 1 year
3. purge canceled resources after 1 year
Before purging, the system should make a snapshot backup of the database.
for daily maintenance
1. refresh materialized view student_search_mv
2. update application status, if the deadline is passed, the status would be changee from 'submitted' to 'pending', and students can't cancel the application anymore.

I finished the review application function for company and department. Now they can review the applications submitted by students. Next step would be the scheduled tasks module.

[2025-12-8 16:15]
Continue to implement the apis for frontend.
I created a 2fa page. Now student and company can enable 2FA in their dashboard. I've finish the forgot password function with 2FA. Next step I want to deploy the account application of company or department.

[2025-12-8 20:05]
The containers successfully run on docker. But there are some issues with Loki, it need to be fixed later.
I still need to implement the user application function. Besides, the view of department review application havn't been done. But this can refer to the company review application view.

[2025-12-8 22:27]
I'm trying to connect the apis for department review application. Finish! Besides, the containers are running well on docker now. 
I've finished the scheduler module and optimized the push recommendation function.
Next step would be the user application function and place event apis to functions.
I found some test tools for nestjs and vuejs, I'll try to write some test cases later.

[2025-12-9 11:25]
Now I'm striving to finish the user application function. Now it's done 80%, I'll test it later. 