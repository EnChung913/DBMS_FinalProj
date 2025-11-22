from typing import Optional
import datetime
import uuid

from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, Double, ForeignKeyConstraint, Integer, PrimaryKeyConstraint, String, Text, UniqueConstraint, Uuid, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = 'user'
    __table_args__ = (
        CheckConstraint("role::text = ANY (ARRAY['student'::character varying, 'department'::character varying, 'company'::character varying]::text[])", name='user_role_check'),
        PrimaryKeyConstraint('user_id', name='user_pkey'),
        UniqueConstraint('email', name='user_email_key'),
        UniqueConstraint('username', name='user_username_key')
    )

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('uuid_generate_v4()'))
    real_name: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[str] = mapped_column(String(50), nullable=False)
    username: Mapped[str] = mapped_column(String(50), nullable=False)
    password: Mapped[str] = mapped_column(String(128), nullable=False)
    nickname: Mapped[str] = mapped_column(String(50), nullable=False)
    role: Mapped[Optional[str]] = mapped_column(String(20))
    registered_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    is_deleted: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))


class Achievement(Base):
    __tablename__ = 'achievement'
    __table_args__ = (
        CheckConstraint("category::text = ANY (ARRAY['Competition'::character varying, 'Research'::character varying, 'Others'::character varying]::text[])", name='achievement_category_check'),
        CheckConstraint("status::text = ANY (ARRAY['unrecognized'::character varying, 'recognized'::character varying, 'rejected'::character varying]::text[])", name='achievement_status_check'),
        ForeignKeyConstraint(['user_id'], ['user.user_id'], name='achievement_user_id_fkey'),
        PrimaryKeyConstraint('achievement_id', name='achievement_pkey')
    )

    achievement_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    category: Mapped[Optional[str]] = mapped_column(String(20))
    creation_date: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))



class CompanyProfile(Base):
    __tablename__ = 'company_profile'
    __table_args__ = (
        ForeignKeyConstraint(['contact_person'], ['user.user_id'], name='company_profile_contact_person_fkey'),
        PrimaryKeyConstraint('company_id', name='company_profile_pkey')
    )

    company_id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    company_name: Mapped[str] = mapped_column(String(100), nullable=False)
    contact_person: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    industry: Mapped[str] = mapped_column(String(50), nullable=False)


class DepartmentProfile(Base):
    __tablename__ = 'department_profile'
    __table_args__ = (
        ForeignKeyConstraint(['contact_person'], ['user.user_id'], name='department_profile_contact_person_fkey'),
        PrimaryKeyConstraint('department_id', name='department_profile_pkey')
    )

    department_id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    department_name: Mapped[str] = mapped_column(String(100), nullable=False)
    contact_person: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)


class StudentCourseRecord(Base):
    __tablename__ = 'student_course_record'
    __table_args__ = (
        CheckConstraint('score >= 0::double precision AND score <= 100::double precision', name='student_course_record_score_check'),
        ForeignKeyConstraint(['user_id'], ['user.user_id'], name='student_course_record_user_id_fkey'),
        PrimaryKeyConstraint('user_id', 'semester', 'course_id', name='student_course_record_pkey')
    )

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    semester: Mapped[str] = mapped_column(String(10), primary_key=True)
    course_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    course_name: Mapped[str] = mapped_column(String(100), nullable=False)
    score: Mapped[Optional[float]] = mapped_column(Double(53))



class StudentGpa(Base):
    __tablename__ = 'student_gpa'
    __table_args__ = (
        CheckConstraint('gpa >= 0::double precision AND gpa <= 4.3::double precision', name='student_gpa_gpa_check'),
        ForeignKeyConstraint(['user_id'], ['user.user_id'], name='student_gpa_user_id_fkey'),
        PrimaryKeyConstraint('user_id', 'semester', name='student_gpa_pkey')
    )

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    semester: Mapped[str] = mapped_column(String(10), primary_key=True)
    gpa: Mapped[Optional[float]] = mapped_column(Double(53))



class Resource(Base):
    __tablename__ = 'resource'
    __table_args__ = (
        CheckConstraint('department_supplier_id IS NOT NULL AND company_supplier_id IS NULL OR department_supplier_id IS NULL AND company_supplier_id IS NOT NULL', name='resource_check'),
        CheckConstraint('quota >= 0', name='resource_quota_check'),
        CheckConstraint("resource_type::text = ANY (ARRAY['Scholarship'::character varying, 'Internship'::character varying, 'Lab'::character varying, 'Others'::character varying]::text[])", name='resource_resource_type_check'),
        CheckConstraint("status::text = ANY (ARRAY['Canceled'::character varying, 'Unavailable'::character varying, 'Available'::character varying]::text[])", name='resource_status_check'),
        ForeignKeyConstraint(['company_supplier_id'], ['company_profile.company_id'], name='resource_company_supplier_id_fkey'),
        ForeignKeyConstraint(['department_supplier_id'], ['department_profile.department_id'], name='resource_department_supplier_id_fkey'),
        PrimaryKeyConstraint('resource_id', name='resource_pkey')
    )

    resource_id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('uuid_generate_v4()'))
    quota: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    resource_type: Mapped[Optional[str]] = mapped_column(String(20))
    department_supplier_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    company_supplier_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    deadline: Mapped[Optional[datetime.date]] = mapped_column(Date)
    is_deleted: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text('false'))


class StudentDepartment(Base):
    __tablename__ = 'student_department'
    __table_args__ = (
        CheckConstraint("role::text = ANY (ARRAY['major'::character varying, 'minor'::character varying, 'double_major'::character varying]::text[])", name='student_department_role_check'),
        ForeignKeyConstraint(['department_id'], ['department_profile.department_id'], name='student_department_department_id_fkey'),
        ForeignKeyConstraint(['user_id'], ['user.user_id'], name='student_department_user_id_fkey'),
        PrimaryKeyConstraint('user_id', 'department_id', 'role', 'start_semester', name='student_department_pkey')
    )

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    department_id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    role: Mapped[str] = mapped_column(String(20), primary_key=True)
    start_semester: Mapped[str] = mapped_column(String(10), primary_key=True)
    end_semester: Mapped[Optional[str]] = mapped_column(String(10))


class StudentProfile(User):
    __tablename__ = 'student_profile'
    __table_args__ = (
        ForeignKeyConstraint(['department_id'], ['department_profile.department_id'], name='student_profile_department_id_fkey'),
        ForeignKeyConstraint(['user_id'], ['user.user_id'], name='student_profile_user_id_fkey'),
        PrimaryKeyConstraint('user_id', name='student_profile_pkey'),
        UniqueConstraint('student_id', name='student_profile_student_id_key')
    )

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    student_id: Mapped[str] = mapped_column(String(10), nullable=False)
    department_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    entry_year: Mapped[int] = mapped_column(Integer, nullable=False)
    grade: Mapped[int] = mapped_column(Integer, nullable=False)


class Application(Base):
    __tablename__ = 'application'
    __table_args__ = (
        CheckConstraint("status::text = ANY (ARRAY['submitted'::character varying, 'under_review'::character varying, 'approved'::character varying, 'rejected'::character varying]::text[])", name='application_status_check'),
        ForeignKeyConstraint(['resource_id'], ['resource.resource_id'], name='application_resource_id_fkey'),
        ForeignKeyConstraint(['user_id'], ['user.user_id'], name='application_user_id_fkey'),
        PrimaryKeyConstraint('user_id', 'resource_id', name='application_pkey')
    )

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    resource_id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    apply_date: Mapped[Optional[datetime.date]] = mapped_column(Date, server_default=text('CURRENT_DATE'))



class PushRecord(Base):
    __tablename__ = 'push_record'
    __table_args__ = (
        ForeignKeyConstraint(['pusher_id'], ['user.user_id'], name='push_record_pusher_id_fkey'),
        ForeignKeyConstraint(['receiver_id'], ['user.user_id'], name='push_record_receiver_id_fkey'),
        ForeignKeyConstraint(['resource_id'], ['resource.resource_id'], name='push_record_resource_id_fkey'),
        PrimaryKeyConstraint('push_id', name='push_record_pkey')
    )

    push_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    pusher_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    receiver_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    resource_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid)
    push_datetime: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))



class ResourceCondition(Base):
    __tablename__ = 'resource_condition'
    __table_args__ = (
        CheckConstraint('avg_gpa >= 0::double precision AND avg_gpa <= 4.3::double precision', name='resource_condition_avg_gpa_check'),
        CheckConstraint('current_gpa >= 0::double precision AND current_gpa <= 4.3::double precision', name='resource_condition_current_gpa_check'),
        ForeignKeyConstraint(['department_id'], ['department_profile.department_id'], name='resource_condition_department_id_fkey'),
        ForeignKeyConstraint(['resource_id'], ['resource.resource_id'], name='resource_condition_resource_id_fkey'),
        PrimaryKeyConstraint('resource_id', 'department_id', name='resource_condition_pkey')
    )

    resource_id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    department_id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    avg_gpa: Mapped[Optional[float]] = mapped_column(Double(53))
    current_gpa: Mapped[Optional[float]] = mapped_column(Double(53))
    is_poor: Mapped[Optional[bool]] = mapped_column(Boolean)
