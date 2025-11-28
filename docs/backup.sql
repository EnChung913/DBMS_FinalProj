--
-- PostgreSQL database dump
--

\restrict lRSdeyPddW3bWmK4qe5gUEaULJT6gsVQ1KQKTi8Oo56IkNGo0WeiqghCSkmwjtI

-- Dumped from database version 16.11 (Debian 16.11-1.pgdg13+1)
-- Dumped by pg_dump version 16.11 (Debian 16.11-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: achievement; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.achievement (
    achievement_id integer NOT NULL,
    user_id uuid,
    category character varying(20),
    title character varying(100) NOT NULL,
    description text NOT NULL,
    creation_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(20) NOT NULL,
    CONSTRAINT achievement_category_check CHECK (((category)::text = ANY ((ARRAY['Competition'::character varying, 'Research'::character varying, 'Others'::character varying])::text[]))),
    CONSTRAINT achievement_status_check CHECK (((status)::text = ANY ((ARRAY['unrecognized'::character varying, 'recognized'::character varying, 'rejected'::character varying])::text[])))
);


ALTER TABLE public.achievement OWNER TO postgres;

--
-- Name: achievement_achievement_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.achievement_achievement_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.achievement_achievement_id_seq OWNER TO postgres;

--
-- Name: achievement_achievement_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.achievement_achievement_id_seq OWNED BY public.achievement.achievement_id;


--
-- Name: application; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.application (
    user_id uuid NOT NULL,
    resource_id uuid NOT NULL,
    apply_date date DEFAULT CURRENT_DATE,
    status character varying(20) NOT NULL,
    CONSTRAINT application_status_check CHECK (((status)::text = ANY ((ARRAY['submitted'::character varying, 'under_review'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))
);


ALTER TABLE public.application OWNER TO postgres;

--
-- Name: company_profile; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.company_profile (
    company_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_name character varying(100) NOT NULL,
    contact_person uuid NOT NULL,
    industry character varying(50) NOT NULL
);


ALTER TABLE public.company_profile OWNER TO postgres;

--
-- Name: department_profile; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.department_profile (
    department_id character varying(10) NOT NULL,
    department_name character varying(100) NOT NULL,
    contact_person uuid NOT NULL
);


ALTER TABLE public.department_profile OWNER TO postgres;

--
-- Name: push_record; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.push_record (
    push_id integer NOT NULL,
    pusher_id uuid,
    receiver_id uuid,
    resource_id uuid,
    push_datetime timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.push_record OWNER TO postgres;

--
-- Name: push_record_push_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.push_record_push_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.push_record_push_id_seq OWNER TO postgres;

--
-- Name: push_record_push_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.push_record_push_id_seq OWNED BY public.push_record.push_id;


--
-- Name: resource; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.resource (
    resource_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    resource_type character varying(20),
    quota integer NOT NULL,
    department_supplier_id character varying(10),
    company_supplier_id uuid,
    title character varying(100) NOT NULL,
    deadline date,
    description text NOT NULL,
    status character varying(20) NOT NULL,
    is_deleted boolean DEFAULT false,
    CONSTRAINT resource_check CHECK ((((department_supplier_id IS NOT NULL) AND (company_supplier_id IS NULL)) OR ((department_supplier_id IS NULL) AND (company_supplier_id IS NOT NULL)))),
    CONSTRAINT resource_quota_check CHECK ((quota >= 0)),
    CONSTRAINT resource_resource_type_check CHECK (((resource_type)::text = ANY ((ARRAY['Scholarship'::character varying, 'Internship'::character varying, 'Lab'::character varying, 'Others'::character varying])::text[]))),
    CONSTRAINT resource_status_check CHECK (((status)::text = ANY ((ARRAY['Canceled'::character varying, 'Unavailable'::character varying, 'Available'::character varying])::text[])))
);


ALTER TABLE public.resource OWNER TO postgres;

--
-- Name: resource_condition; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.resource_condition (
    resource_id uuid NOT NULL,
    department_id character varying(10) NOT NULL,
    avg_gpa double precision,
    current_gpa double precision,
    is_poor boolean,
    CONSTRAINT resource_condition_avg_gpa_check CHECK (((avg_gpa >= (0)::double precision) AND (avg_gpa <= (4.3)::double precision))),
    CONSTRAINT resource_condition_current_gpa_check CHECK (((current_gpa >= (0)::double precision) AND (current_gpa <= (4.3)::double precision)))
);


ALTER TABLE public.resource_condition OWNER TO postgres;

--
-- Name: student_course_record; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_course_record (
    user_id uuid NOT NULL,
    semester character varying(10) NOT NULL,
    course_id character varying(50) NOT NULL,
    course_name character varying(100) NOT NULL,
    score double precision,
    CONSTRAINT student_course_record_score_check CHECK (((score >= (0)::double precision) AND (score <= (100)::double precision)))
);


ALTER TABLE public.student_course_record OWNER TO postgres;

--
-- Name: student_department; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_department (
    user_id uuid NOT NULL,
    department_id character varying(10) NOT NULL,
    role character varying(20) NOT NULL,
    start_semester character varying(10) NOT NULL,
    end_semester character varying(10),
    CONSTRAINT student_department_role_check CHECK (((role)::text = ANY ((ARRAY['major'::character varying, 'minor'::character varying, 'double_major'::character varying])::text[])))
);


ALTER TABLE public.student_department OWNER TO postgres;

--
-- Name: student_gpa; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_gpa (
    user_id uuid NOT NULL,
    semester character varying(10) NOT NULL,
    gpa double precision,
    CONSTRAINT student_gpa_gpa_check CHECK (((gpa >= (0)::double precision) AND (gpa <= (4.3)::double precision)))
);


ALTER TABLE public.student_gpa OWNER TO postgres;

--
-- Name: student_profile; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_profile (
    user_id uuid NOT NULL,
    student_id character varying(10) NOT NULL,
    department_id character varying(10) NOT NULL,
    entry_year integer NOT NULL,
    grade integer NOT NULL
);


ALTER TABLE public.student_profile OWNER TO postgres;

--
-- Name: user; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."user" (
    user_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    real_name character varying(50) NOT NULL,
    email character varying(50) NOT NULL,
    username character varying(50) NOT NULL,
    password character varying(128) NOT NULL,
    nickname character varying(50) NOT NULL,
    role character varying(20),
    is_admin boolean DEFAULT false,
    otp_secret character varying(64),
    is_2fa_enabled boolean DEFAULT false,
    registered_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone DEFAULT '9999-12-31 23:59:59+00'::timestamp with time zone,
    CONSTRAINT user_role_check CHECK (((role)::text = ANY ((ARRAY['student'::character varying, 'department'::character varying, 'company'::character varying])::text[])))
);


ALTER TABLE public."user" OWNER TO postgres;

--
-- Name: achievement achievement_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.achievement ALTER COLUMN achievement_id SET DEFAULT nextval('public.achievement_achievement_id_seq'::regclass);


--
-- Name: push_record push_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.push_record ALTER COLUMN push_id SET DEFAULT nextval('public.push_record_push_id_seq'::regclass);


--
-- Data for Name: achievement; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.achievement (achievement_id, user_id, category, title, description, creation_date, status) FROM stdin;
\.


--
-- Data for Name: application; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.application (user_id, resource_id, apply_date, status) FROM stdin;
\.


--
-- Data for Name: company_profile; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.company_profile (company_id, company_name, contact_person, industry) FROM stdin;
6632f50f-89f5-4e32-8269-8301e7d95648	tsmc	61255770-b939-4d4b-815f-55a0f70abee2	IC
af36f33f-8b23-41d1-aa96-7068ec40ee73	711	250ab829-efe5-4243-8d4e-df6b4780d244	Retail Store
\.


--
-- Data for Name: department_profile; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.department_profile (department_id, department_name, contact_person) FROM stdin;
5080	BME	41b7a321-6e43-4b88-ba2e-29d54bfa3fc8
\.


--
-- Data for Name: push_record; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.push_record (push_id, pusher_id, receiver_id, resource_id, push_datetime) FROM stdin;
\.


--
-- Data for Name: resource; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.resource (resource_id, resource_type, quota, department_supplier_id, company_supplier_id, title, deadline, description, status, is_deleted) FROM stdin;
\.


--
-- Data for Name: resource_condition; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.resource_condition (resource_id, department_id, avg_gpa, current_gpa, is_poor) FROM stdin;
\.


--
-- Data for Name: student_course_record; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_course_record (user_id, semester, course_id, course_name, score) FROM stdin;
\.


--
-- Data for Name: student_department; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_department (user_id, department_id, role, start_semester, end_semester) FROM stdin;
\.


--
-- Data for Name: student_gpa; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_gpa (user_id, semester, gpa) FROM stdin;
\.


--
-- Data for Name: student_profile; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_profile (user_id, student_id, department_id, entry_year, grade) FROM stdin;
\.


--
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."user" (user_id, real_name, email, username, password, nickname, role, is_admin, otp_secret, is_2fa_enabled, registered_at, deleted_at) FROM stdin;
41b7a321-6e43-4b88-ba2e-29d54bfa3fc8	bmeHost	bme@example.com	bmeHost	123456789	bmeHost	department	f	\N	f	2025-11-28 07:01:28.408361+00	9999-12-31 23:59:59+00
303ac774-7f03-4863-85b1-3382fa4a52ca	csHost	cs@example.com	csHost	123456789	csHost	department	f	\N	f	2025-11-28 07:01:28.408361+00	9999-12-31 23:59:59+00
61255770-b939-4d4b-815f-55a0f70abee2	tsmcHost	tsmc@example.com	tsmcHost	123456789	tsmcHost	company	f	\N	f	2025-11-28 07:01:28.408361+00	9999-12-31 23:59:59+00
250ab829-efe5-4243-8d4e-df6b4780d244	711Host	711@example.com	711Host	123456789	711Host	company	f	\N	f	2025-11-28 07:01:28.408361+00	9999-12-31 23:59:59+00
03b4de34-88fd-4bb3-a58e-ebce17074175	Josh	b12508026@ntu.edu.tw	b12508026	$2b$10$MCMwgLsojJ3y5wOqh337audW/Dl5gcLH.Pf7oAU.4Cox9RDX2U4sK	Josh	student	f	\N	f	2025-11-28 07:10:07.09024+00	9999-12-31 23:59:59+00
\.


--
-- Name: achievement_achievement_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.achievement_achievement_id_seq', 1, false);


--
-- Name: push_record_push_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.push_record_push_id_seq', 1, false);


--
-- Name: achievement achievement_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.achievement
    ADD CONSTRAINT achievement_pkey PRIMARY KEY (achievement_id);


--
-- Name: application application_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application
    ADD CONSTRAINT application_pkey PRIMARY KEY (user_id, resource_id);


--
-- Name: company_profile company_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_profile
    ADD CONSTRAINT company_profile_pkey PRIMARY KEY (company_id);


--
-- Name: department_profile department_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.department_profile
    ADD CONSTRAINT department_profile_pkey PRIMARY KEY (department_id);


--
-- Name: push_record push_record_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.push_record
    ADD CONSTRAINT push_record_pkey PRIMARY KEY (push_id);


--
-- Name: resource_condition resource_condition_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resource_condition
    ADD CONSTRAINT resource_condition_pkey PRIMARY KEY (resource_id, department_id);


--
-- Name: resource resource_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resource
    ADD CONSTRAINT resource_pkey PRIMARY KEY (resource_id);


--
-- Name: student_course_record student_course_record_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_course_record
    ADD CONSTRAINT student_course_record_pkey PRIMARY KEY (user_id, semester, course_id);


--
-- Name: student_department student_department_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_department
    ADD CONSTRAINT student_department_pkey PRIMARY KEY (user_id, department_id, role, start_semester);


--
-- Name: student_gpa student_gpa_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_gpa
    ADD CONSTRAINT student_gpa_pkey PRIMARY KEY (user_id, semester);


--
-- Name: student_profile student_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_profile
    ADD CONSTRAINT student_profile_pkey PRIMARY KEY (user_id);


--
-- Name: student_profile student_profile_student_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_profile
    ADD CONSTRAINT student_profile_student_id_key UNIQUE (student_id);


--
-- Name: user user_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_email_key UNIQUE (email);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (user_id);


--
-- Name: user user_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_username_key UNIQUE (username);


--
-- Name: achievement achievement_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.achievement
    ADD CONSTRAINT achievement_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(user_id);


--
-- Name: application application_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application
    ADD CONSTRAINT application_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resource(resource_id);


--
-- Name: application application_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application
    ADD CONSTRAINT application_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(user_id);


--
-- Name: company_profile company_profile_contact_person_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_profile
    ADD CONSTRAINT company_profile_contact_person_fkey FOREIGN KEY (contact_person) REFERENCES public."user"(user_id);


--
-- Name: department_profile department_profile_contact_person_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.department_profile
    ADD CONSTRAINT department_profile_contact_person_fkey FOREIGN KEY (contact_person) REFERENCES public."user"(user_id);


--
-- Name: push_record push_record_pusher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.push_record
    ADD CONSTRAINT push_record_pusher_id_fkey FOREIGN KEY (pusher_id) REFERENCES public."user"(user_id);


--
-- Name: push_record push_record_receiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.push_record
    ADD CONSTRAINT push_record_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public."user"(user_id);


--
-- Name: push_record push_record_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.push_record
    ADD CONSTRAINT push_record_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resource(resource_id);


--
-- Name: resource resource_company_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resource
    ADD CONSTRAINT resource_company_supplier_id_fkey FOREIGN KEY (company_supplier_id) REFERENCES public.company_profile(company_id);


--
-- Name: resource_condition resource_condition_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resource_condition
    ADD CONSTRAINT resource_condition_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.department_profile(department_id);


--
-- Name: resource_condition resource_condition_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resource_condition
    ADD CONSTRAINT resource_condition_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resource(resource_id);


--
-- Name: resource resource_department_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resource
    ADD CONSTRAINT resource_department_supplier_id_fkey FOREIGN KEY (department_supplier_id) REFERENCES public.department_profile(department_id);


--
-- Name: student_course_record student_course_record_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_course_record
    ADD CONSTRAINT student_course_record_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(user_id);


--
-- Name: student_department student_department_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_department
    ADD CONSTRAINT student_department_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.department_profile(department_id);


--
-- Name: student_department student_department_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_department
    ADD CONSTRAINT student_department_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(user_id);


--
-- Name: student_gpa student_gpa_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_gpa
    ADD CONSTRAINT student_gpa_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(user_id);


--
-- Name: student_profile student_profile_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_profile
    ADD CONSTRAINT student_profile_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.department_profile(department_id);


--
-- Name: student_profile student_profile_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_profile
    ADD CONSTRAINT student_profile_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(user_id);


--
-- PostgreSQL database dump complete
--

\unrestrict lRSdeyPddW3bWmK4qe5gUEaULJT6gsVQ1KQKTi8Oo56IkNGo0WeiqghCSkmwjtI

