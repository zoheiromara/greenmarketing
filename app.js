// ===== Data Storage =====
const STORAGE_KEYS = {
    customer: 'insurance_survey_customers',
    employee: 'insurance_survey_employees'
};

// ===== Configuration =====
// ===== Configuration =====
let CONFIG = {
    student1: "اسم الطالبة 1",
    student2: "اسم الطالبة 2",
    supervisor: "اسم الدكتورة"
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
    const elStudent1 = document.getElementById('student1-name-display');
    const elStudent2 = document.getElementById('student2-name-display');
    const elSupervisor = document.getElementById('supervisor-name-display');

    // Check if element exists before setting innerHTML
    if (elStudent1) elStudent1.innerHTML = `${CONFIG.student1}`;
    if (elStudent2) elStudent2.innerHTML = `${CONFIG.student2}`;
    if (elSupervisor) elSupervisor.innerHTML = `${CONFIG.supervisor}`;
}

function loadAdminSettings() {
    const inputStudent1 = document.getElementById('admin-student-name-1');
    const inputStudent2 = document.getElementById('admin-student-name-2');
    const inputSupervisor = document.getElementById('admin-supervisor-name');
    if (inputStudent1) inputStudent1.value = CONFIG.student1 || '';
    if (inputStudent2) inputStudent2.value = CONFIG.student2 || '';
    if (inputSupervisor) inputSupervisor.value = CONFIG.supervisor || '';
}

function saveAdminSettings() {
    const inputStudent1 = document.getElementById('admin-student-name-1');
    const inputStudent2 = document.getElementById('admin-student-name-2');
    const inputSupervisor = document.getElementById('admin-supervisor-name');

    if (inputStudent1 && inputStudent2 && inputSupervisor) {
        CONFIG.student1 = inputStudent1.value || '';
        CONFIG.student2 = inputStudent2.value || '';
        CONFIG.supervisor = inputSupervisor.value || '';
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
async function submitSurvey(type) {
    const form = document.getElementById(type + '-survey');
    const formData = collectFormData(form, type);

    // Add metadata
    formData.timestamp = new Date().toISOString();
    formData.id = generateId();

    // Save to server
    const success = await saveResponse(type, formData);

    if (success) {
        // Show thank you page
        showPage('thank-you');
        showToast('تم حفظ إجاباتك بنجاح!', 'success');
    }
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

async function saveResponse(type, data) {
    try {
        const response = await fetch('/api/save_survey', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: type, payload: data })
        });
        if (!response.ok) throw new Error('Network error');
        updateStats(); // Refresh stats from server
        return true;
    } catch (err) {
        console.error("Failed to save survey to server:", err);
        showToast('حدث خطأ أثناء الاتصال بالخادم، يرجى المحاولة لاحقاً', 'error');
        return false;
    }
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ===== Admin Functions =====
async function updateStats() {
    try {
        const response = await fetch('/api/get_surveys');
        if (!response.ok) throw new Error('Network error');
        const data = await response.json();

        const customerData = data.customer || [];
        const employeeData = data.employee || [];

        const customerCount = document.getElementById('customer-count');
        const employeeCount = document.getElementById('employee-count');

        if (customerCount) customerCount.textContent = customerData.length;
        if (employeeCount) employeeCount.textContent = employeeData.length;

        drawAdminCharts(customerData, employeeData);
    } catch (err) {
        console.error("Failed to fetch stats:", err);
    }
}

let chartInstances = {};

function formatChartColors(count, theme) {
    const isDay = theme === 'day';
    const baseColors = [
        `rgba(46, 204, 113, ${isDay ? 0.7 : 0.6})`,
        `rgba(52, 152, 219, ${isDay ? 0.7 : 0.6})`,
        `rgba(155, 89, 182, ${isDay ? 0.7 : 0.6})`,
        `rgba(241, 196, 15, ${isDay ? 0.7 : 0.6})`,
        `rgba(230, 126, 34, ${isDay ? 0.7 : 0.6})`,
        `rgba(231, 76, 60, ${isDay ? 0.7 : 0.6})`,
        `rgba(26, 188, 156, ${isDay ? 0.7 : 0.6})`
    ];
    let colors = [];
    for (let i = 0; i < count; i++) colors.push(baseColors[i % baseColors.length]);
    return {
        bg: colors,
        border: colors.map(c => c.replace(/0\.[6-7]\)/, '1)'))
    };
}

function countOccurrences(dataArray, key) {
    const counts = {};
    dataArray.forEach(d => {
        const val = d[key];
        if (val) counts[val] = (counts[val] || 0) + 1;
    });
    return counts;
}

function countMultiOccurrences(dataArray, key) {
    const counts = {};
    dataArray.forEach(d => {
        if (d[key]) {
            const vals = d[key].split(',').map(s => s.trim());
            vals.forEach(v => {
                if (v) counts[v] = (counts[v] || 0) + 1;
            });
        }
    });
    return counts;
}

function getAverageForQuestion(dataArray, qKey) {
    let sum = 0, count = 0;
    dataArray.forEach(d => {
        if (d[qKey]) { sum += parseInt(d[qKey]); count++; }
    });
    return count > 0 ? (sum / count).toFixed(2) : 0;
}

function getLikertGroupAverage(dataArray, keys) {
    let sum = 0, count = 0;
    dataArray.forEach(d => {
        keys.forEach(k => {
            if (d[k]) { sum += parseInt(d[k]); count++; }
        });
    });
    return count > 0 ? (sum / count).toFixed(2) : 0;
}

function renderChart(canvasId, type, label, labels, data, themeColor, indexAxis = 'x') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
    }

    const colors = formatChartColors(labels.length, document.body.classList.contains('day-mode') ? 'day' : 'night');
    const isDay = document.body.classList.contains('day-mode');
    const textColor = isDay ? '#0f172a' : '#f1f5f9';
    const gridColor = isDay ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';

    const isRadar = type === 'radar';
    const isPie = type === 'pie' || type === 'doughnut';

    chartInstances[canvasId] = new Chart(ctx, {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                backgroundColor: isRadar ? 'rgba(46, 204, 113, 0.2)' : colors.bg,
                borderColor: isRadar ? 'rgba(46, 204, 113, 1)' : colors.border,
                borderWidth: isRadar ? 2 : 1,
                borderRadius: isPie || isRadar ? 0 : 4,
                fill: isRadar
            }]
        },
        options: {
            indexAxis: indexAxis,
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: isPie || isRadar,
                    labels: { color: textColor, font: { family: 'Tajawal' } }
                }
            },
            scales: isPie ? {} : isRadar ? {
                r: {
                    angleLines: { color: gridColor },
                    grid: { color: gridColor },
                    pointLabels: { color: textColor, font: { family: 'Tajawal' } },
                    ticks: { z: 3, backdropColor: 'transparent', color: textColor }
                }
            } : {
                y: {
                    beginAtZero: true,
                    ticks: { color: textColor },
                    grid: { color: indexAxis === 'x' ? gridColor : 'transparent' }
                },
                x: {
                    ticks: { color: textColor, font: { family: 'Tajawal' } },
                    grid: { color: indexAxis === 'y' ? gridColor : 'transparent' }
                }
            }
        }
    });
}

function drawAdminCharts(customerData, employeeData) {
    if (typeof Chart === 'undefined') return;

    // 1. Age (Bar)
    const ageData = countOccurrences(customerData, 'age');
    renderChart('chart-age', 'bar', 'عدد المواطنين', Object.keys(ageData), Object.values(ageData));

    // 2. Education (Pie)
    const eduData = countOccurrences(customerData, 'education');
    renderChart('chart-edu', 'pie', 'المستوى التعليمي', Object.keys(eduData), Object.values(eduData));

    // 3. Residence (Doughnut)
    const resData = countOccurrences(customerData, 'residence');
    renderChart('chart-residence', 'doughnut', 'أماكن الإقامة', Object.keys(resData), Object.values(resData));

    // 4. Membership (Pie)
    const memData = countOccurrences(customerData, 'membership');
    renderChart('chart-membership', 'pie', 'منخرط في الجمعية؟', Object.keys(memData), Object.values(memData));

    // 5. Discovery (Horizontal Bar)
    const discData = countMultiOccurrences(customerData, 'discovery');
    renderChart('chart-discovery', 'bar', 'المصادر', Object.keys(discData), Object.values(discData), null, 'y');

    // 6. Green Awareness (Bar) q01-q04
    const gaLabels = ['مفهوم التسويق', 'أهمية البيئة', 'تزايد الاهتمام', 'دور الجمعيات'];
    const gaValues = [
        getAverageForQuestion(customerData, 'q01'),
        getAverageForQuestion(customerData, 'q02'),
        getAverageForQuestion(customerData, 'q03'),
        getAverageForQuestion(customerData, 'q04')
    ];
    renderChart('chart-green-awareness', 'line', 'متوسط الموافقة (1-5)', gaLabels, gaValues);

    // 7. Mental Image (Radar)
    const miLabels = ['البعد المعرفي', 'البعد الوجداني', 'البعد السلوكي'];
    const miValues = [
        getLikertGroupAverage(customerData, ['q11', 'q12', 'q13', 'q14']),
        getLikertGroupAverage(customerData, ['q15', 'q16', 'q17', 'q18']),
        getLikertGroupAverage(customerData, ['q19', 'q20', 'q21', 'q22'])
    ];
    renderChart('chart-mental-image', 'radar', 'مؤشر الصورة الذهنية', miLabels, miValues);

    // 8. Digital Comm (Bar) q23-q29
    const dcLabels = ['المتابعة', 'التفاعل', 'تعزيز الصورة', 'فعالية الوسيلة', 'كفاية المعلومات', 'تفضيل الإنترنت', 'تطوير الحضور'];
    const dcValues = [23, 24, 25, 26, 27, 28, 29].map(n => getAverageForQuestion(customerData, `q${n}`));
    renderChart('chart-digital-comm', 'bar', 'متوسط الموافقة (1-5)', dcLabels, dcValues);

    // 9. Smart Tech (Bar) q30-q35
    const stLabels = ['تحقيق الأهداف', 'تسهيل التواصل', 'تعزيز الشفافية', 'تطبيقات ذكية', 'تحسين الصورة', 'حاجة للتطوير'];
    const stValues = [30, 31, 32, 33, 34, 35].map(n => getAverageForQuestion(customerData, `q${n}`));
    renderChart('chart-smart-tech', 'bar', 'متوسط الموافقة (1-5)', stLabels, stValues);

    // 10. Overall Interest & Drift (Line over time)
    // Sort customers by timestamp
    const sortedData = [...customerData].filter(d => d.timestamp).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const timeLabels = sortedData.map((d, i) => `مبحوث ${i + 1}`);
    const timeValues = sortedData.map(d => {
        let sum = 0, count = 0;
        for (let i = 1; i <= 35; i++) {
            let k = i < 10 ? `q0${i}` : `q${i}`;
            if (d[k]) { sum += parseInt(d[k]); count++; }
        }
        return count > 0 ? (sum / count).toFixed(2) : 0;
    });

    const canvas10 = document.getElementById('chart-drift');
    if (canvas10) {
        if (chartInstances['chart-drift']) chartInstances['chart-drift'].destroy();
        const isDay = document.body.classList.contains('day-mode');
        const textColor = isDay ? '#0f172a' : '#f1f5f9';

        chartInstances['chart-drift'] = new Chart(canvas10.getContext('2d'), {
            type: 'line',
            data: {
                labels: timeLabels,
                datasets: [{
                    label: 'متوسط الرضا العام لكل مبحوث (تطور زمني)',
                    data: timeValues,
                    borderColor: 'rgba(52, 152, 219, 1)',
                    backgroundColor: 'rgba(52, 152, 219, 0.2)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    y: { min: 1, max: 5, ticks: { color: textColor } },
                    x: { ticks: { color: textColor, font: { family: 'Tajawal' } } }
                },
                plugins: { legend: { labels: { color: textColor, font: { family: 'Tajawal' } } } }
            }
        });
    }
}

async function showDataTab(type) {
    // Update tab buttons
    document.querySelectorAll('.tabs .tab').forEach(tab => tab.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');
    else {
        // Default active state if event not present (e.g. init)
        const btn = document.querySelector(`.tabs .tab[onclick*="'${type}'"]`);
        if (btn) btn.classList.add('active');
    }

    const container = document.getElementById('data-table-container');
    container.innerHTML = '<p class="glass-panel" style="text-align:center;">جاري تحميل البيانات...</p>';

    try {
        const response = await fetch('/api/get_surveys');
        if (!response.ok) throw new Error('Network error');
        const resData = await response.json();
        const data = resData[type] || [];

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
    } catch (err) {
        console.error(err);
        container.innerHTML = '<p class="no-data glass-panel">حدث خطأ أثناء جلب البيانات.</p>';
    }
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
async function exportData(type, format) {
    let data = [];
    try {
        const response = await fetch('/api/get_surveys');
        if (!response.ok) throw new Error('Network error');
        const resData = await response.json();
        data = resData[type] || [];
    } catch (err) {
        console.error(err);
        showToast('حدث خطأ أثناء جلب البيانات للتصدير', 'error');
        return;
    }

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
