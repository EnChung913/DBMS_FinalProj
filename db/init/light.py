import uuid
import random
import csv
import re
from faker import Faker
from datetime import date, datetime, timedelta, timezone
from io import StringIO
import string
from uuid import uuid4
from collections import defaultdict

Faker.seed(42)
random.seed(42)

# 設置 Faker 使用中文和英文
fake_ch = Faker(['zh_TW', 'en_US'])
# 設置一個專門用於生成英文名的 Faker 實例
fake_en = Faker('en_US') 

# --- 1. 常數定義 ---
# 設定時區為 UTC+8
TZ = timezone(timedelta(hours=8))

# 密碼 Hash 值 (ntu-test-2025)
DEFAULT_PASSWORD_HASH = "$2b$10$mSAYMiRM1448LuLpBqQOHOJ8H0941/3Rc1a9bSRkPmFRJC6mDVQ9i"

# 數量設定
NUM_STUDENTS = 500
NUM_COMPANIES = 50
NUM_SOFT_DELETED_STUDENTS = 5
NUM_SOFT_DELETED_COMPANIES = 5

# 輸出文件名
OUTPUT_SQL_FILE = 'insert_user_data.sql'
CSV_FILENAME = '學系代碼表.csv'

# --- 2. 輔助函數 ---
def generate_sequential_uuid(n):
    """
    生成固定前綴 + 序號的 UUID 字串
    例如：
      1 -> 00000000-0000-0000-0000-000000000001
      2 -> 00000000-0000-0000-0000-000000000002
    """
    return f"00000000-0000-0000-0000-{n:012d}"

def get_suffix():
    """Generates a unique random integer suffix in a large range [100000, 999999]."""
    # 確保足夠的唯一性
    return fake_ch.random_int(min=100000, max=999999)

def sql_value(value):
    if value is None:
        return 'NULL'
    
    if isinstance(value, str):
        safe = value.replace("'", "''")
        return f"'{safe}'"
    
    if isinstance(value, uuid.UUID):
        return f"'{value}'"
    
    if isinstance(value, bool):
        return 'TRUE' if value else 'FALSE'
    
    if isinstance(value, datetime):
        # 支援 tz-aware datetime
        return f"'{value.strftime('%Y-%m-%d %H:%M:%S%z')}'"
    
    if isinstance(value, date):
        return f"'{value.strftime('%Y-%m-%d')}'"
    
    return str(value)
def generate_soft_delete_timestamps(registered_at):
    """生成在註冊時間之後的刪除時間。"""
    time_diff = timedelta(days=random.randint(1, 365*2))
    deleted_at = registered_at + time_diff
    
    NOW = datetime.now(TZ)
    if deleted_at > NOW:
        deleted_at = NOW
        
    return deleted_at

def generate_nickname(role, real_name, dept_name=None, company_name=None):
    """根據角色生成特殊的 nickname (已修正)。"""
    if role == 'student':
        # 50% 英文名 (綽號)，50% 中文綽號
        if random.random() < 0.5:
            # 學生英文綽號
            return fake_en.first_name() 
        else:
            # 學生中文綽號
            return fake_ch.last_name() if real_name[-1] in '惠芳美麗' else fake_ch.first_name()
    
    elif role == 'department':
        # [學系名稱]聯絡人 (無空格)
        return f"{dept_name.strip().replace(' ', '')}聯絡人"
        
    elif role == 'company':
        # [公司名稱]聯絡人 (無空格)
        return f"{company_name.strip().replace(' ', '')}聯絡人"
    
    return real_name

# --- 3. 讀取學系資料並處理特殊情況 ---

def load_department_data(csv_filename):
    """讀取 CSV 並處理特殊學系重複的問題。"""
    departments = []
    
    try:
        # 使用 UTF-8 讀取
        with open(csv_filename, 'r', encoding='utf-8') as f:
            csv_content = f.read()
    except FileNotFoundError:
        print(f"錯誤: 找不到檔案 {csv_filename}。請確認檔案存在於同目錄下。")
        return []

    reader = csv.reader(StringIO(csv_content))
    next(reader)  # 跳過標題行
    
    pharmacy_count = 0
    pt_count = 0

    for row in reader:
        if not row or len(row) < 2: continue
        
        dept_code = row[0].strip()
        dept_name = row[1].strip()
        
        # 處理藥學系 (代碼 A120)
        if dept_code == 'A120':
            pharmacy_count += 1
            if pharmacy_count == 1:
                dept_name = '藥學系(六年制)'
            else:
                dept_name = '藥學系(四年制)'
        
        # 處理物理治療學系 (代碼 B040)
        if dept_code == 'B040':
            pt_count += 1
            if pt_count == 1:
                dept_name = '物理治療學系(六年制)'
            else:
                dept_name = '物理治療學系(四年制)'

        departments.append({
            'code': dept_code,
            'name': dept_name.strip().replace(' ', ''), # 確保學系名稱無空格
            'abbr': dept_name.strip().replace(' ', '')[:3] # 仍然保留一個簡稱用於 username
        })
        
    print(f"✅ 成功讀取並處理 {len(departments)} 筆學系資料。")
    return departments

# --- 4. 主生成邏輯 ---

def generate_user_data():
    uuid_user = 0
    all_users = []
    NOW = datetime.now(TZ) 
    
    # 讀取學系資料
    department_data = load_department_data(CSV_FILENAME)
    if not department_data:
        return [], []

    # ---------------------------------------------
    # A. DEPARTMENT USERS (學系聯絡人)
    # ---------------------------------------------
    for dept in department_data:
        uuid_user += 1
        user_id = generate_sequential_uuid(uuid_user)
        real_name = fake_ch.name() 
        registered_at = fake_ch.date_time_between(start_date='-5y', end_date='-1y', tzinfo=TZ)
        safe_abbr = re.sub(r'[^a-zA-Z0-9]', '', dept['abbr'])
        if not safe_abbr:
            safe_abbr = dept['code'].lower()
        
        # 如果是資管系聯絡人，is_admin 設為 True
        is_admin_flag = True if dept['code'] == '7050' else False

        user = {
            'user_id': user_id,
            'real_name': real_name,
            'email': fake_ch.unique.email(),
            'username': f"{safe_abbr}_host_{get_suffix()}",
            'password': DEFAULT_PASSWORD_HASH,
            'nickname': generate_nickname('department', real_name, dept_name=dept['name']),
            'role': 'department',
            'is_admin': is_admin_flag,   # <-- 這裡設定
            'registered_at': registered_at,
            'deleted_at': datetime(9999, 12, 31, 23, 59, 59, tzinfo=TZ)
        }
        all_users.append(user)
        dept['contact_person_id'] = user_id
    
    print(f"✅ 生成 {len(department_data)} 筆 'department' 使用者資料。")

    # ---------------------------------------------
    # B. COMPANY USERS (公司聯絡人)
    # ---------------------------------------------
    
    for i in range(NUM_COMPANIES):
        is_deleted = i < NUM_SOFT_DELETED_COMPANIES
        
        uuid_user += 1
        user_id = generate_sequential_uuid(uuid_user)
        real_name = fake_ch.name()
        # **[修正 UniquenessError]** 結合公司名和唯一後綴
        raw_company_name = fake_ch.company()
        company_name = f"{raw_company_name.replace(' ', '')}_{get_suffix()}" 
        
        registered_at = fake_ch.date_time_between(start_date='-3y', end_date=NOW, tzinfo=TZ)
        
        if is_deleted:
            deleted_at = generate_soft_delete_timestamps(registered_at)
        else:
            deleted_at = datetime(9999, 12, 31, 23, 59, 59, tzinfo=TZ)

        user = {
            'user_id': user_id,
            'real_name': real_name,
            'email': fake_ch.unique.email(),
            'username': f"comp_{i}_{get_suffix()}",
            'password': DEFAULT_PASSWORD_HASH,
            # 使用完整的公司名稱
            'nickname': generate_nickname('company', real_name, company_name=raw_company_name),
            'role': 'company',
            'is_admin': False,
            'registered_at': registered_at,
            'deleted_at': deleted_at,
            'company_name': raw_company_name # 暫存原始公司名，供後續 company_profile 使用
        }
        all_users.append(user)

    print(f"✅ 生成 {NUM_COMPANIES} 筆 'company' 使用者資料。")

    # ---------------------------------------------
    # C. STUDENT USERS (學生)
    # ---------------------------------------------
    
    for i in range(NUM_STUDENTS):
        is_deleted = i < NUM_SOFT_DELETED_STUDENTS
        
        uuid_user += 1
        user_id = generate_sequential_uuid(uuid_user)
        real_name = fake_ch.name()
        registered_at = fake_ch.date_time_between(start_date='-4y', end_date=NOW, tzinfo=TZ)
        
        if is_deleted:
            deleted_at = generate_soft_delete_timestamps(registered_at)
        else:
            deleted_at = datetime(9999, 12, 31, 23, 59, 59, tzinfo=TZ)

        user = {
            'user_id': user_id,
            'real_name': real_name,
            'email': fake_ch.unique.email(),
            'username': f"std_{i}_{get_suffix()}",
            'password': DEFAULT_PASSWORD_HASH,
            'nickname': generate_nickname('student', real_name),
            'role': 'student',
            'is_admin': False,
            'registered_at': registered_at,
            'deleted_at': deleted_at,
            'main_dept_code': random.choice(department_data)['code'] # 供後續 student_profile 使用
        }
        all_users.append(user)

    print(f"✅ 生成 {NUM_STUDENTS} 筆 'student' 使用者資料。")
    
    return all_users, department_data

# --- 5. 將資料寫入 SQL 文件 ---

def write_sql_file(all_users):
    
    random.shuffle(all_users)
    
    with open(OUTPUT_SQL_FILE, 'w', encoding='utf-8') as f:
        f.write("-- PostgreSQL INSERT script for 'user' table\n\n")
        f.write("BEGIN;\n\n")
        
        columns = [
            "user_id", "real_name", "email", "username", "password", "nickname", "role", 
            "is_admin", "registered_at", "deleted_at", "company_id", "department_id"
        ]
        columns_sql = ", ".join(columns)
        BATCH_SIZE = 100
        batch_values = []
        for idx, user in enumerate(all_users, start=1):
            values = [
                user['user_id'], user['real_name'], user['email'], user['username'], 
                user['password'], user['nickname'], user['role'], user['is_admin'],
                user['registered_at'], user['deleted_at'],
                user.get('company_id', None),  # FK 新增
                user.get('department_id', None)  # FK 新增
            ]
            values_sql = ", ".join([sql_value(v) for v in values])
            batch_values.append(f"({values_sql})")
            
            if idx % BATCH_SIZE == 0:
                f.write(f"INSERT INTO \"user\" ({columns_sql}) VALUES\n")
                f.write(",\n".join(batch_values) + ";\n\n")
                batch_values = []

        # 寫入剩下的資料
        if batch_values:
            f.write(f"INSERT INTO \"user\" ({columns_sql}) VALUES\n")
            f.write(",\n".join(batch_values) + ";\n\n")
        f.write("COMMIT;\n")

# --- 6. 執行主程序 ---

# 生成資料
all_users, department_data = generate_user_data()

# 寫入 SQL 檔案
if all_users:
    write_sql_file(all_users)

    print(f"\n=======================================================")
    print(f"🎉 成功生成所有 {len(all_users)} 筆 'user' 資料到 {OUTPUT_SQL_FILE}。")
    print(f"\n下一步是生成 profile 表格，請參考以下 Foreign Key 資訊：")
    
    print("\n--- Department Profile 資訊 (Code, Contact UUID) ---")
    for dept in department_data:
        print(f"代碼: {dept['code']}, 名稱: {dept['name']}, 聯絡人 UUID: {dept['contact_person_id']}")
    
    print("\n--- Company Profile 資訊 (Name, Contact UUID) ---")
    company_users = [u for u in all_users if u['role'] == 'company']
    for i in range(min(5, len(company_users))):
        print(f"公司名: {company_users[i]['company_name']}, 聯絡人 UUID: {company_users[i]['user_id']}")

DEPARTMENT_PROFILE_SQL_FILE = 'insert_department_profile.sql'

def write_department_profile_sql(department_data):
    BATCH_SIZE = 100  # 每 50 筆生成一次 INSERT
    with open(DEPARTMENT_PROFILE_SQL_FILE, 'w', encoding='utf-8') as f:
        f.write("-- PostgreSQL INSERT script for 'department_profile' table\n\n")
        f.write("BEGIN;\n\n")
        
        batch_values = []
        for idx, dept in enumerate(department_data, start=1):
            dept_id = dept['code']
            dept_name = dept['name'].replace("'", "''")  # 避免單引號錯誤
            contact_uuid = dept['contact_person_id']
            batch_values.append(f"('{dept_id}', '{dept_name}', '{contact_uuid}')")
            
            if idx % BATCH_SIZE == 0:
                f.write("INSERT INTO department_profile (department_id, department_name, contact_person) VALUES\n")
                f.write(",\n".join(batch_values) + ";\n\n")
                batch_values = []

        # 寫入剩餘的資料
        if batch_values:
            f.write("INSERT INTO department_profile (department_id, department_name, contact_person) VALUES\n")
            f.write(",\n".join(batch_values) + ";\n\n")
        
        f.write("COMMIT;\n")
    print(f"🎉 成功生成 {len(department_data)} 筆 'department_profile' 資料到 {DEPARTMENT_PROFILE_SQL_FILE}。")


# 呼叫函數生成 SQL
write_department_profile_sql(department_data)

def generate_sequential_company_uuid(n):
    """
    公司 ID 使用土方法固定前綴 + 序號
    例如：
      1 -> 00000000-0000-0001-0000-000000000001
      81 -> 00000000-0000-0001-0000-000000000081
    """
    return f"00000000-0000-0000-0001-{int(n):012d}"

COMPANY_PROFILE_SQL_FILE = 'insert_company_profile.sql'
INDUSTRY_BOX = ['科技業','生技業','服務業','金融業','醫療業','教育業','餐飲業','零售業','製造業','建築業','運輸業','物流業','能源業','農業','漁業','林業','娛樂業','媒體業','廣告業','旅遊業','保險業','電信業','資訊服務業','軟體業','硬體業','半導體業','汽車業','航太業','化工業','製藥業','時尚業','美容業','健身業','房地產業','法律業','會計業','諮詢業','非營利組織','藝術業','音樂業','影視業','出版業','電子商務','遊戲業','體育產業','環保產業','醫美業','家具業','餐飲連鎖業','跨境電商','社群媒體業','智能家居業']
used_company_ids = set()

def write_company_profile_sql(all_users):
    company_users = [u for u in all_users if u['role'] == 'company']
    BATCH_SIZE = 100  # 每 50 筆生成一次 INSERT
    
    with open(COMPANY_PROFILE_SQL_FILE, 'w', encoding='utf-8') as f:
        f.write("-- PostgreSQL INSERT script for 'company_profile' table\n\n")
        f.write("BEGIN;\n\n")
        
        batch_values = []
        for idx, u in enumerate(company_users, start=1):
            company_id = generate_sequential_company_uuid(int(u['user_id'][-12:]))  # 取 user_id 最後 12 位轉數字
            company_name = u['company_name'].replace("'", "''")  # 避免單引號錯誤
            contact_uuid = u['user_id']
            industry = random.choice(INDUSTRY_BOX).replace("'", "''")  # 處理特殊字元
            batch_values.append(f"('{company_id}', '{company_name}', '{contact_uuid}', '{industry}')")
            
            if idx % BATCH_SIZE == 0:
                f.write("INSERT INTO company_profile (company_id, company_name, contact_person, industry) VALUES\n")
                f.write(",\n".join(batch_values) + ";\n\n")
                batch_values = []

        # 寫入剩餘資料
        if batch_values:
            f.write("INSERT INTO company_profile (company_id, company_name, contact_person, industry) VALUES\n")
            f.write(",\n".join(batch_values) + ";\n\n")
        
        f.write("COMMIT;\n")
    
    print(f"🎉 成功生成 {len(company_users)} 筆 'company_profile' 資料到 {COMPANY_PROFILE_SQL_FILE}。")


# 呼叫函數
write_company_profile_sql(all_users)

STUDENT_PROFILE_SQL_FILE = 'insert_student_profile.sql'

def calculate_entry_year(registered_at):
    """
    registered_at: datetime
    回傳學生入學民國年
    """
    now = datetime.now(TZ)
    # 以月份為判斷，如果已過 9 個月就算 n 年，否則 n-1 年
    diff = now - registered_at
    diff_in_months = diff.days // 30  # 粗略換算月份
    years = diff_in_months // 12

    # 超過 9 個月就算 n 年，否則 n-1 年
    if (diff_in_months % 12) >= 9:
        entry_year_ad = registered_at.year + years
    else:
        entry_year_ad = registered_at.year + years - 1

    # 轉成民國年
    entry_year_minguo = entry_year_ad - 1911
    return entry_year_minguo

def write_student_profile_sql(all_users):
    student_users = [u for u in all_users if u['role'] == 'student']

    dept_used_numbers = {}  # 用於避免每個系每年流水號重複
    BATCH_SIZE = 100        # 每 100 筆一起 INSERT

    with open(STUDENT_PROFILE_SQL_FILE, 'w', encoding='utf-8') as f:
        f.write("-- PostgreSQL INSERT script for 'student_profile' table\n\n")
        f.write("BEGIN;\n\n")

        batch_values = []

        for idx, u in enumerate(student_users, start=1):
            entry_year = calculate_entry_year(u['registered_at'])
            u['entry_year'] = entry_year   # <- 回寫 entry_year
            year_code = str(entry_year)[-2:]
            level = random.choice(['B', 'R'])
            dept_code = u['main_dept_code']  # 對應 department_profile.department_id
            dept_code_short = dept_code[:3]

            year_dept_key = f"{entry_year}_{dept_code_short}"

            if year_dept_key not in dept_used_numbers:
                dept_used_numbers[year_dept_key] = 1

            student_number = f"{dept_used_numbers[year_dept_key]:03d}"
            dept_used_numbers[year_dept_key] += 1

            student_id = f"{level}{year_code}{dept_code_short}{student_number}"
            u['student_id'] = student_id  # 回寫回 all_users

            grade = datetime.now().year - (entry_year + 1911) + 1

            batch_values.append(
                f"('{u['user_id']}', '{student_id}', '{dept_code}', {entry_year}, {grade})"
            )

            if idx % BATCH_SIZE == 0:
                f.write("INSERT INTO student_profile (user_id, student_id, department_id, entry_year, grade) VALUES\n")
                f.write(",\n".join(batch_values) + ";\n\n")
                batch_values = []

        # 寫入剩餘資料
        if batch_values:
            f.write("INSERT INTO student_profile (user_id, student_id, department_id, entry_year, grade) VALUES\n")
            f.write(",\n".join(batch_values) + ";\n\n")

        f.write("COMMIT;\n")

    print(f"🎉 成功生成 {len(student_users)} 筆 'student_profile' 資料到 {STUDENT_PROFILE_SQL_FILE}。")


# 呼叫函數
write_student_profile_sql(all_users)

# --- 定義輸出 SQL 檔名 ---
USER_FK_UPDATE_SQL_FILE = "user_fk_update.sql"

# --- 寫入 user table FK 更新的函數 ---
def write_user_fk_update_sql(all_users, department_data, company_users):
    BATCH_SIZE = 50
    update_lines = []

    # 建立 department mapping: contact_person_id -> department_id
    dept_map = {dept['contact_person_id']: dept['code'] for dept in department_data}

    # 建立 company mapping: user_id -> company_id
    comp_map = {u['user_id']: generate_sequential_company_uuid(int(u['user_id'][-12:])) for u in company_users}

    with open(USER_FK_UPDATE_SQL_FILE, 'w', encoding='utf-8') as f:
        f.write("-- PostgreSQL UPDATE script for 'user' table FKs\n\n")
        f.write("BEGIN;\n\n")

        for idx, u in enumerate(all_users, start=1):
            if u['role'] == 'department':
                dept_id = dept_map.get(u['user_id'], 'NULL')
                update_lines.append(f"UPDATE \"user\" SET department_id = '{dept_id}' WHERE user_id = '{u['user_id']}'")
            elif u['role'] == 'company':
                company_id = comp_map.get(u['user_id'], 'NULL')
                update_lines.append(f"UPDATE \"user\" SET company_id = '{company_id}' WHERE user_id = '{u['user_id']}'")
            # student 不操作

            # 批次提交
            if idx % BATCH_SIZE == 0:
                f.write(";\n".join(update_lines) + ";\n\n")
                update_lines = []

        # 寫入剩餘的
        if update_lines:
            f.write(";\n".join(update_lines) + ";\n\n")

        f.write("COMMIT;\n")

    print(f"✅ 成功生成 'user' table FK 更新 SQL 到 {USER_FK_UPDATE_SQL_FILE}")


# --- 呼叫函數生成 SQL ---
# all_users = 已生成的使用者資料
# department_data = 已生成的 department profile 資料
# company_users = [u for u in all_users if u['role'] == 'company']
write_user_fk_update_sql(all_users, department_data, [u for u in all_users if u['role'] == 'company'])


APPL_STUDENT_NUM = 50
APPL_COMPANY_NUM = 5

USER_APPLICATION_SQL_FILE = "user_application.sql"

def write_user_application_sql(all_users, admin_user_id):
    """
    all_users: 所有已生成 user 資料
    admin_user_id: 資管系管理人 user_id
    """
    # 分類使用者
    department_users = [u for u in all_users if u['role'] == 'department']
    company_users = [u for u in all_users if u['role'] == 'company']

    batch_values = []
    BATCH_SIZE = 50

    columns_sql = ("application_id, real_name, email, username, password, nickname, role, "
                   "registered_at, status, submit_time, review_time, reviewed_by, review_comment")

    with open(USER_APPLICATION_SQL_FILE, 'w', encoding='utf-8') as f:
        f.write("-- PostgreSQL INSERT script for 'user_application' table\n\n")
        f.write("BEGIN;\n\n")

        # -----------------------------
        # 1. 已註冊 user -> approved
        # -----------------------------
        approved_users = department_users + company_users
        for idx, u in enumerate(approved_users, start=1):
            application_id = str(uuid4())
            registered_at = u['registered_at']
            submit_time = registered_at - timedelta(days=2)
            review_time = registered_at - timedelta(hours=1)
            status = 'approved'
            review_comment = status

            values = [
                application_id,
                u['real_name'],
                u['email'],
                u['username'],
                u['password'],
                u['nickname'],
                u['role'],
                registered_at,
                status,
                submit_time,
                review_time,
                admin_user_id,
                review_comment
            ]

            values_sql = ", ".join([sql_value(v) for v in values])
            batch_values.append(f"({values_sql})")

            if idx % BATCH_SIZE == 0:
                f.write(f"INSERT INTO user_application ({columns_sql}) VALUES\n")
                f.write(",\n".join(batch_values) + ";\n\n")
                batch_values = []

        # -----------------------------
        # 2. 額外公司 -> pending / rejected
        # -----------------------------
        extra_users = random.sample(company_users, APPL_COMPANY_NUM)
        for idx, u in enumerate(extra_users, start=1):
            application_id = str(uuid4())
            registered_at = u['registered_at']
            submit_time = registered_at - timedelta(days=2)
            status = random.choice(['pending', 'rejected'])
            review_time = registered_at - timedelta(hours=1) if status != 'pending' else None
            reviewed_by = admin_user_id if status != 'pending' else None
            review_comment = status

            values = [
                application_id,
                u['real_name'],
                u['email'],
                u['username'],
                u['password'],
                u['nickname'],
                u['role'],
                registered_at,
                status,
                submit_time,
                review_time,
                reviewed_by,
                review_comment
            ]

            values_sql = ", ".join([sql_value(v) for v in values])
            batch_values.append(f"({values_sql})")

            if idx % BATCH_SIZE == 0:
                f.write(f"INSERT INTO user_application ({columns_sql}) VALUES\n")
                f.write(",\n".join(batch_values) + ";\n\n")
                batch_values = []

        # 寫入剩餘資料
        if batch_values:
            f.write(f"INSERT INTO user_application ({columns_sql}) VALUES\n")
            f.write(",\n".join(batch_values) + ";\n\n")

        f.write("COMMIT;\n")

    print(f"✅ 成功生成 user_application SQL 到 {USER_APPLICATION_SQL_FILE}")



# 假設 all_users 已經生成完畢
# admin_user_id: 資管系管理人的 user_id
write_user_application_sql(all_users, '00000000-0000-0000-0000-000000000064')





"""
完整的 Python -> SQL 生成器

說明：此檔設計為直接接在你現有的使用者/學生產生程式後面執行（即假設程序中已經有 `all_users` 列表且其中包含 role=='student' 的使用者，且每個學生已包含 `student_id` 與 `registered_at`）。

輸入檔案依賴：
 - 課程名稱 CSV：`課程3.csv`（第 5 欄，index=4）

輸出：
 - insert_student_course_record.sql
 - insert_student_gpa.sql

主要規則（根據你的最新要求）：
 - 不指定每個 course_id 的最少人數或上限。
 - 在跨越的 n 個學期中，每個學期生成 5000 個 *全域唯一* 的 course_id（不同學期不得重複）。
 - course_id 格式為 3 個英文字母 + 5 位數字（例如 ABC01234）。
 - 每個 course_id 綁定固定的 credit（整數，從 [2,3,4] 中隨機選）與一個 course_name（來自課程3.csv）。
 - 每位學生於其應有的每個 semester 必須至少達到 15 學分（隨機分配課程，避免同一學期同一學生重複同一 course_id）。
 - 分數隨機從集合 [0, 1.7, 2.0, 2.3, 2.7, 3.0, 3.3, 3.7, 4.0, 4.3] 選取。
 - GPA 為該學期的加權平均（score * credit / sum(credit)），四捨五入到小數點第三位。
 - 當前學期視為 ROC 114-1，**不**包含在生成範圍內（與你要求一致）。

如果你要把本檔整合到現有程式中，請把整段貼在你現有程式碼的最後，並在同一個 Python 執行環境中執行（以便使用同一個 random seed、Faker 與 all_users）。

"""
# ---------------------------
# 可調參數（如需修改請在此調整）
# ---------------------------
COURSE_CSV = '課程_校碼3.csv'                 # 課程名稱 CSV（第5欄）
COURSE_SQL_FILE = 'insert_student_course_record.sql'
GPA_SQL_FILE = 'insert_student_gpa.sql'
COURSE_IDS_PER_SEM = 50               # 每個學期產生的 course_id 數量（全域唯一）
MIN_CREDIT_PER_STUDENT_PER_SEM = 10      # 每位學生每學期至少學分
COURSE_CREDIT_CHOICES = [2, 3, 4]        # course_id 的 credit 從此集合隨機選
SCORE_CHOICES = [0, 1.7, 2.0, 2.3, 2.7, 3.0, 3.3, 3.7, 4.0, 4.3]
# 目前學期設定（固定）：114-1 不包含
CURRENT_ROC_YEAR = 114
CURRENT_SEM_NO = 1
LAST_COMPLETED_ROC_YEAR = CURRENT_ROC_YEAR - 1
# ---------------------------

def read_course_names_from_csv(filename):
    names = []
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            for row in reader:
                if len(row) >= 5:
                    name = row[4].strip()
                    if name:
                        names.append(name)
    except FileNotFoundError:
        print(f"錯誤: 找不到 {filename}，將使用 fallback course names。")
    # 去重保留順序
    seen = set()
    uniq = []
    for n in names:
        if n not in seen:
            uniq.append(n)
            seen.add(n)
    if not uniq:
        # fallback
        uniq = [f"Course_{i}" for i in range(1, 1001)]
        print("警告: 使用 fallback 課程名稱清單（Course_1..Course_1000）。")
    return uniq

course_name_candidates = read_course_names_from_csv(COURSE_CSV)

# ---------------------------
# 產生 course_id（3 個英文大寫 + 5 位數字），確保全域唯一
# ---------------------------

def make_course_id(existing_set):
    while True:
        letters = ''.join(random.choices(string.ascii_uppercase, k=3))
        digits = f"{random.randint(0, 99999):05d}"
        cid = letters + digits
        if cid not in existing_set:
            existing_set.add(cid)
            return cid

# ---------------------------
# 計算每位學生應該存在的 semester（B / R 規則，與你指定一致）
# 假設 student dict 有 'student_id' 與 'registered_at'（datetime）
# ---------------------------

def semester_list_for_student(user):
    # 尋找 level
    sid = user.get('student_id', '')
    level = 'B'
    if sid and sid[0] in ('B', 'R'):
        level = sid[0]
    # 以 registered_at 的年分推 entry_year
    reg = user.get('registered_at')
    if reg is None:
        # 若沒有 registered_at，退回以 student_id 的年碼推（若有）
        # 否則假設 entry_year = CURRENT_ROC_YEAR - 1
        entry_year = CURRENT_ROC_YEAR - 1
    else:
        entry_year = reg.year - 1911
    semesters = []
    if level == 'B':
        start = entry_year
        end = LAST_COMPLETED_ROC_YEAR
        for y in range(start, end + 1):
            semesters.append(f"{y}-1")
            semesters.append(f"{y}-2")
    else:
        # R: undergraduate period (entry_year-4 .. entry_year-1) + graduate period (entry_year .. LAST_COMPLETED)
        ug_start = entry_year - 4
        ug_end = entry_year - 1
        for y in range(max(0, ug_start), ug_end + 1):
            semesters.append(f"{y}-1")
            semesters.append(f"{y}-2")
        for y in range(entry_year, LAST_COMPLETED_ROC_YEAR + 1):
            semesters.append(f"{y}-1")
            semesters.append(f"{y}-2")
    # filter out any sem with year > LAST_COMPLETED
    semesters = [s for s in semesters if int(s.split('-')[0]) <= LAST_COMPLETED_ROC_YEAR]
    # sort
    semesters = sorted(semesters, key=lambda s: (int(s.split('-')[0]), int(s.split('-')[1])))
    return semesters

# ---------------------------
# 主要生成程序
# ---------------------------

def generate_course_and_gpa(all_users):
    # 篩出學生
    student_users = [u for u in all_users if u.get('role') == 'student']
    if not student_users:
        raise ValueError('找不到任何 role=="student" 的使用者，請確認 all_users 是否正確。')

    # 為每位學生建立 semester 列表與 semester -> students index
    student_semesters = {}
    semester_students = defaultdict(list)
    for u in student_users:
        sems = semester_list_for_student(u)
        student_semesters[u['user_id']] = sems
        for s in sems:
            semester_students[s].append(u['user_id'])

    semesters_sorted = sorted(semester_students.keys(), key=lambda s: (int(s.split('-')[0]), int(s.split('-')[1])))
    print(f"將處理 {len(student_users)} 位學生，跨 {len(semesters_sorted)} 個學期。")

    # 為每個 semester 產生 COURSE_IDS_PER_SEM 個 course_id（且全域唯一）
    global_course_set = set()
    semester_offerings = {}  # sem -> list of course dicts {'course_id','credit','course_name'}

    for sem in semesters_sorted:
        offerings = []
        for _ in range(COURSE_IDS_PER_SEM):
            cid = make_course_id(global_course_set)
            credit = random.choice(COURSE_CREDIT_CHOICES)
            cname = random.choice(course_name_candidates)
            offerings.append({'course_id': cid, 'credit': credit, 'course_name': cname, 'assigned_students': set()})
        semester_offerings[sem] = offerings
        print(f"學期 {sem} 已生成 {len(offerings)} 門課程。")

    # 建立 course_id -> meta map for快速查詢
    course_meta = {}
    for sem, offerings in semester_offerings.items():
        for c in offerings:
            course_meta[c['course_id']] = {'credit': c['credit'], 'course_name': c['course_name'], 'semester': sem}

    # 為每位學生每學期分配課程，使其學分 >= MIN_CREDIT_PER_STUDENT_PER_SEM
    student_course_records = []
    for uid, sems in student_semesters.items():
        for sem in sems:
            offerings = semester_offerings[sem]
            # 為該學生在該學期挑選課程，直到 credit sum >= MIN...
            selected = set()
            selected_records = []
            total_credits = 0
            # 為了避免無窮迴圈，先把 offerings 的索引打亂
            pool = offerings.copy()
            random.shuffle(pool)
            pool_idx = 0
            # 若 pool 不足以滿足（理論上不會，因為每學期有 5000 門課），但還是保護
            while total_credits < MIN_CREDIT_PER_STUDENT_PER_SEM and pool_idx < len(pool):
                course = pool[pool_idx]
                pool_idx += 1
                cid = course['course_id']
                if cid in selected:
                    continue
                # assign
                selected.add(cid)
                total_credits += course['credit']
                course['assigned_students'].add(uid)
                selected_records.append({
                    'user_id': uid,
                    'semester': sem,
                    'course_id': cid,
                    'course_name': course['course_name'],
                    'credit': course['credit'],
                    'score': random.choice(SCORE_CHOICES)
                })
            # 若到最後仍不足，就從 pool 循環取，允許重複選不同 course
            # （但經設計不會發生，僅防護）
            if total_credits < MIN_CREDIT_PER_STUDENT_PER_SEM:
                # 再次循環整個 pool
                for course in pool:
                    cid = course['course_id']
                    if cid in selected:
                        continue
                    selected.add(cid)
                    total_credits += course['credit']
                    course['assigned_students'].add(uid)
                    selected_records.append({
                        'user_id': uid,
                        'semester': sem,
                        'course_id': cid,
                        'course_name': course['course_name'],
                        'credit': course['credit'],
                        'score': random.choice(SCORE_CHOICES)
                    })
                    if total_credits >= MIN_CREDIT_PER_STUDENT_PER_SEM:
                        break
            # 最後把 selected_records append 到全域 list
            student_course_records.extend(selected_records)

    print(f"✅ 生成課程紀錄完成，共 {len(student_course_records)} 筆紀錄。")

    # 計算每位學生每學期 GPA
    student_sem_records = defaultdict(list)
    for r in student_course_records:
        student_sem_records[(r['user_id'], r['semester'])].append(r)

    student_gpas = []
    for (uid, sem), recs in student_sem_records.items():
        total_weight = sum(r['credit'] for r in recs)
        if total_weight == 0:
            gpa = 0.0
        else:
            weighted = sum(r['score'] * r['credit'] for r in recs)
            gpa = round(weighted / total_weight, 3)
        student_gpas.append({'user_id': uid, 'semester': sem, 'gpa': gpa})

    print(f"✅ 計算 GPA 完成，共 {len(student_gpas)} 筆學期 GPA。")

    # 輸出 SQL
    BATCH_SIZE = 1000

    def write_student_course_sql(filename, records):
        with open(filename, 'w', encoding='utf-8') as f:
            f.write("-- PostgreSQL INSERT script for 'student_course_record' table (batch mode)\n\n")
            f.write("BEGIN;\n\n")

            batch = []
            for r in records:
                vals = [r['user_id'], r['semester'], r['course_id'], r['course_name'], r['credit'], r['score']]
                vals_sql = "(" + ", ".join([sql_value(v) for v in vals]) + ")"
                batch.append(vals_sql)

                # 滿 BATCH_SIZE 寫一次
                if len(batch) >= BATCH_SIZE:
                    f.write("INSERT INTO student_course_record (user_id, semester, course_id, course_name, credit, score) VALUES\n")
                    f.write(",\n".join(batch) + ";\n\n")
                    batch = []

            # 收尾如果還有剩
            if batch:
                f.write("INSERT INTO student_course_record (user_id, semester, course_id, course_name, credit, score) VALUES\n")
                f.write(",\n".join(batch) + ";\n\n")

            f.write("COMMIT;\n")

        print(f"🎉 已寫入 {len(records)} 筆 student_course_record 到 {filename}（batch 模式）。")


    def write_student_gpa_sql(filename, gpa_records):
        with open(filename, 'w', encoding='utf-8') as f:
            f.write("-- PostgreSQL INSERT script for 'student_gpa' table (batch mode)\n\n")
            f.write("BEGIN;\n\n")

            batch = []
            for g in gpa_records:
                vals = [g['user_id'], g['semester'], g['gpa']]
                vals_sql = "(" + ", ".join([sql_value(v) for v in vals]) + ")"
                batch.append(vals_sql)

                if len(batch) >= BATCH_SIZE:
                    f.write("INSERT INTO student_gpa (user_id, semester, gpa) VALUES\n")
                    f.write(",\n".join(batch) + ";\n\n")
                    batch = []

            if batch:
                f.write("INSERT INTO student_gpa (user_id, semester, gpa) VALUES\n")
                f.write(",\n".join(batch) + ";\n\n")

            f.write("COMMIT;\n")

        print(f"🎉 已寫入 {len(gpa_records)} 筆 student_gpa 到 {filename}（batch 模式）。")


    write_student_course_sql(COURSE_SQL_FILE, student_course_records)
    write_student_gpa_sql(GPA_SQL_FILE, student_gpas)

    # 回傳一些檢查資訊
    return {
        'num_students': len(student_users),
        'num_semesters': len(semesters_sorted),
        'num_course_ids_generated': len(global_course_set),
        'num_course_records': len(student_course_records),
        'num_gpa_records': len(student_gpas)
    }


try:
    info = generate_course_and_gpa(all_users)
    print('\n--- SUMMARY ---')
    for k, v in info.items():
        print(f"{k}: {v}")
except NameError:
    print("錯誤：找不到名為 all_users 的變數。請把本段貼在包含 all_users 的程式後執行，或自行定義 all_users 變數（list of dicts，role=='student'）。")

def generate_student_department_records(all_users, department_data):
    """為每位學生產生 student_department 記錄 (major / minor / double_major / transfer)"""
    dept_codes = [d['code'] for d in department_data]
    student_dept_rows = []

    for user in all_users:
        if user['role'] != 'student':
            continue

        semesters = semester_list_for_student(user)
        if not semesters:
            continue
        
        # 主系（必要）
        main_dept = user['main_dept_code']
        major_start = semesters[0]
        major_end = semesters[-1]

        student_dept_rows.append({
            "user_id": user['user_id'],
            "department_id": main_dept,
            "role": "major",
            "start_semester": major_start,
            "end_semester": major_end
        })

        # -----------------------------------------------------------
        # A. 有 10–20% 機率轉系：major → 不同系（起始學期仍然是上學期）
        # -----------------------------------------------------------
        if random.random() < 0.15:
            # 隨機新科系
            new_major_dept = random.choice([c for c in dept_codes if c != main_dept])

            # 找一個「上學期」作為轉系開始
            eligible_semesters = [s for s in semesters if s.endswith("-1")]
            if len(eligible_semesters) > 2:
                transfer_start = random.choice(eligible_semesters[1:])  # 至少大二後才能轉系
                transfer_end = semesters[-1]

                student_dept_rows.append({
                    "user_id": user['user_id'],
                    "department_id": new_major_dept,
                    "role": "major",
                    "start_semester": transfer_start,
                    "end_semester": transfer_end
                })

        # -----------------------------------------------------------
        # B. minor（15–25%）
        # -----------------------------------------------------------
        if random.random() < 0.20:
            minor_dept = random.choice([c for c in dept_codes if c != main_dept])

            eligible_semesters = [s for s in semesters if s.endswith("-1")]
            if eligible_semesters:
                minor_start = random.choice(eligible_semesters)
                # minor 通常持續 3~7 學期
                idx = semesters.index(minor_start)
                end_idx = min(idx + random.randint(3, 7), len(semesters) - 1)
                minor_end = semesters[end_idx]

                student_dept_rows.append({
                    "user_id": user['user_id'],
                    "department_id": minor_dept,
                    "role": "minor",
                    "start_semester": minor_start,
                    "end_semester": minor_end
                })

        # -----------------------------------------------------------
        # C. double major（10–15%）
        # -----------------------------------------------------------
        if random.random() < 0.12:
            double_major_dept = random.choice([c for c in dept_codes if c != main_dept])

            eligible_semesters = [s for s in semesters if s.endswith("-1")]
            if eligible_semesters:
                dm_start = random.choice(eligible_semesters)
                idx = semesters.index(dm_start)
                end_idx = min(idx + random.randint(4, 8), len(semesters) - 1)
                dm_end = semesters[end_idx]

                student_dept_rows.append({
                    "user_id": user['user_id'],
                    "department_id": double_major_dept,
                    "role": "double_major",
                    "start_semester": dm_start,
                    "end_semester": dm_end
                })

    return student_dept_rows


BATCH_SIZE = 1000

def write_student_department_sql(rows, filename="insert_student_department.sql"):
    with open(filename, "w", encoding="utf-8") as f:
        f.write("-- insert for student_department (batch mode)\nBEGIN;\n\n")

        batch = []

        for r in rows:
            vals = [
                r['user_id'],
                r['department_id'],
                r['role'],
                r['start_semester'],
                r['end_semester']
            ]
            vals_sql = "(" + ", ".join(sql_value(v) for v in vals) + ")"
            batch.append(vals_sql)

            # 每 1000 筆寫一次
            if len(batch) >= BATCH_SIZE:
                f.write(
                    "INSERT INTO student_department "
                    "(user_id, department_id, role, start_semester, end_semester) VALUES\n"
                )
                f.write(",\n".join(batch) + ";\n\n")
                batch = []

        # 處理最後沒滿的 batch
        if batch:
            f.write(
                "INSERT INTO student_department "
                "(user_id, department_id, role, start_semester, end_semester) VALUES\n"
            )
            f.write(",\n".join(batch) + ";\n\n")

        f.write("COMMIT;\n")


student_dept_rows = generate_student_department_records(all_users, department_data)

write_student_department_sql(student_dept_rows)

def generate_resource_uuid(n):
    """
    模仿 generate_sequential_uuid()，但 prefix 從 '0001' 換成 '0002'
    n 從 1 開始遞增
    """
    # n 轉成 12 位
    tail = f"{n:012d}"
    return f"00000000-0000-0000-0002-{tail}"
def generate_resources(all_users, NUM_RESOURCE=200):
    """
    生成資源資料，新 schema: supplier_id 指向 user_id
    保留原邏輯，只修正 supplier_id 與 title/description 對應
    """
    supplier_users = [u for u in all_users if u['role'] in ['department','company']]

    resources = []
    TZ_NOW = datetime.now(TZ)

    for i in range(1, NUM_RESOURCE + 1):
        resource_id = generate_resource_uuid(i)
        resource_type = random.choice(['Scholarship', 'Internship', 'Lab', 'Competition', 'Others'])
        quota = random.randint(2, 10)

        # 隨機選供應者
        if supplier_users:
            supplier = random.choice(supplier_users)
            supplier_id = supplier['user_id']
            # 根據 role 決定名稱
            if supplier['role'] == 'department':
                supplier_name = (supplier.get('nickname') or supplier.get('real_name')).replace("聯絡人", "")
            else:
                supplier_name = (supplier.get('company_name') or supplier.get('nickname') or supplier.get('real_name'))
        else:
            supplier_id = None
            supplier_name = "未知單位"

        # title / description
        if resource_type == 'Scholarship':
            title = f"{supplier_name}獎學金"
        elif resource_type == 'Internship':
            title = f"{supplier_name}實習機會"
        elif resource_type == 'Lab':
            title = f"{supplier_name}實驗室機會"
        elif resource_type == 'Competition':
            title = f"{supplier_name}競賽資源"
        else:
            title = f"{supplier_name}其他資源"

        description = title

        # deadline 隨機 ±1.5 年
        deadline = TZ_NOW.date() + timedelta(days=random.randint(-550, 550))

        # status 分配
        if deadline < TZ_NOW.date():  # 已過期
            status = random.choices(['Full','Unavailable'], weights=[0.5,0.5])[0]
        else:  # 未過期
            status = random.choices(['Available','Canceled','Full'], weights=[0.6,0.1,0.3])[0]

        resources.append({
            "resource_id": resource_id,
            "resource_type": resource_type,
            "quota": quota,
            "supplier_id": supplier_id,
            "title": title,
            "deadline": deadline,
            "description": description,
            "status": status
        })

    return resources


BATCH_SIZE = 1000

def write_resource_sql(resources, filename="insert_resource.sql"):
    with open(filename, "w", encoding="utf-8") as f:
        f.write("-- PostgreSQL INSERT for resource (batch mode)\nBEGIN;\n\n")

        cols = ("resource_id, resource_type, quota, supplier_id, title, deadline, description, status")

        batch = []

        for r in resources:
            vals = [
                r["resource_id"],
                r["resource_type"],
                r["quota"],
                r["supplier_id"],
                r["title"],
                r["deadline"],
                r["description"],
                r["status"]
            ]
            vals_sql = "(" + ", ".join(sql_value(v) for v in vals) + ")"
            batch.append(vals_sql)

            # 寫入一個 batch
            if len(batch) >= BATCH_SIZE:
                f.write(f"INSERT INTO resource ({cols}) VALUES\n")
                f.write(",\n".join(batch) + ";\n\n")
                batch = []

        # 收尾未滿 batch 的資料
        if batch:
            f.write(f"INSERT INTO resource ({cols}) VALUES\n")
            f.write(",\n".join(batch) + ";\n\n")

        f.write("COMMIT;\n")


# 生成並寫入 SQL
resources = generate_resources(all_users, NUM_RESOURCE=200)
write_resource_sql(resources, filename="insert_resource.sql")

RESOURCE_CONDITION_SQL_FILE = "insert_resource_condition.sql"

def generate_resource_conditions(resources, department_data):
    """
    生成 resource_condition 假資料。
    如果 resource 的 supplier 是 department，必須包含自己。
    """
    resource_conditions = []

    # 建立 mapping: department user_id -> department_code
    dept_user_ids = {dept['contact_person_id']: dept['code'] for dept in department_data}
    dept_codes = [dept['code'] for dept in department_data]

    for r in resources:
        # 隨機選一些科系，至少 1 個
        num_depts = random.randint(1, len(dept_codes))
        selected_depts = random.sample(dept_codes, num_depts)

        # 如果 supplier 是 department，必須包含它
        if r['supplier_id'] in dept_user_ids:
            supplier_dept_code = dept_user_ids[r['supplier_id']]
            if supplier_dept_code not in selected_depts:
                # 把第一個替換成 supplier 自己
                selected_depts[0] = supplier_dept_code

        for dept_code in selected_depts:
            # avg_gpa: 50% 機率有值，介於 3.7~4.3
            avg_gpa = round(random.uniform(3.7, 4.3), 2) if random.random() < 0.5 else None

            # current_gpa: 50% 機率有值，介於 3.7~4.3
            current_gpa = round(random.uniform(3.7, 4.3), 2) if random.random() < 0.5 else None

            # is_poor: 只有 Scholarship 可能 True，20% 機率
            is_poor = r['resource_type'] == 'Scholarship' and random.random() < 0.2

            resource_conditions.append({
                'resource_id': r['resource_id'],
                'department_id': dept_code,
                'avg_gpa': avg_gpa,
                'current_gpa': current_gpa,
                'is_poor': is_poor
            })

    return resource_conditions


BATCH_SIZE = 1000

def write_resource_condition_sql(resource_conditions, filename=RESOURCE_CONDITION_SQL_FILE):
    with open(filename, "w", encoding="utf-8") as f:
        f.write("-- PostgreSQL INSERT for resource_condition (batch mode)\nBEGIN;\n\n")

        cols = "resource_id, department_id, avg_gpa, current_gpa, is_poor"
        batch = []

        for rc in resource_conditions:
            vals = [
                rc['resource_id'],
                rc['department_id'],
                rc['avg_gpa'],
                rc['current_gpa'],
                rc['is_poor']
            ]
            vals_sql = "(" + ", ".join(sql_value(v) for v in vals) + ")"
            batch.append(vals_sql)

            # 每 1000 筆寫入一次
            if len(batch) >= BATCH_SIZE:
                f.write(f"INSERT INTO resource_condition ({cols}) VALUES\n")
                f.write(",\n".join(batch) + ";\n\n")
                batch = []

        # 寫入最後一批未達 1000 筆的資料
        if batch:
            f.write(f"INSERT INTO resource_condition ({cols}) VALUES\n")
            f.write(",\n".join(batch) + ";\n\n")

        f.write("COMMIT;\n")

    print(f"🎉 成功生成 {len(resource_conditions)} 筆 'resource_condition' 資料到 {filename}（batch）")



# ---------------- 使用範例 ----------------

resource_conditions = generate_resource_conditions(resources, department_data)
write_resource_condition_sql(resource_conditions)


APPLICATION_SQL_FILE = "insert_application.sql"
def generate_applications(all_users, resources, max_apply_per_student=5):
    student_users = [u for u in all_users if u['role'] == 'student']
    applications = []

    # 用來追蹤每個 resource 的 approved 人數
    approved_count = {r['resource_id']: 0 for r in resources}

    for student in student_users:
        num_apply = random.randint(1, max_apply_per_student)
        selected_resources = random.sample(resources, num_apply)

        for r in selected_resources:
            apply_start = student['registered_at'].date()
            apply_end = min(r['deadline'], datetime.now(TZ).date()) if r['deadline'] else datetime.now(TZ).date()
            if apply_start > apply_end:
                apply_date = apply_end
            else:
                apply_date = apply_start + timedelta(days=random.randint(0, (apply_end - apply_start).days))

            quota_full = approved_count[r['resource_id']] >= r['quota']

            if r['status'] == 'Canceled':
                review_status = 'rejected'
            elif r['status'] == 'Full':
                # 先 approved 到 quota，剩下都是 rejected
                if not quota_full:
                    review_status = 'approved'
                else:
                    review_status = 'rejected'
            elif r['status'] == 'Unavailable':
                choices = ['under_review', 'approved', 'rejected']
                weights = [0.4, 0.4, 0.2]
                if quota_full:
                    choices.remove('approved')
                    weights = [w for c, w in zip(['under_review','approved','rejected'], weights) if c in choices]
                review_status = random.choices(choices, weights=weights)[0]
            else:  # Available
                choices = ['submitted','under_review','approved','rejected']
                weights = [0.3, 0.3, 0.2, 0.2]
                if quota_full:
                    choices.remove('approved')
                    weights = [w for c, w in zip(['submitted','under_review','approved','rejected'], weights) if c in choices]
                review_status = random.choices(choices, weights=weights)[0]

            if review_status == 'approved':
                approved_count[r['resource_id']] += 1

            applications.append({
                'user_id': student['user_id'],
                'resource_id': r['resource_id'],
                'apply_date': apply_date,
                'review_status': review_status
            })

    return applications



BATCH_SIZE = 1000

def write_application_sql(applications, filename=APPLICATION_SQL_FILE):
    with open(filename, "w", encoding="utf-8") as f:
        f.write("-- PostgreSQL INSERT for application (batch mode)\nBEGIN;\n\n")

        cols = "user_id, resource_id, apply_date, review_status"
        batch = []

        for a in applications:
            vals = [
                a['user_id'],
                a['resource_id'],
                a['apply_date'],
                a['review_status']
            ]
            vals_sql = "(" + ", ".join(sql_value(v) for v in vals) + ")"
            batch.append(vals_sql)

            # 每 BATCH_SIZE 筆寫一次
            if len(batch) >= BATCH_SIZE:
                f.write(f"INSERT INTO application ({cols}) VALUES\n")
                f.write(",\n".join(batch) + ";\n\n")
                batch = []

        # 寫入不到 BATCH_SIZE 的最後一批
        if batch:
            f.write(f"INSERT INTO application ({cols}) VALUES\n")
            f.write(",\n".join(batch) + ";\n\n")

        f.write("COMMIT;\n")



# 使用範例
applications = generate_applications(all_users, resources)
write_application_sql(applications)



ACHIEVEMENT_SQL_FILE = 'insert_achievement.sql'

def generate_achievement_uuid(n):
    """
    生成固定前綴 + 序號的 UUID 字串
    例如：
      1 -> 00000000-0000-0000-0000-000000000001
      2 -> 00000000-0000-0000-0000-000000000002
    """
    return f"00000000-0000-0000-0004-{n:012d}"
def generate_achievements(all_users, department_data, max_per_student=6):
    TZ = datetime.now().astimezone().tzinfo

    student_users = [u for u in all_users if u['role'] == 'student']
    achievements = []
    achievement_data = 1

    for student in student_users:
        num_achievements = random.randint(0, max_per_student)  # 學生可能 0~3 筆
        entry_year = student['entry_year']  # ← 使用 student_profile 統一過的 entry_year
        entry_date = datetime(entry_year + 1911, 9, 1, tzinfo=TZ)

        for _ in range(num_achievements):

            category = random.choice([
                'Competition', 'Research', 'Intern', 'Project', 'Others'
            ])

            # ---------- Title / Description ----------
            if random.random() < 0.5:
                source = random.choice([d['name'] for d in department_data])
            else:
                companies = [u['company_name'] for u in all_users if u['role']=='company']
                source = random.choice(companies) if companies else "某單位"

            if category == 'Competition':
                title = f"{source}競賽第{random.randint(1, 10)}名"
            elif category == 'Research':
                title = f"{source}研究成果"
            elif category == 'Intern':
                title = f"{source}實習計畫"
            elif category == 'Project':
                title = f"{source}專案合作"
            else:
                title = f"{source}參與活動"

            description = f"{title}相關說明。"

            # ---------- Start / End Date 必須在入學之後 ----------
            days_after_entry = random.randint(30, 900)
            start_date = entry_date + timedelta(days=days_after_entry)

            # Intern / Project：end_date 可能比 creation_date 晚（ongoing）
            if category in ['Intern', 'Project']:
                end_date = start_date + timedelta(days=random.randint(30, 200))
            else:
                # 一般活動：結束時間正常結束
                end_date = start_date + timedelta(days=random.randint(1, 90))

            # ---------- creation_date 必須大於 start_date ----------
            creation_date = start_date + timedelta(days=random.randint(1, 30))
            
            # ---------- status ----------
            r = random.random()
            if r < 0.05:
                status = 'rejected'
            elif r < 0.15:
                status = 'unrecognized'
            else:
                status = 'recognized'
            achievement_uuid = generate_achievement_uuid(achievement_data)
            achievement_data += 1
            achievements.append({
                'achievement_id': achievement_uuid,  # <- 自動生成 UUID
                "user_id": student['user_id'],
                "category": category,
                "title": title,
                "description": description,
                "start_date": start_date,
                "end_date": end_date,
                "creation_date": creation_date,
                "status": status
            })

    return achievements


# ------------------ 寫 SQL ------------------

BATCH_SIZE = 1000

def write_achievement_sql(achievements, filename=ACHIEVEMENT_SQL_FILE):

    with open(filename, 'w', encoding='utf-8') as f:
        f.write("-- PostgreSQL INSERT script for achievement (batch mode)\nBEGIN;\n\n")

        cols = (
            "achievement_id, user_id, category, title, description, "
            "start_date, end_date, creation_date, status"
        )

        batch = []

        for a in achievements:
            vals = [
                a['achievement_id'],
                a['user_id'],
                a['category'],
                a['title'],
                a['description'],
                a['start_date'].date(),     # DATE
                a['end_date'].date(),       # DATE
                a['creation_date'],         # TIMESTAMP
                a['status']
            ]
            vals_sql = "(" + ", ".join(sql_value(v) for v in vals) + ")"
            batch.append(vals_sql)

            # 每 1000 筆寫一次
            if len(batch) >= BATCH_SIZE:
                f.write(f"INSERT INTO achievement ({cols}) VALUES\n")
                f.write(",\n".join(batch) + ";\n\n")
                batch = []

        # 寫剩下的小批次
        if batch:
            f.write(f"INSERT INTO achievement ({cols}) VALUES\n")
            f.write(",\n".join(batch) + ";\n\n")

        f.write("COMMIT;\n")

    print(f"🎉 成功生成 {len(achievements)} 筆 'achievement' 資料到 {filename}（batch）。")


achievements = generate_achievements(all_users, department_data)

# 寫入 SQL
write_achievement_sql(achievements)

ACHIEVEMENT_VERIFICATION_SQL_FILE = "insert_achievement_verification.sql"

def generate_achievement_verifications(achievements, all_users, max_verifiers=3):
    """
    生成 achievement_verification 假資料
    """
    verifications = []
    for ach in achievements:
        num_verifiers = random.randint(1, max_verifiers)
        for i in range(num_verifiers):
            # 隨機選 verifier type
            verifier_type = random.choice(['department', 'company', 'professor'])
            
            # verifier_email 模擬
            if verifier_type == 'department':
                dept_users = [u for u in all_users if u['role'] == 'department']
                verifier_email = random.choice(dept_users)['email'] if dept_users else 'dept@example.com'
            elif verifier_type == 'company':
                comp_users = [u for u in all_users if u['role'] == 'company']
                verifier_email = random.choice(comp_users)['email'] if comp_users else 'comp@example.com'
            else:
                verifier_email = f"prof{i}@example.com"

            # 根據 achievement.status 設定 verification_status
            if ach['status'] == 'recognized':
                verification_status = 'approved'
            elif ach['status'] == 'rejected':
                # 至少有一個是 rejected
                if i == 0:
                    verification_status = 'rejected'
                else:
                    verification_status = random.choice(['approved','rejected', 'pending'])
            else:  # unrecognized
                verification_status = random.choice(['pending','approved'])

            # created_at: achievement.created_at 後 2~3 分鐘
            created_at = ach['creation_date'] + timedelta(minutes=random.randint(2,3))

            # decided_at: 只有 approved/rejected 才有
            if verification_status in ['approved','rejected']:
                decided_at = created_at + timedelta(minutes=random.randint(1,10))
            else:
                decided_at = None

            verifications.append({
                'achievement_id': ach['achievement_id'],
                'verifier_type': verifier_type,
                'verifier_email': verifier_email,
                'verification_status': verification_status,
                'created_at': created_at,
                'decided_at': decided_at
            })
    return verifications

BATCH_SIZE = 1000

def write_achievement_verification_sql(verifications, filename=ACHIEVEMENT_VERIFICATION_SQL_FILE):
    with open(filename, 'w', encoding='utf-8') as f:
        f.write("-- PostgreSQL INSERT script for achievement_verification (batch mode)\nBEGIN;\n\n")
        cols = "achievement_id, verifier_type, verifier_email, verification_status, created_at, decided_at"

        batch = []

        for v in verifications:
            vals = [
                v['achievement_id'],
                v['verifier_type'],
                v['verifier_email'],
                v['verification_status'],
                v['created_at'],
                v['decided_at']
            ]
            vals_sql = "(" + ", ".join(sql_value(vv) for vv in vals) + ")"
            batch.append(vals_sql)

            # 每 1000 筆輸出一次
            if len(batch) >= BATCH_SIZE:
                f.write(f"INSERT INTO achievement_verification ({cols}) VALUES\n")
                f.write(",\n".join(batch) + ";\n\n")
                batch = []

        # 最後不足 1000 的數量也輸出
        if batch:
            f.write(f"INSERT INTO achievement_verification ({cols}) VALUES\n")
            f.write(",\n".join(batch) + ";\n\n")

        f.write("COMMIT;\n")

    print(f"🎉 成功生成 {len(verifications)} 筆 'achievement_verification' 資料到 {filename}（batch）。")



# 假設你已經生成了 achievements 與 all_users
verifications = generate_achievement_verifications(achievements, all_users)
# 將 SQL 輸出到檔案
write_achievement_verification_sql(verifications)

PUSH_RECORD_SQL_FILE = "insert_push_record.sql"

def to_datetime_safe(dt):
    """
    將 date / datetime 統一轉成 tz-aware datetime
    """
    if isinstance(dt, datetime):
        if dt.tzinfo is None:
            # tz-naive → 加上 TZ
            return dt.replace(tzinfo=TZ)
        return dt
    # dt 是 date → 轉成 tz-aware datetime
    return datetime(dt.year, dt.month, dt.day, tzinfo=TZ)


def generate_push_records(all_users, resources, department_data, push_prob=0.01, max_push_per_resource=1000):
    student_users = [u for u in all_users if u['role']=='student']
    pushers = [u for u in all_users if u['role'] in ('department','company')]

    dept_user_ids = {dept['contact_person_id']: dept['code'] for dept in department_data}

    push_records = []
    push_id = 1
    resource_push_count = {r['resource_id']: 0 for r in resources}

    for pusher in pushers:
        # 找出該 pusher 自己的資源
        own_resources = []
        for r in resources:
            if pusher['role'] == 'department':
                r_dept_code = dept_user_ids.get(r['supplier_id'])
                pusher_dept_code = dept_user_ids.get(pusher['user_id'])
                if r_dept_code == pusher_dept_code or r['supplier_id'] == pusher['user_id']:
                    own_resources.append(r)
            else:
                if r['supplier_id'] == pusher['user_id']:
                    own_resources.append(r)

        for r in own_resources:
            if resource_push_count[r['resource_id']] >= max_push_per_resource:
                continue

            num_receivers = random.randint(1, min(len(student_users), max_push_per_resource - resource_push_count[r['resource_id']]))
            receivers = random.sample(student_users, num_receivers)

            # 1% 機率推送非自己資源
            if random.random() < push_prob:
                non_own_resources = [res for res in resources if res not in own_resources]
                if non_own_resources:
                    r = random.choice(non_own_resources)

            # 同一次 push 的時間
            start_dt = to_datetime_safe(pusher['registered_at'])
            earliest_receiver_reg = min([to_datetime_safe(s['registered_at']) for s in receivers])
            start_dt = max(start_dt, earliest_receiver_reg)
            end_dt = to_datetime_safe(r.get('deadline')) if r.get('deadline') else datetime.now(TZ)
            if end_dt <= start_dt:
                push_datetime = start_dt
            else:
                delta_days = (end_dt - start_dt).days
                push_datetime = start_dt + timedelta(days=random.randint(0, delta_days))

            for receiver in receivers:
                push_records.append({
                    'push_id': push_id,
                    'pusher_id': pusher['user_id'],
                    'receiver_id': receiver['user_id'],
                    'resource_id': r['resource_id'],
                    'push_datetime': push_datetime
                })
                push_id += 1
                resource_push_count[r['resource_id']] += 1
                if resource_push_count[r['resource_id']] >= max_push_per_resource:
                    break

    # 按時間排序，重新分配 push_id
    push_records.sort(key=lambda x: x['push_datetime'])
    for idx, rec in enumerate(push_records, start=1):
        rec['push_id'] = idx

    return push_records





def write_push_record_sql(push_records, filename=PUSH_RECORD_SQL_FILE, batch_size=1000):
    with open(filename, 'w', encoding='utf-8') as f:
        f.write("-- PostgreSQL INSERT script for push_record\nBEGIN;\n\n")

        cols = "push_id, pusher_id, receiver_id, resource_id, push_datetime"

        batch = []
        for i, r in enumerate(push_records):
            vals = [r['push_id'], r['pusher_id'], r['receiver_id'], r['resource_id'], r['push_datetime']]
            vals_sql = "(" + ", ".join(sql_value(v) for v in vals) + ")"
            batch.append(vals_sql)

            # 每 batch_size 寫一次
            if len(batch) == batch_size:
                f.write(f"INSERT INTO push_record ({cols}) VALUES\n")
                f.write(",\n".join(batch) + ";\n\n")
                batch = []

        # 寫最後一批
        if batch:
            f.write(f"INSERT INTO push_record ({cols}) VALUES\n")
            f.write(",\n".join(batch) + ";\n\n")

        f.write("COMMIT;\n")

    print(f"🎉 成功以批次方式生成 {len(push_records)} 筆 'push_record' 至 {filename}")

# 生成 push_record
push_records = generate_push_records(all_users, resources, department_data)
write_push_record_sql(push_records)




sql_files = ["insert_user_data.sql","insert_department_profile.sql", "insert_student_profile.sql", "insert_company_profile.sql", "user_application.sql", "user_fk_update.sql", "insert_student_gpa.sql", "insert_student_course_record.sql", "insert_student_department.sql", "insert_resource.sql", "insert_resource_condition.sql", "insert_application.sql", "insert_achievement.sql", "insert_achievement_verification.sql", "insert_push_record.sql"]
with open("merged.sql", "w", encoding="utf-8") as fout:
    for filename in sql_files:
        with open(filename, "r", encoding="utf-8") as fin:
            fout.write(fin.read())
            fout.write("\n")