-- UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-------------------------------------------------
-- Core user
-------------------------------------------------
CREATE TABLE "user" (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    real_name VARCHAR(50) NOT NULL,
    email VARCHAR(50) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(128) NOT NULL,
    nickname VARCHAR(50) NOT NULL,
    role VARCHAR(20) CHECK(role IN ('student','department','company')) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    otp_secret VARCHAR(64),
    is_2fa_enabled BOOLEAN DEFAULT FALSE,
    registered_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ DEFAULT '9999-12-31 23:59:59',
    company_id UUID,
    department_id VARCHAR(50)
);


CREATE TABLE user_application (
     application_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     real_name VARCHAR(50) NOT NULL,
     email VARCHAR(50) NOT NULL,
     username VARCHAR(50) NOT NULL,
     password VARCHAR(128) NOT NULL,
     nickname VARCHAR(50) NOT NULL,
     role VARCHAR(20) CHECK(role IN ('department','company')) NOT NULL,
     registered_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,


     status VARCHAR(20)
	 CHECK(status IN ('pending','approved','rejected'))
     DEFAULT 'pending',

     submit_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
     review_time TIMESTAMPTZ,
     reviewed_by UUID REFERENCES "user"(user_id),
     review_comment TEXT
);


-------------------------------------------------
-- Profile tables
-------------------------------------------------
CREATE TABLE department_profile (
    department_id VARCHAR(50) PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL,
    contact_person UUID NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE
);

CREATE TABLE student_profile (
    user_id UUID PRIMARY KEY REFERENCES "user"(user_id) ON DELETE CASCADE,
    student_id VARCHAR(10) UNIQUE NOT NULL,
    department_id VARCHAR(50) NOT NULL REFERENCES department_profile(department_id),
    entry_year INT NOT NULL,
    grade INT NOT NULL
);

CREATE TABLE company_profile (
    company_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(100) NOT NULL,
    contact_person UUID NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
    industry VARCHAR(50) NOT NULL
);

-------------------------------------------------
-- Student affiliation 
-------------------------------------------------
CREATE TABLE student_department (
    user_id UUID REFERENCES "user"(user_id) ON DELETE CASCADE,
    department_id VARCHAR(50) NOT NULL REFERENCES department_profile(department_id),
    role VARCHAR(20) CHECK(role IN ('major','minor','double_major')),
    start_semester VARCHAR(10) NOT NULL,
    end_semester VARCHAR(10),
    PRIMARY KEY(user_id, department_id, role, start_semester)
);

-------------------------------------------------
-- History: GPA / Courses
-------------------------------------------------
CREATE TABLE student_gpa (
    user_id UUID REFERENCES "user"(user_id) ON DELETE CASCADE,
    semester VARCHAR(10) NOT NULL,
    gpa FLOAT CHECK(gpa BETWEEN 0 AND 4.3),
    PRIMARY KEY(user_id, semester)
);

CREATE TABLE student_course_record (
    user_id UUID REFERENCES "user"(user_id) ON DELETE CASCADE,
    semester VARCHAR(10) NOT NULL,
    course_id VARCHAR(50) NOT NULL,
    course_name VARCHAR(100) NOT NULL,
    credit INT CHECK(credit BETWEEN 1 AND 4),
    score FLOAT CHECK(score BETWEEN 0 AND 4.3),
    PRIMARY KEY(user_id, semester, course_id)
);

-------------------------------------------------
-- Achievement (with intern category & date range)
-------------------------------------------------
CREATE TABLE achievement (
    achievement_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES "user"(user_id) ON DELETE CASCADE,
    category VARCHAR(20) CHECK(category IN ('Competition','Research','Intern','Project','Others')),
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) CHECK(status IN ('unrecognized','recognized','rejected')) NOT NULL
);

-------------------------------------------------
-- Achievement verification (NEW TABLE)
-------------------------------------------------
CREATE TABLE achievement_verification (
    verification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    achievement_id UUID REFERENCES achievement(achievement_id) ON DELETE CASCADE,
    
    verifier_type VARCHAR(20) CHECK(verifier_type IN ('department','company','professor')) NOT NULL,
    verifier_email VARCHAR(100) NOT NULL,
    
    verification_status VARCHAR(20)
        CHECK(verification_status IN ('pending','approved','rejected'))
        DEFAULT 'pending',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    decided_at TIMESTAMP
);

-------------------------------------------------
-- Resource 
-------------------------------------------------
CREATE TABLE resource (
    resource_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_type VARCHAR(20) 
        CHECK(resource_type IN ('Scholarship','Internship','Lab','Competition','Others')),
    quota INT NOT NULL CHECK(quota >= 0),
    supplier_id UUID REFERENCES "user"(user_id),
    title VARCHAR(100) NOT NULL,
    deadline DATE,
    description TEXT NOT NULL,
    status VARCHAR(20) CHECK(status IN ('Canceled','Unavailable','Available', 'Full')) NOT NULL DEFAULT 'Unavailable'
);

-------------------------------------------------
-- Eligibility rule
-------------------------------------------------
CREATE TABLE resource_condition (
    resource_id UUID REFERENCES resource(resource_id) ON DELETE CASCADE,
    department_id VARCHAR(50) NOT NULL REFERENCES department_profile(department_id),
    avg_gpa FLOAT CHECK(avg_gpa BETWEEN 0 AND 4.3),
    current_gpa FLOAT CHECK(current_gpa BETWEEN 0 AND 4.3),
    is_poor BOOLEAN,
    PRIMARY KEY(resource_id, department_id)
);

-------------------------------------------------
-- Application 
-- Add: resource_status_at_apply
-------------------------------------------------
CREATE TABLE application (
    user_id UUID REFERENCES "user"(user_id) ON DELETE CASCADE,
    resource_id UUID REFERENCES resource(resource_id) ON DELETE CASCADE,
    
    apply_date DATE DEFAULT CURRENT_DATE,
    
    review_status VARCHAR(20)
        CHECK(review_status IN ('submitted','under_review','approved','rejected'))
        NOT NULL,
    
    PRIMARY KEY(user_id, resource_id)
);

-------------------------------------------------
-- Push notification 
-------------------------------------------------
CREATE TABLE push_record (
    push_id SERIAL PRIMARY KEY,
    pusher_id UUID REFERENCES "user"(user_id) ON DELETE SET NULL,
    receiver_id UUID REFERENCES "user"(user_id) ON DELETE CASCADE,
    resource_id UUID REFERENCES resource(resource_id) ON DELETE CASCADE,
    push_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
