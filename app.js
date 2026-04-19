const STORAGE_KEYS = {
    config: 'cntpp_research_config',
    theme: 'cntpp_theme'
};

const ADMIN_PASSWORD = '1995';
const SURVEY_TYPE = 'cntpp_questionnaire';

const DEFAULT_CONFIG = {
    student1: 'اسم الطالب(ة) الأول(ى)',
    student2: 'اسم الطالب(ة) الثاني(ة)',
    supervisor: 'اسم الأستاذ(ة) المشرف(ة)'
};

let CONFIG = { ...DEFAULT_CONFIG };
try {
    const savedConfig = localStorage.getItem(STORAGE_KEYS.config);
    if (savedConfig) {
        CONFIG = { ...CONFIG, ...JSON.parse(savedConfig) };
    }
} catch (error) {
    console.warn('Invalid stored config', error);
}

const state = {
    content: null,
    questionnaireSteps: [],
    interviewSteps: [],
    dimensions: [],
    chartInstances: {}
};

document.addEventListener('DOMContentLoaded', () => {
    bindThemeToggle();
    initTheme();
    injectConfig();
    loadAdminSettings();
    generateQRCode();
    bootstrap();
});

async function bootstrap() {
    try {
        const response = await fetch('/api/content', { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        state.content = await response.json();
        state.questionnaireSteps = buildQuestionnaireSteps(state.content.survey);
        state.interviewSteps = buildInterviewSteps(state.content.interview);
        state.dimensions = buildDimensions(state.content.survey);

        renderQuestionnaire();
        renderInterview();
        if (typeof window.initializeInterviewRecorders === 'function') {
            window.initializeInterviewRecorders();
        }

        updateStats();
    } catch (error) {
        console.error('Failed to bootstrap application', error);
        const questionnaireMount = document.getElementById('questionnaire-form');
        const interviewMount = document.getElementById('interview-form');
        const message = '<div class="glass-panel" style="padding:20px; text-align:center;">تعذر تحميل محتوى الدراسة الحالية.</div>';
        if (questionnaireMount) questionnaireMount.innerHTML = message;
        if (interviewMount) interviewMount.innerHTML = message;
    }
}

function buildQuestionnaireSteps(survey) {
    return [
        {
            kind: 'general',
            title: survey.general_section_title,
            description: survey.general_section_hint,
            fields: survey.general_fields
        },
        ...survey.sections.map(section => ({
            kind: 'likert',
            title: section.title,
            indexLabel: section.index_label,
            groups: section.groups
        })),
        {
            kind: 'open',
            title: survey.open_question.title,
            question: survey.open_question
        }
    ];
}

function buildInterviewSteps(interview) {
    return [
        {
            kind: 'intro',
            title: 'الإطار المنهجي للمقابلة'
        },
        {
            kind: 'meta',
            title: 'بيانات المبحوث',
            fields: [
                { type: 'text', name: 'interviewee_code', label: 'رمز أو اسم المبحوث', required: true, placeholder: 'مثال: مسؤول الاتصال 01' },
                { type: 'text', name: 'job_title', label: 'الصفة الوظيفية', required: true, placeholder: 'مثال: رئيس مصلحة' },
                { type: 'text', name: 'department', label: 'المصلحة أو القسم', required: true, placeholder: 'مثال: الاتصال أو التكوين' },
                { type: 'text', name: 'years_experience', label: 'سنوات الخبرة', required: true, placeholder: 'مثال: 8 سنوات' },
                { type: 'text', name: 'responsibility_scope', label: 'طبيعة المسؤولية المرتبطة بالجمهور الخارجي أو بالخدمات', required: false, placeholder: 'اختياري' },
                { type: 'text', name: 'interview_location', label: 'مكان المقابلة', required: false, placeholder: 'اختياري' }
            ]
        },
        ...interview.sections.map((section, sectionIndex) => ({
            kind: 'questions',
            title: section.title,
            sectionIndex,
            questions: section.questions || [],
            followUps: section.follow_ups || []
        })),
        {
            kind: 'review',
            title: 'مراجعة وتصدير المقابلة'
        }
    ];
}

function buildDimensions(survey) {
    return survey.sections.flatMap((section, sectionIndex) =>
        section.groups.map((group, groupIndex) => ({
            key: `dim_${sectionIndex + 1}_${groupIndex + 1}`,
            label: group.title,
            items: group.items.map(item => item.code)
        }))
    );
}

function renderQuestionnaire() {
    const container = document.getElementById('questionnaire-form');
    if (!container || !state.content) return;

    container.innerHTML = state.questionnaireSteps.map((step, index) => `
        <div class="survey-section ${index === 0 ? 'active' : ''}" data-section="${index + 1}">
            ${renderQuestionnaireStep(step)}
            ${renderSectionNavigation('questionnaire', index + 1, state.questionnaireSteps.length, { submitLabel: 'إرسال الاستبيان' })}
        </div>
    `).join('');

    updateProgress('questionnaire', 1);
}

function renderQuestionnaireStep(step) {
    if (step.kind === 'general') {
        return `
            <div class="section-title">
                <span class="section-number">01</span>
                <h3>${escapeHtml(step.title)}</h3>
            </div>
            <p class="section-desc">${escapeHtml(step.description || '')}</p>
            ${step.fields.map(renderGeneralField).join('')}
        `;
    }

    if (step.kind === 'likert') {
        return `
            <div class="section-title">
                <span class="section-number">${escapeHtml(step.indexLabel)}</span>
                <h3>${escapeHtml(step.title)}</h3>
            </div>
            ${step.groups.map(group => `
                <div class="question-group">
                    <label class="question-label">${escapeHtml(group.title)}</label>
                    ${renderLikertTable(group.items)}
                </div>
            `).join('')}
        `;
    }

    return `
        <div class="section-title">
            <span class="section-number">∞</span>
            <h3>${escapeHtml(step.title)}</h3>
        </div>
        <div class="question-group">
            <label class="question-label" for="${escapeHtml(step.question.code)}">${escapeHtml(step.question.prompt)}</label>
            <textarea id="${escapeHtml(step.question.code)}" name="${escapeHtml(step.question.code)}" rows="5" placeholder="${escapeHtml(step.question.placeholder || '')}"></textarea>
        </div>
    `;
}

function renderGeneralField(field) {
    if (field.type === 'single') {
        const optionsHtml = field.options.map((option, index) => `
            <label class="radio-option">
                <input type="radio" name="${escapeHtml(field.code)}" value="${escapeHtml(option.value)}" ${field.required && index === 0 ? 'required' : ''}>
                <span>${escapeHtml(option.label)}</span>
            </label>
        `).join('');

        return `
            <div class="question-group">
                <label class="question-label">${escapeHtml(field.label)}${field.required ? ' <span class="required">*</span>' : ''}</label>
                <div class="radio-group vertical">${optionsHtml}</div>
            </div>
        `;
    }

    if (field.type === 'multi') {
        const optionsHtml = field.options.map(option => `
            <label class="checkbox-option">
                <input type="checkbox" name="${escapeHtml(field.code)}" value="${escapeHtml(option.value)}">
                <span>${escapeHtml(option.label)}</span>
            </label>
        `).join('');

        return `
            <div class="question-group">
                <label class="question-label">${escapeHtml(field.label)}${field.required ? ' <span class="required">*</span>' : ''}</label>
                <div class="checkbox-group vertical" data-required-name="${field.required ? escapeHtml(field.code) : ''}">
                    ${optionsHtml}
                </div>
            </div>
        `;
    }

    return `
        <div class="question-group">
            <label class="question-label" for="${escapeHtml(field.code)}">${escapeHtml(field.label)}${field.required ? ' <span class="required">*</span>' : ''}</label>
            <textarea id="${escapeHtml(field.code)}" name="${escapeHtml(field.code)}" ${field.required ? 'required' : ''}></textarea>
        </div>
    `;
}

function renderLikertTable(items) {
    const options = state.content.survey.likert.options;
    const headerHtml = `
        <div class="likert-header">
            <span></span>
            ${options.map(option => `<span>${escapeHtml(option.label.replace('\n', ' '))}</span>`).join('')}
        </div>
    `;

    const rowsHtml = items.map(item => `
        <div class="likert-row">
            <span class="likert-label">${escapeHtml(item.code)}. ${escapeHtml(item.prompt)}</span>
            ${options.map((option, index) => `
                <label>
                    <input type="radio" name="${escapeHtml(item.code)}" value="${escapeHtml(option.value)}" ${index === 0 ? 'required' : ''}>
                </label>
            `).join('')}
        </div>
    `).join('');

    return `<div class="likert-table">${headerHtml}${rowsHtml}</div>`;
}

function renderInterview() {
    const container = document.getElementById('interview-form');
    if (!container || !state.content) return;

    container.innerHTML = state.interviewSteps.map((step, index) => `
        <div class="survey-section ${index === 0 ? 'active' : ''}" data-section="${index + 1}">
            ${renderInterviewStep(step)}
            ${renderSectionNavigation('interview', index + 1, state.interviewSteps.length, { submitLabel: 'حفظ المقابلة' })}
        </div>
    `).join('');

    updateProgress('interview', 1);
}

function renderInterviewStep(step) {
    if (step.kind === 'intro') {
        const interview = state.content.interview;
        return `
            <div class="section-title">
                <span class="section-number">00</span>
                <h3>${escapeHtml(step.title)}</h3>
            </div>
            <p class="section-desc">${escapeHtml(interview.purpose)}</p>
            <div class="question-group">
                <label class="question-label">الفئة المستهدفة</label>
                <div class="axis-desc">
                    <ul class="meta-list">
                        ${interview.audience.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
                    </ul>
                </div>
            </div>
            <div class="question-group">
                <label class="question-label">البيانات الأولية المقترحة</label>
                <div class="axis-desc">
                    <ul class="meta-list">
                        ${interview.initial_profile.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
                    </ul>
                </div>
            </div>
            <div class="question-group">
                <label class="question-label">ملاحظات منهجية</label>
                <div class="axis-desc">
                    <ul class="meta-list">
                        ${interview.highlights.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;
    }

    if (step.kind === 'meta') {
        return `
            <div class="section-title">
                <span class="section-number">01</span>
                <h3>${escapeHtml(step.title)}</h3>
            </div>
            <p class="section-desc">تستعمل هذه الصفحة لتوثيق بيانات المقابلة قبل البدء في التفريغ.</p>
            ${step.fields.map(renderTextField).join('')}
        `;
    }

    if (step.kind === 'review') {
        return `
            <div class="section-title">
                <span class="section-number">✓</span>
                <h3>${escapeHtml(step.title)}</h3>
            </div>
            <p class="section-desc">راجع النصوص المفرغة قبل الحفظ النهائي أو التصدير.</p>
            <div id="interview-review"></div>
            <div class="export-buttons">
                <button class="btn-export glow-btn" type="button" onclick="window._exportInterview('json')">تصدير JSON</button>
                <button class="btn-export" type="button" onclick="window._exportInterview('csv')">تصدير CSV</button>
            </div>
        `;
    }

    return `
        <div class="section-title">
            <span class="section-number">${String(step.sectionIndex + 2).padStart(2, '0')}</span>
            <h3>${escapeHtml(step.title)}</h3>
        </div>
        ${step.followUps.length ? `
            <div class="axis-desc">
                <strong>أسئلة متابعة مقترحة:</strong>
                <ul class="meta-list">
                    ${step.followUps.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
        ${step.questions.map((question, questionIndex) => renderInterviewQuestion(buildInterviewQuestionId(step.sectionIndex, questionIndex), question)).join('')}
    `;
}

function renderTextField(field) {
    return `
        <div class="question-group">
            <label class="question-label" for="${escapeHtml(field.name)}">${escapeHtml(field.label)}${field.required ? ' <span class="required">*</span>' : ''}</label>
            <input class="text-input" id="${escapeHtml(field.name)}" type="text" name="${escapeHtml(field.name)}" ${field.required ? 'required' : ''} placeholder="${escapeHtml(field.placeholder || '')}">
        </div>
    `;
}

function renderInterviewQuestion(questionId, questionText) {
    return `
        <div class="interview-question" data-q="${escapeHtml(questionId)}">
            <p class="q-text"><strong>${escapeHtml(questionId)}.</strong> ${escapeHtml(questionText)}</p>
            <div class="recorder-box" id="rec-${escapeHtml(questionId)}"></div>
        </div>
    `;
}

function buildInterviewQuestionId(sectionIndex, questionIndex) {
    return `Q${String(sectionIndex + 1).padStart(2, '0')}_${String(questionIndex + 1).padStart(2, '0')}`;
}

function renderSectionNavigation(type, current, total, options = {}) {
    const prevButton = current > 1 ? `<button class="btn-prev" type="button" onclick="prevSection('${type}', ${current})">→ السابق</button>` : '';
    const nextButton = current < total ? `<button class="glow-btn" type="button" onclick="nextSection('${type}', ${current})">التالي ←</button>` : '';
    const submitButton = current === total ? `<button class="glow-btn" type="button" onclick="${type === 'questionnaire' ? 'submitQuestionnaire()' : 'saveInterview()'}">${options.submitLabel || 'حفظ'}</button>` : '';
    return `<div class="nav-buttons">${prevButton}${nextButton}${submitButton}</div>`;
}

function bindThemeToggle() {
    const button = document.getElementById('theme-toggle');
    if (button) {
        button.addEventListener('click', toggleTheme);
    }
}

function injectConfig() {
    const student1 = document.getElementById('student1-name-display');
    const student2 = document.getElementById('student2-name-display');
    const supervisor = document.getElementById('supervisor-name-display');

    if (student1) student1.textContent = CONFIG.student1;
    if (student2) student2.textContent = CONFIG.student2;
    if (supervisor) supervisor.textContent = CONFIG.supervisor;
}

function loadAdminSettings() {
    const student1 = document.getElementById('admin-student-name-1');
    const student2 = document.getElementById('admin-student-name-2');
    const supervisor = document.getElementById('admin-supervisor-name');

    if (student1) student1.value = CONFIG.student1 || '';
    if (student2) student2.value = CONFIG.student2 || '';
    if (supervisor) supervisor.value = CONFIG.supervisor || '';
}

function saveAdminSettings() {
    const student1 = document.getElementById('admin-student-name-1');
    const student2 = document.getElementById('admin-student-name-2');
    const supervisor = document.getElementById('admin-supervisor-name');

    CONFIG.student1 = student1 ? student1.value.trim() || DEFAULT_CONFIG.student1 : DEFAULT_CONFIG.student1;
    CONFIG.student2 = student2 ? student2.value.trim() || DEFAULT_CONFIG.student2 : DEFAULT_CONFIG.student2;
    CONFIG.supervisor = supervisor ? supervisor.value.trim() || DEFAULT_CONFIG.supervisor : DEFAULT_CONFIG.supervisor;

    localStorage.setItem(STORAGE_KEYS.config, JSON.stringify(CONFIG));
    injectConfig();
    showToast('تم حفظ الإعدادات بنجاح', 'success');
}

function initTheme() {
    const storedTheme = localStorage.getItem(STORAGE_KEYS.theme);
    applyTheme(storedTheme === 'night' ? 'night' : 'day');
}

function applyTheme(theme) {
    document.body.classList.remove('day-mode', 'night-mode');
    document.body.classList.add(`${theme}-mode`);
    localStorage.setItem(STORAGE_KEYS.theme, theme);

    const button = document.getElementById('theme-toggle');
    if (button) {
        button.textContent = theme === 'day' ? '☀️' : '🌙';
    }

    if (document.getElementById('admin-page')?.classList.contains('active')) {
        updateStats();
    }
}

function toggleTheme() {
    const isDay = document.body.classList.contains('day-mode');
    applyTheme(isDay ? 'night' : 'day');
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));

    const container = document.getElementById(pageId);
    if (container) {
        container.classList.add('active');
        container.classList.add('page-enter');
        setTimeout(() => container.classList.remove('page-enter'), 500);
    }

    if (pageId === 'admin-page') {
        updateStats();
        showDataTab('questionnaire');
    }

    window.scrollTo(0, 0);
}

function startSurvey(type) {
    const pageId = type === 'questionnaire' ? 'questionnaire-survey' : 'interview-survey';
    showPage(pageId);
    resetSurvey(type);
}

function resetSurvey(type) {
    const container = document.getElementById(`${type}-survey`);
    if (!container) return;

    container.querySelectorAll('.survey-section').forEach((section, index) => {
        section.classList.toggle('active', index === 0);
    });

    container.querySelectorAll('input, textarea').forEach(input => {
        if (input.type === 'radio' || input.type === 'checkbox') {
            input.checked = false;
        } else {
            input.value = '';
        }
    });

    if (type === 'interview' && typeof window.resetInterviewRecorders === 'function') {
        window.resetInterviewRecorders();
    }

    updateProgress(type, 1);
}

function validateCurrentSection(type, current) {
    const container = document.getElementById(`${type}-survey`);
    const section = container?.querySelector(`.survey-section[data-section="${current}"]`);
    if (!section) return true;

    const requiredTextInputs = section.querySelectorAll('input[required]:not([type="radio"]), textarea[required]');
    for (const input of requiredTextInputs) {
        if (!input.value.trim()) {
            input.focus();
            showToast('يرجى ملء الحقول المطلوبة قبل المتابعة', 'error');
            return false;
        }
    }

    const requiredRadioNames = [...new Set(
        Array.from(section.querySelectorAll('input[type="radio"][required]')).map(input => input.name)
    )];
    for (const name of requiredRadioNames) {
        if (!section.querySelector(`input[name="${name}"]:checked`)) {
            showToast('يرجى استكمال الإجابات المطلوبة قبل المتابعة', 'error');
            return false;
        }
    }

    const requiredCheckboxGroups = [...section.querySelectorAll('[data-required-name]')].map(element => element.dataset.requiredName).filter(Boolean);
    for (const name of requiredCheckboxGroups) {
        if (!section.querySelector(`input[name="${name}"]:checked`)) {
            showToast('يرجى اختيار خيار واحد على الأقل قبل المتابعة', 'error');
            return false;
        }
    }

    return true;
}

function nextSection(type, current) {
    if (!validateCurrentSection(type, current)) return;

    const sections = document.querySelectorAll(`#${type}-survey .survey-section`);
    const total = sections.length;
    if (current < total) {
        sections[current - 1].classList.remove('active');
        sections[current].classList.add('active');
        updateProgress(type, current + 1);

        if (type === 'interview' && current === total - 1 && typeof window.buildInterviewReview === 'function') {
            window.buildInterviewReview();
        }
    }

    window.scrollTo(0, 0);
}

function prevSection(type, current) {
    const sections = document.querySelectorAll(`#${type}-survey .survey-section`);
    if (current > 1) {
        sections[current - 1].classList.remove('active');
        sections[current - 2].classList.add('active');
        updateProgress(type, current - 1);
    }
    window.scrollTo(0, 0);
}

function updateProgress(type, step) {
    const total = document.querySelectorAll(`#${type}-survey .survey-section`).length;
    const progress = total ? (step / total) * 100 : 0;
    const bar = document.getElementById(`${type}-progress`);
    const indicator = document.getElementById(`${type}-step`);

    if (bar) bar.style.width = `${progress}%`;
    if (indicator) indicator.textContent = `${step}/${total}`;
}

function collectFormData(container) {
    const data = {};

    container.querySelectorAll('input[type="radio"]:checked').forEach(input => {
        data[input.name] = input.value;
    });

    const checkboxGroups = {};
    container.querySelectorAll('input[type="checkbox"]').forEach(input => {
        if (!checkboxGroups[input.name]) {
            checkboxGroups[input.name] = [];
        }
        if (input.checked) {
            checkboxGroups[input.name].push(input.value);
        }
    });

    Object.entries(checkboxGroups).forEach(([key, values]) => {
        data[key] = values;
    });

    container.querySelectorAll('input[type="text"], textarea').forEach(input => {
        if (input.name) {
            data[input.name] = input.value.trim();
        }
    });

    return data;
}

async function parseApiResponse(response) {
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
        return null;
    }

    try {
        return await response.json();
    } catch (error) {
        console.warn('Failed to parse API response', error);
        return null;
    }
}

function getApiErrorMessage(response, result, fallback = 'Request failed') {
    const localError = result?.details?.local_error;
    const remoteError = result?.details?.remote_error;

    if (localError && remoteError) return `Local save failed: ${localError}. Remote save failed: ${remoteError}`;
    if (localError) return `Local save failed: ${localError}`;
    if (remoteError) return `Remote save failed: ${remoteError}`;
    if (result?.error) return result.error;
    if (response?.status) return `HTTP ${response.status}`;
    return fallback;
}

window.parseApiResponse = parseApiResponse;
window.getApiErrorMessage = getApiErrorMessage;

async function submitQuestionnaire() {
    const lastSection = state.questionnaireSteps.length;
    if (!validateCurrentSection('questionnaire', lastSection)) return;

    const container = document.getElementById('questionnaire-survey');
    const payload = collectFormData(container);
    const openCode = state.content?.survey?.open_question?.code || 'open_feedback';

    payload.id = generateId();
    payload.timestamp = new Date().toISOString();
    payload.study = state.content?.meta?.study_label || '';
    payload.survey_version = state.content?.survey?.version || '';
    payload.interview_version = state.content?.interview?.version || '';

    if (payload[openCode] && !payload.open_feedback) {
        payload.open_feedback = payload[openCode];
    }

    const success = await saveQuestionnaire(payload);
    if (success) {
        showPage('thank-you');
        showToast('تم حفظ إجاباتكم بنجاح', 'success');
    }
}

async function saveQuestionnaire(payload) {
    try {
        const response = await fetch('/api/save_survey', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: SURVEY_TYPE, payload })
        });

        const result = await parseApiResponse(response);
        if (!response.ok || !result?.success) {
            throw new Error(getApiErrorMessage(response, result, 'Failed to save questionnaire'));
        }

        if (Array.isArray(result?.warnings) && result.warnings.length) {
            console.warn('Questionnaire saved with warnings', result.warnings, result.storage_details);
        }

        await updateStats();
        return true;
    } catch (error) {
        console.error('Failed to save survey', error);
        alert(`تعذر حفظ الاستبيان: ${error.message}`);
        showToast('تعذر حفظ الاستبيان في هذه اللحظة', 'error');
        return false;
    }
}

async function updateStats() {
    try {
        const response = await fetch('/api/get_surveys', { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        const questionnaireData = data.questionnaire || [];
        const interviewsData = data.interviews || [];

        const questionnaireCount = document.getElementById('questionnaire-count');
        const interviewCount = document.getElementById('interview-count');
        if (questionnaireCount) questionnaireCount.textContent = questionnaireData.length;
        if (interviewCount) interviewCount.textContent = interviewsData.length;

        drawAdminCharts(questionnaireData);
    } catch (error) {
        console.error('Failed to fetch stats', error);
    }
}

function countOccurrences(records, key) {
    const counts = {};
    records.forEach(record => {
        const value = record[key];
        if (Array.isArray(value)) {
            value.forEach(item => {
                if (item) counts[item] = (counts[item] || 0) + 1;
            });
            return;
        }
        if (value) counts[value] = (counts[value] || 0) + 1;
    });
    return counts;
}

function getFieldDefinition(fieldCode) {
    return state.content?.survey?.general_fields?.find(field => field.code === fieldCode) || null;
}

function getOptionLabel(fieldCode, value) {
    const field = getFieldDefinition(fieldCode);
    if (!field || !Array.isArray(field.options)) return String(value);
    const option = field.options.find(item => item.value === value);
    return option?.label || String(value);
}

function countsToChartSeries(fieldCode, counts) {
    const entries = Object.entries(counts);
    return {
        labels: entries.map(([value]) => getOptionLabel(fieldCode, value)),
        values: entries.map(([, count]) => count)
    };
}

function getAverage(records, keys) {
    let sum = 0;
    let count = 0;
    records.forEach(record => {
        keys.forEach(key => {
            const value = Number(record[key]);
            if (value >= 1 && value <= 5) {
                sum += value;
                count += 1;
            }
        });
    });
    return count ? Number((sum / count).toFixed(2)) : 0;
}

function getRespondentAverage(record, keys) {
    let sum = 0;
    let count = 0;
    keys.forEach(key => {
        const value = Number(record[key]);
        if (value >= 1 && value <= 5) {
            sum += value;
            count += 1;
        }
    });
    return count ? Number((sum / count).toFixed(2)) : 0;
}

function renderChart(canvasId, chartType, labels, data, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;

    if (state.chartInstances[canvasId]) {
        state.chartInstances[canvasId].destroy();
    }

    const isDay = document.body.classList.contains('day-mode');
    const textColor = isDay ? '#0f172a' : '#f1f5f9';
    const gridColor = isDay ? 'rgba(15, 23, 42, 0.08)' : 'rgba(241, 245, 249, 0.08)';
    const palette = [
        'rgba(14, 165, 233, 0.75)',
        'rgba(34, 197, 94, 0.75)',
        'rgba(168, 85, 247, 0.75)',
        'rgba(245, 158, 11, 0.75)',
        'rgba(239, 68, 68, 0.75)',
        'rgba(20, 184, 166, 0.75)'
    ];

    state.chartInstances[canvasId] = new Chart(canvas.getContext('2d'), {
        type: chartType,
        data: {
            labels,
            datasets: [{
                label: options.label || '',
                data,
                backgroundColor: options.backgroundColor || palette,
                borderColor: options.borderColor || palette.map(color => color.replace('0.75', '1')),
                borderWidth: 2,
                fill: chartType === 'radar' || chartType === 'line',
                tension: 0.35
            }]
        },
        options: {
            indexAxis: options.indexAxis || 'x',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: chartType === 'radar' || chartType === 'line' || chartType === 'doughnut',
                    labels: { color: textColor, font: { family: 'Tajawal' } }
                }
            },
            scales: chartType === 'doughnut' ? {} : chartType === 'radar' ? {
                r: {
                    angleLines: { color: gridColor },
                    grid: { color: gridColor },
                    pointLabels: { color: textColor, font: { family: 'Tajawal', size: 12 } },
                    ticks: { color: textColor, backdropColor: 'transparent', suggestedMin: 0, suggestedMax: 5 }
                }
            } : {
                x: {
                    ticks: { color: textColor, font: { family: 'Tajawal' } },
                    grid: { color: options.indexAxis === 'y' ? 'transparent' : gridColor }
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: textColor },
                    grid: { color: options.indexAxis === 'x' ? gridColor : 'transparent' }
                }
            }
        }
    });
}

function drawAdminCharts(questionnaireData) {
    const ageData = countOccurrences(questionnaireData, 'age_group');
    const ageSeries = countsToChartSeries('age_group', ageData);
    renderChart('chart-age', 'bar', ageSeries.labels, ageSeries.values, { label: 'عدد المشاركين' });

    const relationData = countOccurrences(questionnaireData, 'relation_type');
    const relationSeries = countsToChartSeries('relation_type', relationData);
    renderChart('chart-relation', 'doughnut', relationSeries.labels, relationSeries.values, { label: 'طبيعة العلاقة' });

    const serviceData = countOccurrences(questionnaireData, 'service_type');
    const serviceSeries = countsToChartSeries('service_type', serviceData);
    renderChart('chart-service', 'bar', serviceSeries.labels, serviceSeries.values, { label: 'نوع الخدمة', indexAxis: 'y' });

    const gmDimensions = state.dimensions.filter(dimension => dimension.items.some(code => code.startsWith('GM')));
    renderChart('chart-gm', 'radar', gmDimensions.map(item => item.label), gmDimensions.map(item => getAverage(questionnaireData, item.items)), {
        label: 'متوسط التسويق الأخضر',
        backgroundColor: 'rgba(14, 165, 233, 0.2)',
        borderColor: 'rgba(14, 165, 233, 1)'
    });

    const imgDimensions = state.dimensions.filter(dimension => dimension.items.some(code => code.startsWith('IMG')));
    renderChart('chart-img', 'radar', imgDimensions.map(item => item.label), imgDimensions.map(item => getAverage(questionnaireData, item.items)), {
        label: 'متوسط الصورة الذهنية',
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        borderColor: 'rgba(34, 197, 94, 1)'
    });

    const allQuestionCodes = state.dimensions.flatMap(dimension => dimension.items);
    const trendData = [...questionnaireData]
        .filter(item => item.timestamp)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const overallLabels = trendData.map((_, index) => `مشارك ${index + 1}`);
    const overallValues = trendData.map(item => getRespondentAverage(item, allQuestionCodes));
    renderChart('chart-overall', 'line', overallLabels, overallValues, { label: 'المؤشر العام' });
}

function getTableData(type, apiData) {
    if (type === 'questionnaire') {
        return apiData.questionnaire || [];
    }

    return (apiData.interviews || []).map(interview => ({
        id: interview.id,
        timestamp: interview.timestamp,
        interviewee_code: interview.metadata?.interviewee_code || '',
        job_title: interview.metadata?.job_title || '',
        department: interview.metadata?.department || '',
        years_experience: interview.metadata?.years_experience || '',
        answered_questions: (interview.questions || []).filter(question => question.transcript && question.transcript.trim()).length
    }));
}

async function showDataTab(type, event) {
    document.querySelectorAll('.tabs .tab').forEach(tab => tab.classList.remove('active'));
    if (event?.target) {
        event.target.classList.add('active');
    } else {
        const button = document.querySelector(`.tabs .tab[onclick*="${type}"]`);
        if (button) button.classList.add('active');
    }

    const container = document.getElementById('data-table-container');
    container.innerHTML = '<p class="glass-panel" style="text-align:center; padding: 16px;">جاري تحميل البيانات...</p>';

    try {
        const response = await fetch('/api/get_surveys', { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const apiData = await response.json();
        const rows = getTableData(type, apiData);

        if (!rows.length) {
            container.innerHTML = '<p class="no-data glass-panel">لا توجد بيانات بعد</p>';
            return;
        }

        const headers = Object.keys(rows[0]);
        let html = '<div class="table-responsive glass-panel"><table class="data-table"><thead><tr>';
        html += headers.map(header => `<th>${formatHeader(header)}</th>`).join('');
        html += '</tr></thead><tbody>';

        rows.forEach(row => {
            html += '<tr>';
            html += headers.map(header => `<td>${escapeHtml(formatCellValue(row[header], header))}</td>`).join('');
            html += '</tr>';
        });

        html += '</tbody></table></div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Failed to load table data', error);
        container.innerHTML = '<p class="no-data glass-panel">حدث خطأ أثناء جلب البيانات.</p>';
    }
}

async function exportData(type, format) {
    try {
        const response = await fetch('/api/get_surveys', { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const apiData = await response.json();
        const rawData = type === 'questionnaire' ? (apiData.questionnaire || []) : (apiData.interviews || []);

        if (!rawData.length) {
            showToast('لا توجد بيانات للتصدير', 'error');
            return;
        }

        if (format === 'json') {
            downloadFile(JSON.stringify(rawData, null, 2), `${type}_${getDateString()}.json`, 'application/json;charset=utf-8;');
            showToast('تم تصدير JSON بنجاح', 'success');
            return;
        }

        const rows = type === 'questionnaire'
            ? rawData
            : rawData.map(interview => ({
                id: interview.id,
                timestamp: interview.timestamp,
                interviewee_code: interview.metadata?.interviewee_code || '',
                job_title: interview.metadata?.job_title || '',
                department: interview.metadata?.department || '',
                years_experience: interview.metadata?.years_experience || '',
                responsibility_scope: interview.metadata?.responsibility_scope || '',
                interview_location: interview.metadata?.interview_location || '',
                answered_questions: (interview.questions || []).filter(question => question.transcript && question.transcript.trim()).length,
                transcripts: (interview.questions || []).map(question => `${question.id}: ${question.transcript || ''}`.trim()).join(' || ')
            }));

        const csv = '\uFEFF' + convertToCSV(rows);
        downloadFile(csv, `${type}_${getDateString()}.csv`, 'text/csv;charset=utf-8;');
        showToast('تم تصدير CSV بنجاح', 'success');
    } catch (error) {
        console.error('Failed to export data', error);
        showToast('تعذر تصدير البيانات', 'error');
    }
}

function convertToCSV(rows) {
    if (!rows.length) return '';
    const headers = Object.keys(rows[0]);
    const csvRows = [headers.join(',')];

    rows.forEach(row => {
        const line = headers.map(header => {
            const value = String(Array.isArray(row[header]) ? row[header].join(' | ') : (row[header] ?? '')).replace(/"/g, '""');
            return `"${value}"`;
        }).join(',');
        csvRows.push(line);
    });

    return csvRows.join('\n');
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

function buildHeaderTranslations() {
    const base = {
        id: 'المعرف',
        timestamp: 'التاريخ',
        gender: 'الجنس',
        age_group: 'الفئة العمرية',
        education: 'المستوى التعليمي',
        relation_type: 'طبيعة العلاقة بالمركز',
        stakeholder_categories: 'فئات التعامل مع المركز',
        relation_duration: 'مدة التعامل',
        service_type: 'نوع الخدمة',
        open_feedback: 'ملاحظة مفتوحة',
        interviewee_code: 'رمز أو اسم المبحوث',
        job_title: 'الصفة الوظيفية',
        department: 'القسم',
        years_experience: 'سنوات الخبرة',
        responsibility_scope: 'طبيعة المسؤولية',
        interview_location: 'مكان المقابلة',
        answered_questions: 'عدد الإجابات المفرغة'
    };

    if (!state.content) return base;

    state.content.survey.general_fields.forEach(field => {
        base[field.code] = field.label;
    });
    state.content.survey.sections.forEach(section => {
        section.groups.forEach(group => {
            group.items.forEach(item => {
                base[item.code] = item.prompt;
            });
        });
    });
    base[state.content.survey.open_question.code] = state.content.survey.open_question.title;

    return base;
}

function formatHeader(key) {
    return buildHeaderTranslations()[key] || key;
}

function formatCellValue(value, key = '') {
    if (value === null || value === undefined || value === '') return '-';
    if (Array.isArray(value)) {
        if (key) {
            return value.map(item => getOptionLabel(key, item)).join(' | ');
        }
        return value.join(' | ');
    }
    if (key && getFieldDefinition(key)) {
        return getOptionLabel(key, value);
    }
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

function generateId() {
    return `resp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function generateQRCode() {
    const qrContainer = document.getElementById('qr-code');
    if (!qrContainer || typeof QRCode === 'undefined') return;

    QRCode.toCanvas(window.location.href, {
        width: 200,
        margin: 2,
        color: { dark: '#1e293b', light: '#ffffff' }
    }, (error, canvas) => {
        if (error) {
            console.error('QR generation failed', error);
            return;
        }
        qrContainer.innerHTML = '';
        qrContainer.appendChild(canvas);
    });
}

function copyLink() {
    navigator.clipboard.writeText(window.location.href)
        .then(() => showToast('تم نسخ الرابط', 'success'))
        .catch(() => showToast('تعذر نسخ الرابط', 'error'));
}

function showToast(message, type = 'info') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type} glass-panel`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3200);
}

function getDateString() {
    return new Date().toISOString().split('T')[0];
}

function showPasswordModal() {
    const modal = document.getElementById('password-modal');
    const input = document.getElementById('admin-password');
    const error = document.getElementById('password-error');

    if (modal) modal.classList.add('active');
    if (input) input.value = '';
    if (error) error.textContent = '';
    if (input) input.focus();
}

function hidePasswordModal() {
    const modal = document.getElementById('password-modal');
    if (modal) modal.classList.remove('active');
}

function checkPassword() {
    const input = document.getElementById('admin-password');
    const error = document.getElementById('password-error');
    if (!input) return;

    if (input.value === ADMIN_PASSWORD) {
        hidePasswordModal();
        showPage('admin-page');
        showToast('تم الدخول إلى لوحة التحكم', 'success');
        return;
    }

    if (error) error.textContent = 'كلمة السر غير صحيحة';
    input.value = '';
    input.focus();
}

function handlePasswordEnter(event) {
    if (event.key === 'Enter') {
        checkPassword();
    }
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}

document.addEventListener('click', event => {
    const modal = document.getElementById('password-modal');
    if (event.target === modal) {
        hidePasswordModal();
    }
});

window.saveAdminSettings = saveAdminSettings;
window.showPage = showPage;
window.startSurvey = startSurvey;
window.prevSection = prevSection;
window.nextSection = nextSection;
window.submitQuestionnaire = submitQuestionnaire;
window.updateStats = updateStats;
window.showDataTab = showDataTab;
window.exportData = exportData;
window.copyLink = copyLink;
window.showPasswordModal = showPasswordModal;
window.hidePasswordModal = hidePasswordModal;
window.checkPassword = checkPassword;
window.handlePasswordEnter = handlePasswordEnter;
