const STORAGE_KEYS = {
    config: 'cntpp_research_config'
};

const ADMIN_PASSWORD = '1995';
const STUDY_CODE = 'cntpp_green_marketing_2026';
const SURVEY_TYPE = 'cntpp_questionnaire';

const LIKERT_LABELS = [
    'لا أوافق بشدة',
    'لا أوافق',
    'محايد',
    'أوافق',
    'أوافق بشدة'
];

let CONFIG = {
    student1: 'اسم الطالب(ة) الأول(ى)',
    student2: 'اسم الطالب(ة) الثاني(ة)',
    supervisor: 'اسم الأستاذ(ة) المشرف(ة)'
};

const savedConfig = localStorage.getItem(STORAGE_KEYS.config);
if (savedConfig) {
    try {
        CONFIG = JSON.parse(savedConfig);
    } catch (error) {
        console.warn('Invalid stored config', error);
    }
}

const QUESTIONNAIRE_SECTIONS = [
    {
        id: 'general',
        title: 'البيانات العامة',
        description: 'يرجى اختيار الإجابة الأنسب بما يتوافق مع طبيعة تعاملكم مع المركز.',
        fields: [
            { type: 'radio', name: 'gender', label: '1. الجنس', required: true, options: ['ذكر', 'أنثى'] },
            { type: 'radio', name: 'age_group', label: '2. الفئة العمرية', required: true, vertical: true, options: ['أقل من 25 سنة', 'من 25 إلى 34 سنة', 'من 35 إلى 44 سنة', '45 سنة فأكثر'] },
            { type: 'radio', name: 'education', label: '3. المستوى التعليمي', required: true, vertical: true, options: ['ثانوي أو أقل', 'جامعي ليسانس', 'ماستر', 'دكتوراه', 'أخرى'] },
            { type: 'radio', name: 'relation_type', label: '4. طبيعة العلاقة بالمركز', required: true, vertical: true, options: ['ممثل مؤسسة اقتصادية', 'ممثل هيئة عمومية', 'مشارك في تكوين أو ورشة', 'شريك مهني أو تقني', 'أخرى'] },
            { type: 'radio', name: 'relation_duration', label: '5. مدة التعامل مع المركز', required: true, vertical: true, options: ['أقل من سنة', 'من سنة إلى أقل من 3 سنوات', 'من 3 إلى أقل من 5 سنوات', '5 سنوات فأكثر'] },
            { type: 'radio', name: 'service_type', label: '6. نوع الخدمة الأكثر ارتباطا بتعاملكم مع المركز', required: true, vertical: true, options: ['دراسات أو تشخيصات بيئية', 'تكوين وبناء قدرات', 'مرافقة أو استشارة تقنية', 'نشاط تحسيسي أو تواصلي', 'أخرى'] }
        ]
    },
    {
        id: 'gm1',
        title: 'محور التسويق الأخضر - الالتزام البيئي والخدمات الخضراء',
        description: 'حدد درجة موافقتكم على العبارات التالية وفق سلم من 1 إلى 5.',
        likert: [
            { code: 'GM1', text: 'يحرص المركز على إظهار التزام واضح بحماية البيئة في مختلف أنشطته.' },
            { code: 'GM2', text: 'تعكس الخدمات التي يقدمها المركز توجها فعليا نحو الإنتاج الأنظف والتنمية المستدامة.' },
            { code: 'GM3', text: 'يقدم المركز حلولا أو بدائل تساعد المؤسسات على الحد من التلوث وترشيد الموارد.' },
            { code: 'GM4', text: 'أشعر أن البعد البيئي عنصر أساسي في هوية المركز وليس مجرد شعار.' }
        ]
    },
    {
        id: 'gm2',
        title: 'محور التسويق الأخضر - جودة الخدمة الخضراء والقيمة المقدمة',
        description: 'يرجى تقييم مستوى موافقتكم على كل عبارة.',
        likert: [
            { code: 'GM5', text: 'خدمات المركز البيئية تلبي حاجات المستفيدين بشكل عملي وواضح.' },
            { code: 'GM6', text: 'يربط المركز بين الفائدة البيئية والفائدة الاقتصادية أو التنظيمية للمؤسسة المستفيدة.' },
            { code: 'GM7', text: 'يقدم المركز معلومات وتوجيهات تساعد على تحسين الأداء البيئي للمستفيدين.' },
            { code: 'GM8', text: 'أرى أن الخدمات التي يقدمها المركز ذات قيمة مضافة مقارنة ببدائل أخرى متاحة.' }
        ]
    },
    {
        id: 'gm3',
        title: 'محور التسويق الأخضر - الاتصال والترويج الأخضر',
        description: 'تساعد هذه العبارات على قياس وضوح الاتصال المؤسسي وفاعليته.',
        likert: [
            { code: 'GM9', text: 'يتواصل المركز مع جمهوره بلغة واضحة ومفهومة عند عرض خدماته وأنشطته.' },
            { code: 'GM10', text: 'الأنشطة التحسيسية أو التكوينية التي ينظمها المركز تعزز الوعي البيئي لدى المستفيدين.' },
            { code: 'GM11', text: 'يستخدم المركز قنوات مناسبة للتعريف بخدماته وبرامجه البيئية.' },
            { code: 'GM12', text: 'الرسائل الاتصالية الصادرة عن المركز تعكس بوضوح أهدافه البيئية وخدماته.' }
        ]
    },
    {
        id: 'gm4',
        title: 'محور التسويق الأخضر - المصداقية والشفافية والتفاعل',
        description: 'يرجى تقييم مستوى المصداقية والتفاعل الذي يقدمه المركز.',
        likert: [
            { code: 'GM13', text: 'يتمتع المركز بمصداقية في عرضه لنتائج خدماته أو برامجه البيئية.' },
            { code: 'GM14', text: 'يقدم المركز معلومات كافية وشفافة حول خدماته وإجراءاته.' },
            { code: 'GM15', text: 'يتفاعل المركز مع انشغالات المستفيدين بسرعة واهتمام.' },
            { code: 'GM16', text: 'يسهل الوصول إلى المركز أو التواصل معه عند الحاجة إلى خدمة أو استفسار.' }
        ]
    },
    {
        id: 'img1',
        title: 'محور الصورة الذهنية - البعد المعرفي',
        description: 'يقيس هذا المحور مستوى المعرفة المتكونة عن المركز.',
        likert: [
            { code: 'IMG1', text: 'أمتلك معرفة واضحة بطبيعة مهام المركز واختصاصاته.' },
            { code: 'IMG2', text: 'أعتبر المركز جهة متخصصة وذات كفاءة في مجال البيئة والإنتاج الأنظف.' },
            { code: 'IMG3', text: 'أرى أن المركز يمتلك خبرة مهنية تساعده على تقديم خدمات موثوقة.' },
            { code: 'IMG4', text: 'تتسم صورة المركز في ذهني بالوضوح والتنظيم والاختصاص.' }
        ]
    },
    {
        id: 'img2',
        title: 'محور الصورة الذهنية - البعد الوجداني',
        description: 'يقيس هذا المحور الانطباع العاطفي والوجداني تجاه المركز.',
        likert: [
            { code: 'IMG5', text: 'أشعر بالثقة تجاه المركز وخدماته.' },
            { code: 'IMG6', text: 'يترك المركز لدي انطباعا إيجابيا من حيث الجدية والمسؤولية البيئية.' },
            { code: 'IMG7', text: 'أشعر بالارتياح عند التعامل مع المركز أو المشاركة في أنشطته.' },
            { code: 'IMG8', text: 'أرى أن للمركز سمعة طيبة بين المتعاملين والمهتمين بالشأن البيئي.' }
        ]
    },
    {
        id: 'img3',
        title: 'محور الصورة الذهنية - البعد السلوكي',
        description: 'يقيس هذا المحور أثر الصورة الذهنية في السلوك المستقبلي للمستفيد.',
        likert: [
            { code: 'IMG9', text: 'أفضل التعامل مع المركز عند الحاجة إلى خدمة أو استشارة بيئية.' },
            { code: 'IMG10', text: 'يمكنني أن أوصي الآخرين بالتعامل مع المركز.' },
            { code: 'IMG11', text: 'أرغب في الاستفادة مستقبلا من خدمات أو أنشطة أخرى يقدمها المركز.' },
            { code: 'IMG12', text: 'تسهم الصورة الإيجابية للمركز في استمراريته كخيار مفضل بالنسبة إلي.' }
        ],
        fields: [
            { type: 'textarea', name: 'open_feedback', label: 'سؤال مفتوح اختياري: ما أهم عامل يمكن أن يساعد المركز على تحسين صورته الذهنية لدى جمهوره الخارجي؟', required: false, placeholder: 'اكتب ملاحظتك هنا إن رغبت في ذلك' }
        ]
    }
];

const QUESTIONNAIRE_DIMENSIONS = [
    { key: 'gm_commitment', label: 'الالتزام البيئي والخدمات الخضراء', items: ['GM1', 'GM2', 'GM3', 'GM4'] },
    { key: 'gm_value', label: 'جودة الخدمة والقيمة', items: ['GM5', 'GM6', 'GM7', 'GM8'] },
    { key: 'gm_communication', label: 'الاتصال والترويج', items: ['GM9', 'GM10', 'GM11', 'GM12'] },
    { key: 'gm_credibility', label: 'المصداقية والتفاعل', items: ['GM13', 'GM14', 'GM15', 'GM16'] },
    { key: 'img_cognitive', label: 'الصورة المعرفية', items: ['IMG1', 'IMG2', 'IMG3', 'IMG4'] },
    { key: 'img_affective', label: 'الصورة الوجدانية', items: ['IMG5', 'IMG6', 'IMG7', 'IMG8'] },
    { key: 'img_behavioral', label: 'الصورة السلوكية', items: ['IMG9', 'IMG10', 'IMG11', 'IMG12'] }
];

const INTERVIEW_SECTIONS = [
    {
        id: 'meta',
        title: 'بيانات المبحوث',
        description: 'تملأ هذه البيانات قبل بدء المقابلة.',
        fields: [
            { type: 'text', name: 'interviewee_code', label: 'رمز أو اسم المبحوث', required: true, placeholder: 'مثال: مسؤول التكوين 01' },
            { type: 'text', name: 'job_title', label: 'الصفة الوظيفية', required: true, placeholder: 'مثال: رئيس مصلحة' },
            { type: 'text', name: 'department', label: 'المصلحة أو القسم', required: true, placeholder: 'مثال: التكوين' },
            { type: 'text', name: 'years_experience', label: 'سنوات الخبرة', required: true, placeholder: 'مثال: 8 سنوات' },
            { type: 'text', name: 'responsibility_scope', label: 'طبيعة المسؤولية المرتبطة بالجمهور الخارجي أو بالخدمات', required: false, placeholder: 'اختياري' },
            { type: 'text', name: 'interview_location', label: 'مكان المقابلة', required: false, placeholder: 'اختياري' }
        ]
    },
    { id: 'axis1', title: 'المحور الأول - الرؤية المؤسسية والتموقع البيئي', questions: [{ id: 'Q01', text: 'كيف تقدمون تعريفكم لطبيعة رسالة المركز وأدواره الأساسية؟' }, { id: 'Q02', text: 'ما المكانة التي يحتلها البعد البيئي والاستدامة في هوية المركز واستراتيجيته؟' }, { id: 'Q03', text: 'كيف يميز المركز نفسه عن غيره من الهيئات أو الجهات التي تقدم خدمات قريبة من مجاله؟' }] },
    { id: 'axis2', title: 'المحور الثاني - ممارسات التسويق الأخضر في المركز', questions: [{ id: 'Q04', text: 'ما أبرز الخدمات أو الأنشطة التي ترون أنها تعكس فعليا ممارسات التسويق الأخضر داخل المركز؟' }, { id: 'Q05', text: 'كيف يضمن المركز أن تكون خدماته أو برامجه منسجمة مع مفهوم الإنتاج الأنظف والاستدامة؟' }, { id: 'Q06', text: 'هل توجد آليات لتطوير الخدمات انطلاقا من حاجات المستفيدين أو ملاحظاتهم؟' }] },
    { id: 'axis3', title: 'المحور الثالث - الاتصال والتفاعل مع الجمهور الخارجي', questions: [{ id: 'Q07', text: 'ما القنوات التي يعتمدها المركز للتعريف بخدماته وأنشطته وبرامجه؟' }, { id: 'Q08', text: 'كيف يتم التواصل مع المؤسسات المستفيدة أو الشركاء أو المشاركين في التكوينات؟' }, { id: 'Q09', text: 'إلى أي مدى تعتقدون أن الرسائل الاتصالية الحالية كافية لبناء صورة واضحة وإيجابية عن المركز؟' }] },
    { id: 'axis4', title: 'المحور الرابع - الصورة الذهنية للمركز', questions: [{ id: 'Q10', text: 'كيف تصفون الصورة الذهنية الحالية للمركز لدى جمهوره الخارجي؟' }, { id: 'Q11', text: 'ما العوامل التي ترون أنها تعزز هذه الصورة؟ وما العوامل التي قد تضعفها؟' }, { id: 'Q12', text: 'هل تعتمدون على أي مؤشرات أو ملاحظات أو تغذية راجعة لقياس رضا المتعاملين أو انطباعاتهم؟' }] },
    { id: 'axis5', title: 'المحور الخامس - التحديات وآفاق التحسين', questions: [{ id: 'Q13', text: 'ما أبرز التحديات التي تواجه المركز في ترسيخ صورته الذهنية كهيئة بيئية متخصصة وموثوقة؟' }, { id: 'Q14', text: 'ما الجوانب التي تعتقدون أنها تحتاج إلى تطوير على مستوى الخدمة أو التواصل أو العلاقة مع الجمهور؟' }, { id: 'Q15', text: 'ما المقترحات العملية التي ترون أنها قد تساعد على تعزيز صورة المركز في المستقبل؟' }] },
    { id: 'closing', title: 'خاتمة المقابلة', questions: [{ id: 'Q16', text: 'هل هناك نقطة ترون أنها مهمة ولم نتطرق إليها، ويمكن أن تساعد في فهم العلاقة بين ممارسات المركز وصورته لدى الجمهور؟' }] },
    { id: 'review', title: 'مراجعة وتصدير المقابلة', description: 'راجع النصوص المفرغة قبل الحفظ النهائي.', review: true }
];

const HEADER_TRANSLATIONS = {
    id: 'المعرف',
    timestamp: 'التاريخ',
    gender: 'الجنس',
    age_group: 'الفئة العمرية',
    education: 'المستوى التعليمي',
    relation_type: 'طبيعة العلاقة بالمركز',
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

let chartInstances = {};

document.addEventListener('DOMContentLoaded', () => {
    renderQuestionnaire();
    renderInterview();
    initTheme();
    bindThemeToggle();
    generateQRCode();
    injectConfig();
    loadAdminSettings();
    updateStats();
});

function renderQuestionnaire() {
    const container = document.getElementById('questionnaire-form');
    if (!container) return;

    container.innerHTML = QUESTIONNAIRE_SECTIONS.map((section, index) => {
        const content = [];
        content.push(`<div class="section-title"><span class="section-number">${String(index + 1).padStart(2, '0')}</span><h3>${section.title}</h3></div>`);
        if (section.description) content.push(`<p class="section-desc">${section.description}</p>`);
        if (section.fields) content.push(section.fields.map(renderField).join(''));
        if (section.likert) content.push(renderLikertTable(section.likert));

        return `<div class="survey-section ${index === 0 ? 'active' : ''}" data-section="${index + 1}">${content.join('')}${renderSectionNavigation('questionnaire', index + 1, QUESTIONNAIRE_SECTIONS.length, { submitLabel: 'إرسال الاستبيان' })}</div>`;
    }).join('');

    updateProgress('questionnaire', 1);
}

function renderInterview() {
    const container = document.getElementById('interview-form');
    if (!container) return;

    container.innerHTML = INTERVIEW_SECTIONS.map((section, index) => {
        const content = [];
        content.push(`<div class="section-title"><span class="section-number">${String(index + 1).padStart(2, '0')}</span><h3>${section.title}</h3></div>`);
        if (section.description) content.push(`<p class="section-desc">${section.description}</p>`);
        if (section.fields) content.push(section.fields.map(renderField).join(''));
        if (section.questions) content.push(section.questions.map(renderInterviewQuestion).join(''));
        if (section.review) content.push('<div id="interview-review"></div>');

        return `<div class="survey-section ${index === 0 ? 'active' : ''}" data-section="${index + 1}">${content.join('')}${renderSectionNavigation('interview', index + 1, INTERVIEW_SECTIONS.length, { submitLabel: 'حفظ المقابلة' })}</div>`;
    }).join('');

    updateProgress('interview', 1);
}

function renderField(field) {
    if (field.type === 'radio') {
        const verticalClass = field.vertical ? 'vertical' : '';
        const optionsHtml = field.options.map((option, index) => `<label class="radio-option"><input type="radio" name="${field.name}" value="${option}" ${field.required && index === 0 ? 'required' : ''}><span>${option}</span></label>`).join('');
        return `<div class="question-group"><label class="question-label">${field.label}${field.required ? ' <span class="required">*</span>' : ''}</label><div class="radio-group ${verticalClass}">${optionsHtml}</div></div>`;
    }

    if (field.type === 'textarea') {
        return `<div class="question-group"><label class="question-label" for="${field.name}">${field.label}${field.required ? ' <span class="required">*</span>' : ''}</label><textarea id="${field.name}" name="${field.name}" ${field.required ? 'required' : ''} placeholder="${field.placeholder || ''}" rows="4"></textarea></div>`;
    }

    return `<div class="question-group"><label class="question-label" for="${field.name}">${field.label}${field.required ? ' <span class="required">*</span>' : ''}</label><input class="text-input" id="${field.name}" type="text" name="${field.name}" ${field.required ? 'required' : ''} placeholder="${field.placeholder || ''}"></div>`;
}

function renderLikertTable(items) {
    const headerHtml = `<div class="likert-header"><span></span>${LIKERT_LABELS.map(label => `<span>${label}</span>`).join('')}</div>`;
    const rowsHtml = items.map(item => `<div class="likert-row"><span class="likert-label">${item.code}. ${item.text}</span>${[1, 2, 3, 4, 5].map(value => `<label><input type="radio" name="${item.code}" value="${value}" ${value === 1 ? 'required' : ''}></label>`).join('')}</div>`).join('');
    return `<div class="likert-table">${headerHtml}${rowsHtml}</div>`;
}

function renderInterviewQuestion(question) {
    return `<div class="interview-question" data-q="${question.id}"><p class="q-text"><strong>${question.id}.</strong> ${question.text}</p><div class="recorder-box" id="rec-${question.id}"></div></div>`;
}

function renderSectionNavigation(type, current, total, options = {}) {
    const prevButton = current > 1 ? `<button class="btn-prev" onclick="prevSection('${type}', ${current})">→ السابق</button>` : '';
    const nextButton = current < total ? `<button class="glow-btn" onclick="nextSection('${type}', ${current})">التالي ←</button>` : '';
    const submitButton = current === total ? `<button class="glow-btn" onclick="${type === 'questionnaire' ? 'submitQuestionnaire()' : 'saveInterview()'}">${options.submitLabel || 'حفظ'}</button>` : '';
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

    CONFIG.student1 = student1 ? student1.value.trim() || CONFIG.student1 : CONFIG.student1;
    CONFIG.student2 = student2 ? student2.value.trim() || CONFIG.student2 : CONFIG.student2;
    CONFIG.supervisor = supervisor ? supervisor.value.trim() || CONFIG.supervisor : CONFIG.supervisor;

    localStorage.setItem(STORAGE_KEYS.config, JSON.stringify(CONFIG));
    injectConfig();
    showToast('تم حفظ الإعدادات بنجاح', 'success');
}

function initTheme() {
    const theme = Math.random() < 0.5 ? 'day' : 'night';
    applyTheme(theme);
}

function applyTheme(theme) {
    document.body.classList.remove('day-mode', 'night-mode');
    document.body.classList.add(`${theme}-mode`);

    const btn = document.getElementById('theme-toggle');
    if (btn) {
        btn.textContent = theme === 'day' ? '☀️' : '🌙';
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

    container.querySelectorAll('input[type="text"], textarea').forEach(input => {
        if (input.value.trim()) {
            data[input.name] = input.value.trim();
        } else if (input.name) {
            data[input.name] = '';
        }
    });

    return data;
}

async function submitQuestionnaire() {
    const lastSection = QUESTIONNAIRE_SECTIONS.length;
    if (!validateCurrentSection('questionnaire', lastSection)) return;

    const container = document.getElementById('questionnaire-survey');
    const payload = collectFormData(container);
    payload.id = generateId();
    payload.timestamp = new Date().toISOString();
    payload.study = STUDY_CODE;

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

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        await updateStats();
        return true;
    } catch (error) {
        console.error('Failed to save survey', error);
        showToast('تعذر حفظ الاستبيان في هذه اللحظة', 'error');
        return false;
    }
}

async function updateStats() {
    try {
        const response = await fetch('/api/get_surveys');
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
        if (value) counts[value] = (counts[value] || 0) + 1;
    });
    return counts;
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

    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
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

    chartInstances[canvasId] = new Chart(canvas.getContext('2d'), {
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
    renderChart('chart-age', 'bar', Object.keys(ageData), Object.values(ageData), { label: 'عدد المشاركين' });

    const relationData = countOccurrences(questionnaireData, 'relation_type');
    renderChart('chart-relation', 'doughnut', Object.keys(relationData), Object.values(relationData), { label: 'طبيعة العلاقة' });

    const serviceData = countOccurrences(questionnaireData, 'service_type');
    renderChart('chart-service', 'bar', Object.keys(serviceData), Object.values(serviceData), { label: 'نوع الخدمة', indexAxis: 'y' });

    const gmDimensions = QUESTIONNAIRE_DIMENSIONS.slice(0, 4);
    renderChart('chart-gm', 'radar', gmDimensions.map(item => item.label), gmDimensions.map(item => getAverage(questionnaireData, item.items)), {
        label: 'متوسط التسويق الأخضر',
        backgroundColor: 'rgba(14, 165, 233, 0.2)',
        borderColor: 'rgba(14, 165, 233, 1)'
    });

    const imgDimensions = QUESTIONNAIRE_DIMENSIONS.slice(4);
    renderChart('chart-img', 'radar', imgDimensions.map(item => item.label), imgDimensions.map(item => getAverage(questionnaireData, item.items)), {
        label: 'متوسط الصورة الذهنية',
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        borderColor: 'rgba(34, 197, 94, 1)'
    });

    const trendData = [...questionnaireData]
        .filter(item => item.timestamp)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const overallLabels = trendData.map((_, index) => `مشارك ${index + 1}`);
    const overallValues = trendData.map(item => getRespondentAverage(item, QUESTIONNAIRE_DIMENSIONS.flatMap(dimension => dimension.items)));
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
        const response = await fetch('/api/get_surveys');
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
            html += headers.map(header => `<td>${escapeHtml(formatCellValue(row[header]))}</td>`).join('');
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
        const response = await fetch('/api/get_surveys');
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
            const value = String(row[header] ?? '').replace(/"/g, '""');
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

function formatHeader(key) {
    return HEADER_TRANSLATIONS[key] || key;
}

function formatCellValue(value) {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
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
        color: {
            dark: '#1e293b',
            light: '#ffffff'
        }
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

document.addEventListener('click', event => {
    const modal = document.getElementById('password-modal');
    if (event.target === modal) {
        hidePasswordModal();
    }
});
