import uuid
import random
import csv
import re
from faker import Faker
from datetime import date, datetime, timedelta, timezone
from io import StringIO
import string
import math
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
DEFAULT_PASSWORD_HASH = "$2b$10$X1y/p.tXz/fJ9kG4c0hP0.W2s3D4E5F6G7H8I9J0K"

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
    
    if isinstance(value, date):
        return f"'{value.strftime('%Y-%m-%d')}'"
    
    if isinstance(value, bool):
        return 'TRUE' if value else 'FALSE'
    if isinstance(value, (datetime, date)):
        return f"'{v.strftime('%Y-%m-%d')}'"
    
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
        safe_abbr = re.sub(r'[^a-zA-Z0-9]', '', dept['abbr'])  # 只保留英文和數字
        if not safe_abbr:  # 如果全是中文，改成英文代碼
            safe_abbr = dept['code'].lower()
        user = {
            'user_id': user_id,
            'real_name': real_name,
            'email': fake_ch.unique.email(),
            # 使用 dept name 的前幾個字母和唯一後綴
            'username': f"{safe_abbr}_host_{get_suffix()}",
            'password': DEFAULT_PASSWORD_HASH,
            # 使用完整的學系名稱
            'nickname': generate_nickname('department', real_name, dept_name=dept['name']),
            'role': 'department',
            'is_admin': False,
            'registered_at': registered_at,
            'deleted_at': datetime(9999, 12, 31, 23, 59, 59, tzinfo=TZ)
        }
        all_users.append(user)
        dept['contact_person_id'] = user_id # 供後續 profile 表使用
    
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
            "is_admin", "registered_at", "deleted_at"
        ]
        
        columns_sql = ", ".join(columns)
        
        for user in all_users:
            values = [
                user['user_id'], user['real_name'], user['email'], user['username'], 
                user['password'], user['nickname'], user['role'], user['is_admin'],
                user['registered_at'], user['deleted_at']
            ]
            
            values_sql = ", ".join([sql_value(v) for v in values])
            
            f.write(f'INSERT INTO "user" ({columns_sql}) VALUES ({values_sql});\n')
            
        f.write("\nCOMMIT;\n")

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
    with open(DEPARTMENT_PROFILE_SQL_FILE, 'w', encoding='utf-8') as f:
        f.write("-- PostgreSQL INSERT script for 'department_profile' table\n\n")
        f.write("BEGIN;\n\n")
        for dept in department_data:
            dept_id = dept['code']
            dept_name = dept['name']
            contact_uuid = dept['contact_person_id']
            f.write(f"INSERT INTO department_profile (department_id, department_name, contact_person) VALUES ('{dept_id}', '{dept_name}', '{contact_uuid}');\n")
        f.write("\nCOMMIT;\n")
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
INDUSTRY_BOX = ['科技業','生技業','服務業']
used_company_ids = set()

def write_company_profile_sql(all_users):
    company_users = [u for u in all_users if u['role'] == 'company']
    with open(COMPANY_PROFILE_SQL_FILE, 'w', encoding='utf-8') as f:
        f.write("-- PostgreSQL INSERT script for 'company_profile' table\n\n")
        f.write("BEGIN;\n\n")
        for u in company_users:
            company_id = generate_sequential_company_uuid(int(u['user_id'][-12:]))  # 取 user_id 最後 12 位轉數字
            company_name = sql_value(u['company_name'])
            contact_uuid = u['user_id']
            industry = random.choice(INDUSTRY_BOX)
            f.write(f"INSERT INTO company_profile (company_id, company_name, contact_person, industry) VALUES ('{company_id}', {company_name}, '{contact_uuid}', '{industry}');\n")
        f.write("\nCOMMIT;\n")
    print(f"🎉 成功生成 {len(company_users)} 筆 'company_profile' 資料到 {COMPANY_PROFILE_SQL_FILE}。")

# 呼叫函數
write_company_profile_sql(all_users)

STUDENT_PROFILE_SQL_FILE = 'insert_student_profile.sql'

def write_student_profile_sql(all_users):
    student_users = [u for u in all_users if u['role'] == 'student']

    # 用於避免每個系每年流水號重複
    dept_used_numbers = {}

    with open(STUDENT_PROFILE_SQL_FILE, 'w', encoding='utf-8') as f:
        f.write("-- PostgreSQL INSERT script for 'student_profile' table\n\n")
        f.write("BEGIN;\n\n")

        for u in student_users:
            entry_year = u['registered_at'].year - 1911
            year_code = str(entry_year)[-2:]
            level = random.choice(['B', 'R'])
            dept_code = u['main_dept_code']
            dept_code_short = dept_code[:3]

            year_dept_key = f"{entry_year}_{dept_code_short}"

            # 初始化序號
            if year_dept_key not in dept_used_numbers:
                dept_used_numbers[year_dept_key] = 1

            student_number = f"{dept_used_numbers[year_dept_key]:03d}"
            dept_used_numbers[year_dept_key] += 1

            # 組成學號
            student_id = f"{level}{year_code}{dept_code_short}{student_number}"
            u['student_id'] = student_id   # <-- 這行非常重要：把學號回寫回 all_users

            grade = datetime.now().year - (entry_year + 1911) + 1

            f.write(f"INSERT INTO student_profile (user_id, student_id, department_id, entry_year, grade) "
                    f"VALUES ('{u['user_id']}', '{student_id}', '{dept_code}', {entry_year}, {grade});\n")

        f.write("\nCOMMIT;\n")

    print(f"🎉 成功生成 {len(student_users)} 筆 'student_profile' 資料到 {STUDENT_PROFILE_SQL_FILE}。")

# 呼叫函數
write_student_profile_sql(all_users)





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
    def write_student_course_sql(filename, records):
        with open(filename, 'w', encoding='utf-8') as f:
            f.write("-- PostgreSQL INSERT script for 'student_course_record' table\n\n")
            f.write("BEGIN;\n\n")
            for r in records:
                vals = [r['user_id'], r['semester'], r['course_id'], r['course_name'], r['credit'], r['score']]
                vals_sql = ", ".join([sql_value(v) for v in vals])
                f.write(f"INSERT INTO student_course_record (user_id, semester, course_id, course_name, credit, score) VALUES ({vals_sql});\n")
            f.write("\nCOMMIT;\n")
        print(f"🎉 已寫入 {len(records)} 筆 student_course_record 到 {filename}。")

    def write_student_gpa_sql(filename, gpa_records):
        with open(filename, 'w', encoding='utf-8') as f:
            f.write("-- PostgreSQL INSERT script for 'student_gpa' table\n\n")
            f.write("BEGIN;\n\n")
            for g in gpa_records:
                vals = [g['user_id'], g['semester'], g['gpa']]
                vals_sql = ", ".join([sql_value(v) for v in vals])
                f.write(f"INSERT INTO student_gpa (user_id, semester, gpa) VALUES ({vals_sql});\n")
            f.write("\nCOMMIT;\n")
        print(f"🎉 已寫入 {len(gpa_records)} 筆 student_gpa 到 {filename}。")

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


def write_student_department_sql(rows, filename="insert_student_department.sql"):
    with open(filename, "w", encoding="utf-8") as f:
        f.write("-- insert for student_department\nBEGIN;\n\n")

        for r in rows:
            f.write(
                "INSERT INTO student_department (user_id, department_id, role, start_semester, end_semester) "
                f"VALUES ({sql_value(r['user_id'])}, {sql_value(r['department_id'])}, "
                f"{sql_value(r['role'])}, {sql_value(r['start_semester'])}, {sql_value(r['end_semester'])});\n"
            )

        f.write("\nCOMMIT;\n")

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
def generate_resources(all_users, department_data, num_resources=200):
    """
    依照規格隨機生成資源資料。
    """

    # 找出 department profiles（用 dept['code'] 對應）
    dept_codes = [d['code'] for d in department_data]

    # 找出所有公司（從 all_users role == company）
    company_users = [u for u in all_users if u['role'] == 'company']

    resources = []
    TZ_NOW = datetime.now(TZ)
    company_user_to_profile_id = {
        u['user_id']: generate_sequential_company_uuid(int(u['user_id'][-12:]))
        for u in all_users if u['role'] == 'company'
    }
    for i in range(1, num_resources + 1):
        resource_id = generate_resource_uuid(i)

        # 隨機選 resource type
        resource_type = random.choice(['Scholarship', 'Internship', 'Lab', 'Others'])

        # quota = 2~10
        quota = random.randint(2, 10)

        # -------------------------------------------------
        # A. 隨機選供應者：department 或 company（二選一）
        # -------------------------------------------------
        if random.random() < 0.5:
            # department supplier
            dept = random.choice(department_data)
            department_supplier_id = dept['code']
            company_supplier_id = None

            # title 應該依 type 合理組成
            if resource_type == 'Scholarship':
                title = f"{dept['name']}獎學金"
            elif resource_type == 'Lab':
                title = f"{dept['name']}實驗室機會"
            elif resource_type == 'Internship':
                # 學系通常不提供 Internship → 改成 Others 類型稱呼
                title = f"{dept['name']}校內實習"
            else:
                title = f"{dept['name']}其他資源"

        else:
            # company supplier
            company = random.choice(company_users)
            company_name = company['company_name'].replace(" ", "")
            department_supplier_id = None
            company_supplier_id = company_user_to_profile_id[company['user_id']]

            if resource_type == 'Internship':
                title = f"{company_name}實習機會"
            elif resource_type == 'Scholarship':
                title = f"{company_name}獎學金"
            elif resource_type == 'Lab':
                title = f"{company_name}企業合作實驗室"
            else:
                title = f"{company_name}其他資源"

        # -------------------------------------------------
        # B. deadline 與 is_deleted
        # -------------------------------------------------
        # deadline 隨機落在過去 1.5 年到未來 1.5 年
        deadline = TZ_NOW.date() + timedelta(days=random.randint(-550, 550))

        # 預設 deleted
        if deadline < TZ_NOW.date():
            is_deleted = True
        else:
            is_deleted = False

        # 但你說：可能 deadline 未到就被刪除
        if random.random() < 0.1:  # 10% 機率提前刪除
            is_deleted = True

        # -------------------------------------------------
        # C. status 與 is_deleted 的邏輯關係
        # -------------------------------------------------
        # 若 quota = 0 → unavailable
        if quota == 0:
            status = 'Unavailable'
            is_deleted = False   # 滿了但不表示刪除

        else:
            # 未滿名額
            if is_deleted:
                # 被刪除只有兩種狀況：Canceled / Unavailable(但這裡不是)
                # 所以是 Canceled
                status = 'Canceled'
            else:
                status = 'Available'

        # -------------------------------------------------
        # D. description 暫時等於 title
        # -------------------------------------------------
        description = title

        # -------------------------------------------------
        # E. 加入結果
        # -------------------------------------------------
        resources.append({
            "resource_id": resource_id,
            "resource_type": resource_type,
            "quota": quota,
            "department_supplier_id": department_supplier_id,
            "company_supplier_id": company_supplier_id,
            "title": title,
            "deadline": deadline,
            "description": description,
            "status": status,
            "is_deleted": is_deleted
        })

    return resources
def write_resource_sql(resources, filename="insert_resource.sql"):

    with open(filename, "w", encoding="utf-8") as f:
        f.write("-- PostgreSQL INSERT for resource\nBEGIN;\n\n")

        cols = ("resource_id, resource_type, quota, department_supplier_id, "
                "company_supplier_id, title, deadline, description, status, is_deleted")

        for r in resources:
            vals = [
                r["resource_id"],
                r["resource_type"],
                r["quota"],
                r["department_supplier_id"],
                r["company_supplier_id"],
                r["title"],
                r["deadline"],
                r["description"],
                r["status"],
                r["is_deleted"]
            ]
            vals_sql = ", ".join(sql_value(v) for v in vals)

            f.write(f"INSERT INTO resource ({cols}) VALUES ({vals_sql});\n")

        f.write("\nCOMMIT;\n")

resources = generate_resources(all_users, department_data, num_resources=200)
write_resource_sql(resources)


RESOURCE_CONDITION_SQL_FILE = "insert_resource_condition.sql"

def generate_resource_conditions(resources, department_data):
    resource_conditions = []

    dept_codes = [d['code'] for d in department_data]

    for r in resources:
        # 至少 1 個科系
        num_depts = random.randint(1, len(dept_codes))
        selected_depts = random.sample(dept_codes, num_depts)

        # 如果 supplier 是 department，必須包含它
        if r['department_supplier_id'] and r['department_supplier_id'] not in selected_depts:
            selected_depts[0] = r['department_supplier_id']

        for dept_id in selected_depts:
            # avg_gpa: 50% 機率有值，介於 3.7~4.3
            avg_gpa = round(random.uniform(3.7, 4.3), 2) if random.random() < 0.5 else None

            # current_gpa: 50% 機率有值，介於 3.7~4.3
            current_gpa = round(random.uniform(3.7, 4.3), 2) if random.random() < 0.5 else None

            # is_poor: 只有 Scholarship 可能 True，20% 機率
            is_poor = r['resource_type'] == 'Scholarship' and random.random() < 0.2

            resource_conditions.append({
                'resource_id': r['resource_id'],
                'department_id': dept_id,
                'avg_gpa': avg_gpa,
                'current_gpa': current_gpa,
                'is_poor': is_poor
            })

    return resource_conditions


def write_resource_condition_sql(resource_conditions, filename=RESOURCE_CONDITION_SQL_FILE):
    with open(filename, "w", encoding="utf-8") as f:
        f.write("-- PostgreSQL INSERT for resource_condition\nBEGIN;\n\n")
        cols = "resource_id, department_id, avg_gpa, current_gpa, is_poor"
        for rc in resource_conditions:
            vals = [
                rc['resource_id'],
                rc['department_id'],
                rc['avg_gpa'],
                rc['current_gpa'],
                rc['is_poor']
            ]
            vals_sql = ", ".join(sql_value(v) for v in vals)
            f.write(f"INSERT INTO resource_condition ({cols}) VALUES ({vals_sql});\n")
        f.write("\nCOMMIT;\n")


# 使用範例
resource_conditions = generate_resource_conditions(resources, department_data)
write_resource_condition_sql(resource_conditions)

APPLICATION_SQL_FILE = "insert_application.sql"

def generate_applications(all_users, resources, max_apply_per_student=5):
    student_users = [u for u in all_users if u['role'] == 'student']
    applications = []

    # 用來追蹤每個 resource 的 approved 人數
    approved_count = {r['resource_id']: 0 for r in resources}

    for student in student_users:
        # 隨機決定此學生要申請幾個資源
        num_apply = random.randint(1, max_apply_per_student)
        selected_resources = random.sample(resources, num_apply)

        for r in selected_resources:
            # apply_date 不會超過 deadline
       
            apply_start = student['registered_at'].date()
            apply_end = min(r['deadline'], datetime.now(TZ).date()) if r['deadline'] else datetime.now(TZ).date()

            # 如果 apply_start 已經超過 apply_end，就直接 assign apply_date = apply_end
            if apply_start > apply_end:
                apply_date = apply_end
            else:
                apply_date = apply_start + timedelta(days=random.randint(0, (apply_end - apply_start).days))

            # 根據 resource.status 決定 status
            if r['status'] == 'Canceled':
                status = 'rejected'
            elif r['status'] == 'Unavailable':
                status = random.choice(['approved', 'rejected'])
                if status == 'approved' and approved_count[r['resource_id']] >= r['quota']:
                    status = 'rejected'
            else:  # Available
                status = random.choice(['submitted', 'under_review', 'approved', 'rejected'])
                if status == 'approved' and approved_count[r['resource_id']] >= r['quota']:
                    status = 'rejected'

            # 更新已核准人數
            if status == 'approved':
                approved_count[r['resource_id']] += 1

            applications.append({
                'user_id': student['user_id'],
                'resource_id': r['resource_id'],
                'apply_date': apply_date,
                'status': status
            })

    return applications


def write_application_sql(applications, filename=APPLICATION_SQL_FILE):
    with open(filename, "w", encoding="utf-8") as f:
        f.write("-- PostgreSQL INSERT for application\nBEGIN;\n\n")
        cols = "user_id, resource_id, apply_date, status"
        for a in applications:
            vals = [
                a['user_id'],
                a['resource_id'],
                a['apply_date'],
                a['status']
            ]
            vals_sql = ", ".join(sql_value(v) for v in vals)
            f.write(f"INSERT INTO application ({cols}) VALUES ({vals_sql});\n")
        f.write("\nCOMMIT;\n")


# 使用範例
applications = generate_applications(all_users, resources)
write_application_sql(applications)

ACHIEVEMENT_SQL_FILE = 'insert_achievement.sql'

def generate_achievements(all_users, department_data, max_per_student=3):
    student_users = [u for u in all_users if u['role']=='student']
    achievements = []
    achievement_id = 1  # SERIAL 從 1 開始

    for student in student_users:
        num_achievements = random.randint(0, max_per_student)  # 可無
        entry_year = student['registered_at'].year - 1911
        level = student['student_id'][0] if 'student_id' in student else 'B'

        for _ in range(num_achievements):
            category = random.choice(['Competition','Research','Others'])
            
            # title / description
            if random.random() < 0.5:
                source_name = random.choice([d['name'] for d in department_data])
            else:
                companies = [u['company_name'] for u in all_users if u['role']=='company']
                source_name = random.choice(companies) if companies else '某企業'
            
            if category == 'Competition':
                title = f"{source_name}競賽第{random.randint(1,10)}名"
            elif category == 'Research':
                title = f"{source_name}研究成果"
            else:
                title = f"{source_name}學術活動"

            description = title

            # creation_date
            start_year = entry_year if level=='B' else max(0, entry_year-4)
            start_date = datetime(start_year + 1911, 1, 1, tzinfo=TZ)
            end_date = datetime.now(TZ)
            creation_date = start_date + timedelta(days=random.randint(0, (end_date-start_date).days))

            # status
            r = random.random()
            if r < 0.05:
                status = 'rejected'
            elif r < 0.15:
                status = 'unrecognized'
            else:
                status = 'recognized'

            achievements.append({
                'achievement_id': achievement_id,
                'user_id': student['user_id'],
                'category': category,
                'title': title,
                'description': description,
                'creation_date': creation_date,
                'status': status
            })

            achievement_id += 1  # SERIAL 自增

    return achievements

def write_achievement_sql(achievements, filename=ACHIEVEMENT_SQL_FILE):
    with open(filename, 'w', encoding='utf-8') as f:
        f.write("-- PostgreSQL INSERT script for achievement\nBEGIN;\n\n")
        cols = "achievement_id, user_id, category, title, description, creation_date, status"
        for a in achievements:
            vals = [
                a['achievement_id'],
                a['user_id'],
                a['category'],
                a['title'],
                a['description'],
                a['creation_date'],
                a['status']
            ]
            vals_sql = ", ".join(sql_value(v) for v in vals)
            f.write(f"INSERT INTO achievement ({cols}) VALUES ({vals_sql});\n")
        f.write("\nCOMMIT;\n")
    print(f"🎉 成功生成 {len(achievements)} 筆 'achievement' 資料到 {filename}。")

# 執行生成
achievements = generate_achievements(all_users, department_data)
write_achievement_sql(achievements)
PUSH_RECORD_SQL_FILE = "insert_push_record.sql"

def generate_push_records(all_users, resources, push_prob=0.01, max_push_per_resource=10):
    student_users = [u for u in all_users if u['role']=='student']
    pushers = [u for u in all_users if u['role'] in ('department','company')]
    
    push_records = []
    push_id = 1
    
    for pusher in pushers:
        # 找出該 pusher 自己的資源
        own_resources = [r for r in resources if (
            (r['department_supplier_id']==pusher.get('main_dept_code')) or 
            (r['company_supplier_id']==pusher['user_id'])
        )]
        
        for r in own_resources:
            # 決定本次推送的學生數量
            num_receivers = random.randint(1, min(max_push_per_resource, len(student_users)))
            receivers = random.sample(student_users, num_receivers)
            
            for receiver in receivers:
                # 1% 機率推送非自己資源
                if random.random() < push_prob:
                    # 選一個隨機 resource 而非自己的
                    r_random = random.choice([res for res in resources if res not in own_resources])
                    resource_id = r_random['resource_id']
                else:
                    resource_id = r['resource_id']
                
                # push_datetime 必須在 receiver registered 後
                start_dt = max(receiver['registered_at'], pusher['registered_at'])
                end_dt = datetime.now(TZ)
                delta_days = (end_dt - start_dt).days
                push_datetime = start_dt + timedelta(days=random.randint(0, max(0, delta_days)))
                
                push_records.append({
                    'push_id': push_id,
                    'pusher_id': pusher['user_id'],
                    'receiver_id': receiver['user_id'],
                    'resource_id': resource_id,
                    'push_datetime': push_datetime
                })
                
                push_id += 1
                
    return push_records

def write_push_record_sql(push_records, filename=PUSH_RECORD_SQL_FILE):
    with open(filename, 'w', encoding='utf-8') as f:
        f.write("-- PostgreSQL INSERT script for push_record\nBEGIN;\n\n")
        cols = "push_id, pusher_id, receiver_id, resource_id, push_datetime"
        for r in push_records:
            vals = [r['push_id'], r['pusher_id'], r['receiver_id'], r['resource_id'], r['push_datetime']]
            vals_sql = ", ".join(sql_value(v) for v in vals)
            f.write(f"INSERT INTO push_record ({cols}) VALUES ({vals_sql});\n")
        f.write("\nCOMMIT;\n")
    print(f"🎉 成功生成 {len(push_records)} 筆 'push_record' 資料到 {filename}。")

# 生成 push_record
push_records = generate_push_records(all_users, resources)
write_push_record_sql(push_records)



sql_files = ["insert_user_data.sql","insert_department_profile.sql",  "insert_student_profile.sql" , "insert_company_profile.sql", "insert_student_gpa.sql", "insert_student_course_record.sql", "insert_student_department.sql", "insert_resource.sql", "insert_resource_condition.sql", "insert_application.sql", "insert_achievement.sql", "insert_push_record.sql"]
with open("merged.sql", "w", encoding="utf-8") as fout:
    for filename in sql_files:
        with open(filename, "r", encoding="utf-8") as fin:
            fout.write(fin.read())
            fout.write("\n")