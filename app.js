// ===== Data Storage =====
const STORAGE_KEYS = {
    customer: 'insurance_survey_customers',
    employee: 'insurance_survey_employees'
};

// ===== Configuration =====
// ===== Configuration =====
let CONFIG = {
    student: "................",
    supervisor: "................"
};

// Load Config from Storage
const savedConfig = localStorage.getItem('virgin_earth_config');
if (savedConfig) {
    CONFIG = JSON.parse(savedConfig);
}

// ===== Initialize App =====
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    generateQRCode();
    updateStats();
    injectConfig(); // Inject Names
    loadAdminSettings(); // Load settings into admin inputs

    // Add event listener for theme toggle if button exists
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', toggleTheme);
    }
});

function injectConfig() {
    // Populate Student/Supervisor names
    const elStudent = document.getElementById('student-name');
    const elSupervisor = document.getElementById('supervisor-name');

    // Check if element exists before setting innerHTML
    if (elStudent) elStudent.innerHTML = `<strong>الطالب(ة) الباحث(ة):</strong> ${CONFIG.student}`;
    if (elSupervisor) elSupervisor.innerHTML = `<strong>تحت إشراف الأستاذ(ة):</strong> ${CONFIG.supervisor}`;
}

function loadAdminSettings() {
    const inputStudent = document.getElementById('admin-student-name');
    const inputSupervisor = document.getElementById('admin-supervisor-name');
    if (inputStudent) inputStudent.value = CONFIG.student;
    if (inputSupervisor) inputSupervisor.value = CONFIG.supervisor;
}

function saveAdminSettings() {
    const inputStudent = document.getElementById('admin-student-name');
    const inputSupervisor = document.getElementById('admin-supervisor-name');

    if (inputStudent && inputSupervisor) {
        CONFIG.student = inputStudent.value;
        CONFIG.supervisor = inputSupervisor.value;
        localStorage.setItem('virgin_earth_config', JSON.stringify(CONFIG));
        injectConfig(); // Update live
        showToast('تم حفظ الإعدادات بنجاح', 'success');
    }
}

// ===== Theme Management (New) =====
function initTheme() {
    // Shuffle theme on load (Day or Night)
    const isNight = Math.random() < 0.5;
    applyTheme(isNight ? 'night' : 'day');
}

function applyTheme(theme) {
    document.body.classList.remove('day-mode', 'night-mode');
    document.body.classList.add(`${theme}-mode`);

    // Update toggle button icon if it exists
    const btn = document.getElementById('theme-toggle');
    if (btn) {
        btn.textContent = theme === 'day' ? '☀️' : '🌙';
    }
}

function toggleTheme() {
    const isDay = document.body.classList.contains('day-mode');
    applyTheme(isDay ? 'night' : 'day');
}

// ===== Page Navigation =====
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    // 3D Transition Effect
    const container = document.getElementById(pageId);
    if (container) {
        container.classList.add('active');
        // Add entrance animation class then remove it
        container.classList.add('page-enter');
        setTimeout(() => container.classList.remove('page-enter'), 500);
    }

    window.scrollTo(0, 0);

    if (pageId === 'admin-page') {
        updateStats();
        showDataTab('customer');
    }
}

// ===== Survey Navigation =====
function startSurvey(type) {
    showPage(type + '-survey');
    resetSurvey(type);
}

function resetSurvey(type) {
    const container = document.getElementById(type + '-survey');
    container.querySelectorAll('.survey-section').forEach((s, i) => {
        s.classList.toggle('active', i === 0);
    });
    container.querySelectorAll('input, textarea').forEach(input => {
        if (input.type === 'radio' || input.type === 'checkbox') {
            input.checked = false;
        } else {
            input.value = '';
        }
    });
    updateProgress(type, 1);
}

function nextSection(type, current) {
    const sections = document.querySelectorAll(`#${type}-survey .survey-section`);
    const totalSections = sections.length;

    if (current < totalSections) {
        sections[current - 1].classList.remove('active');
        sections[current].classList.add('active');
        updateProgress(type, current + 1);
        window.scrollTo(0, 0);
    }
}

function prevSection(type, current) {
    const sections = document.querySelectorAll(`#${type}-survey .survey-section`);

    if (current > 1) {
        sections[current - 1].classList.remove('active');
        sections[current - 2].classList.add('active');
        updateProgress(type, current - 1);
        window.scrollTo(0, 0);
    }
}

function updateProgress(type, step) {
    const totalSections = document.querySelectorAll(`#${type}-survey .survey-section`).length;
    const progress = (step / totalSections) * 100;

    const bar = document.getElementById(type + '-progress');
    if (bar) bar.style.width = progress + '%';

    const indicator = document.getElementById(type + '-step');
    if (indicator) indicator.textContent = `${step}/${totalSections}`;
}

// ===== Form Submission =====
function submitSurvey(type) {
    const form = document.getElementById(type + '-survey');
    const formData = collectFormData(form, type);

    // Add metadata
    formData.timestamp = new Date().toISOString();
    formData.id = generateId();

    // Save to localStorage
    saveResponse(type, formData);

    // Show thank you page
    showPage('thank-you');
    showToast('تم حفظ إجاباتك بنجاح!', 'success');
}

function collectFormData(form, prefix) {
    const data = {};

    // Collect radio buttons
    form.querySelectorAll('input[type="radio"]:checked').forEach(input => {
        const name = input.name.replace(prefix.charAt(0) + '_', '');
        data[name] = input.value;
    });

    // Collect checkboxes (as arrays)
    const checkboxGroups = {};
    form.querySelectorAll('input[type="checkbox"]:checked').forEach(input => {
        const name = input.name.replace(prefix.charAt(0) + '_', '');
        if (!checkboxGroups[name]) checkboxGroups[name] = [];
        checkboxGroups[name].push(input.value);
    });
    Object.keys(checkboxGroups).forEach(key => {
        data[key] = checkboxGroups[key].join(', ');
    });

    // Collect textareas
    form.querySelectorAll('textarea').forEach(textarea => {
        const name = textarea.name.replace(prefix.charAt(0) + '_', '');
        data[name] = textarea.value;
    });

    return data;
}

function saveResponse(type, data) {
    const key = STORAGE_KEYS[type];
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.push(data);
    localStorage.setItem(key, JSON.stringify(existing));
    updateStats();
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ===== Admin Functions =====
function updateStats() {
    const customerData = JSON.parse(localStorage.getItem(STORAGE_KEYS.customer) || '[]');
    const employeeData = JSON.parse(localStorage.getItem(STORAGE_KEYS.employee) || '[]');

    const customerCount = document.getElementById('customer-count');
    const employeeCount = document.getElementById('employee-count');

    if (customerCount) customerCount.textContent = customerData.length;
    if (employeeCount) employeeCount.textContent = employeeData.length;
}

function showDataTab(type) {
    // Update tab buttons
    document.querySelectorAll('.tabs .tab').forEach(tab => tab.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');
    else {
        // Default active state if event not present (e.g. init)
        const btn = document.querySelector(`.tabs .tab[onclick*="'${type}'"]`);
        if (btn) btn.classList.add('active');
    }

    // Get data
    const data = JSON.parse(localStorage.getItem(STORAGE_KEYS[type]) || '[]');
    const container = document.getElementById('data-table-container');

    if (data.length === 0) {
        container.innerHTML = '<p class="no-data glass-panel">لا توجد بيانات بعد</p>';
        return;
    }

    // Generate table
    const headers = Object.keys(data[0]);
    let html = '<div class="table-responsive glass-panel"><table class="data-table"><thead><tr>';
    headers.forEach(h => html += `<th>${formatHeader(h)}</th>`);
    html += '</tr></thead><tbody>';

    data.forEach(row => {
        html += '<tr>';
        headers.forEach(h => html += `<td>${row[h] || '-'}</td>`);
        html += '</tr>';
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function formatHeader(key) {
    // Terminology Updated: Customer -> Citizen, Employee -> Member
    const translations = {
        id: 'المعرف',
        timestamp: 'التاريخ',
        gender: 'الجنس',
        age: 'العمر',
        education: 'التعليم',
        profession: 'المهنة',
        income: 'الدخل',
        know_insurance: 'المعرفة بالجمعية/التأمين', // Adapted
        source: 'مصدر المعرفة',
        necessity: 'الضرورة/الأهمية',
        insurance_type: 'أنواع الاشتراكات', // Adapted
        reason: 'سبب الاختيار',
        more_insurance: 'مشاركات إضافية', // Adapted
        trust: 'الثقة',
        problems: 'مشاكل',
        problem_type: 'نوع المشاكل',
        satisfaction: 'الرضا',
        suggestions: 'اقتراحات',
        company_type: 'نوع الجمعية/الهيئة', // Adapted
        position: 'المنصب/الدور',
        experience: 'الخبرة',
        customer_understanding: 'فهم المواطنين',
        complaints: 'الشكاوى',
        challenges: 'التحديات'
    };
    return translations[key] || key;
}

// ===== Export Functions =====
function exportData(type, format) {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEYS[type]) || '[]');

    if (data.length === 0) {
        showToast('لا توجد بيانات للتصدير', 'error');
        return;
    }

    let content, filename, mimeType;
    // Map internal types to new filenames
    const typeLabel = type === 'customer' ? 'Mowatin' : 'Member';

    if (format === 'csv') {
        content = convertToCSV(data);
        filename = `${typeLabel}_survey_${getDateString()}.csv`;
        mimeType = 'text/csv;charset=utf-8;';
        // Add BOM for Excel Arabic support
        content = '\uFEFF' + content;
    } else {
        content = JSON.stringify(data, null, 2);
        filename = `${typeLabel}_survey_${getDateString()}.json`;
        mimeType = 'application/json;charset=utf-8;';
    }

    downloadFile(content, filename, mimeType);
    showToast(`تم تصدير ${data.length} سجل بنجاح`, 'success');
}

function convertToCSV(data) {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const rows = [headers.join(',')];

    data.forEach(row => {
        const values = headers.map(h => {
            let val = row[h] || '';
            // Escape quotes and wrap in quotes
            val = String(val).replace(/"/g, '""');
            return `"${val}"`;
        });
        rows.push(values.join(','));
    });

    return rows.join('\n');
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function getDateString() {
    return new Date().toISOString().split('T')[0];
}

// ===== Clear Data =====

// ===== Clear Data =====
function clearAllData() {
    const safeWord = prompt('لإتمام الحذف، أدخل كلمة السر الخاصة بالحذف:');

    if (safeWord === 'nukethatshit') {
        if (confirm('هل أنت متأكد تمامًا؟ سيتم حذف جميع البيانات ولا يمكن التراجع!')) {
            localStorage.removeItem(STORAGE_KEYS.customer);
            localStorage.removeItem(STORAGE_KEYS.employee);
            updateStats();
            showDataTab('customer');
            showToast('تم حذف جميع البيانات', 'success');
        }
    } else if (safeWord !== null) {
        alert('كلمة السر خاطئة! تم إلغاء العملية.');
    }
}

// ===== QR Code =====
function generateQRCode() {
    const qrContainer = document.getElementById('qr-code');
    if (qrContainer && typeof QRCode !== 'undefined') {
        const url = window.location.href;
        QRCode.toCanvas(url, {
            width: 200,
            margin: 2,
            color: {
                dark: '#1e293b',
                light: '#ffffff'
            }
        }, (error, canvas) => {
            if (error) {
                console.error(error);
                return;
            }
            qrContainer.innerHTML = '';
            qrContainer.appendChild(canvas);
        });
    }
}

function copyLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        showToast('تم نسخ الرابط!', 'success');
    }).catch(() => {
        // Fallback
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        showToast('تم نسخ الرابط!', 'success');
    });
}

// ===== Toast Notifications =====
function showToast(message, type = 'info') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type} glass-panel`; // Added glass-panel class
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
}

// ===== Password Protection =====
const ADMIN_PASSWORD = '1995';

function showPasswordModal() {
    document.getElementById('password-modal').classList.add('active');
    document.getElementById('admin-password').value = '';
    document.getElementById('password-error').textContent = '';
    document.getElementById('admin-password').focus();
}

function hidePasswordModal() {
    document.getElementById('password-modal').classList.remove('active');
}

function checkPassword() {
    const input = document.getElementById('admin-password').value;
    const errorEl = document.getElementById('password-error');

    if (input === ADMIN_PASSWORD) {
        hidePasswordModal();
        showPage('admin-page');
        showToast('مرحبًا بك في لوحة التحكم', 'success');
    } else {
        errorEl.textContent = 'كلمة السر غير صحيحة!';
        document.getElementById('admin-password').value = '';
        document.getElementById('admin-password').focus();
    }
}

function handlePasswordEnter(event) {
    if (event.key === 'Enter') {
        checkPassword();
    }
}

// Close modal on outside click
document.addEventListener('click', (e) => {
    const modal = document.getElementById('password-modal');
    if (e.target === modal) {
        hidePasswordModal();
    }
});
