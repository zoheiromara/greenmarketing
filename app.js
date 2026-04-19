const state = {
  content: null,
  totalLikertQuestions: 0,
};

const els = {
  heroMeta: document.getElementById("heroMeta"),
  studySummary: document.getElementById("studySummary"),
  statQuestions: document.getElementById("statQuestions"),
  statInterview: document.getElementById("statInterview"),
  downloadPanel: document.querySelector(".download-list"),
  progressFill: document.getElementById("progressFill"),
  progressText: document.getElementById("progressText"),
  surveyTitle: document.getElementById("surveyTitle"),
  surveyVersion: document.getElementById("surveyVersion"),
  surveyIntro: document.getElementById("surveyIntro"),
  surveyMount: document.getElementById("surveyMount"),
  surveyForm: document.getElementById("surveyForm"),
  formMessage: document.getElementById("formMessage"),
  interviewTitle: document.getElementById("interviewTitle"),
  interviewVersion: document.getElementById("interviewVersion"),
  interviewMount: document.getElementById("interviewMount"),
};

document.addEventListener("DOMContentLoaded", () => {
  bindTabs();
  bootstrap();
});

async function bootstrap() {
  try {
    const response = await fetch("/api/content");
    if (!response.ok) {
      throw new Error("تعذر تحميل محتوى التطبيق.");
    }
    const content = await response.json();
    state.content = content;
    state.totalLikertQuestions = countLikertQuestions(content.survey.sections);
    renderMeta(content);
    renderSurvey(content.survey);
    renderInterview(content.interview);
    bindSurvey();
    updateProgress();
  } catch (error) {
    els.surveyMount.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    els.interviewMount.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  }
}

function bindTabs() {
  const buttons = Array.from(document.querySelectorAll(".tab-button"));
  const panels = {
    survey: document.getElementById("tab-survey"),
    interview: document.getElementById("tab-interview"),
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      buttons.forEach((item) => item.classList.toggle("is-active", item === button));
      Object.entries(panels).forEach(([key, panel]) => {
        panel.classList.toggle("is-active", key === button.dataset.tab);
      });
    });
  });
}

function renderMeta(content) {
  const versionChips = [
    content.meta.study_label,
    `Survey ${content.survey.version}`,
    `Interview ${content.interview.version}`,
  ];
  els.heroMeta.innerHTML = versionChips
    .map((label) => `<div class="meta-chip">${escapeHtml(label)}</div>`)
    .join("");

  els.studySummary.textContent = content.meta.summary;
  els.statQuestions.textContent = String(state.totalLikertQuestions);
  els.statInterview.textContent = String(content.interview.sections.length);

  els.downloadPanel.innerHTML = content.downloads
    .map(
      (item) => `
        <a class="download-item" href="${escapeHtml(item.href)}" target="_blank" rel="noreferrer">
          <span class="download-name">${escapeHtml(item.label)}</span>
          <span class="download-format">${escapeHtml(item.format)}</span>
        </a>
      `
    )
    .join("");
}

function renderSurvey(survey) {
  els.surveyTitle.textContent = survey.title;
  els.surveyVersion.textContent = survey.version;
  els.surveyIntro.textContent = survey.intro;

  const generalCard = `
    <section class="section-card">
      <div class="section-head">
        <div>
          <p class="section-index">Profile</p>
          <h3 class="section-title">${escapeHtml(survey.general_section_title)}</h3>
        </div>
        <div class="panel-note">${escapeHtml(survey.general_section_hint)}</div>
      </div>
      <div class="general-grid">
        ${survey.general_fields.map(renderGeneralField).join("")}
      </div>
    </section>
  `;

  const likertNote = `
    <section class="section-card">
      <div class="section-head">
        <div>
          <p class="section-index">Likert Scale</p>
          <h3 class="section-title">${escapeHtml(survey.likert.title)}</h3>
        </div>
      </div>
      <p class="panel-intro">${escapeHtml(survey.likert.description)}</p>
    </section>
  `;

  const sectionCards = survey.sections.map(renderSurveySection).join("");
  const openCard = `
    <section class="section-card">
      <div class="section-head">
        <div>
          <p class="section-index">Optional</p>
          <h3 class="section-title">${escapeHtml(survey.open_question.title)}</h3>
        </div>
      </div>
      <label class="field-label" for="${escapeHtml(survey.open_question.code)}">${escapeHtml(survey.open_question.prompt)}</label>
      <textarea id="${escapeHtml(survey.open_question.code)}" class="textarea-input" name="${escapeHtml(survey.open_question.code)}" placeholder="${escapeHtml(survey.open_question.placeholder)}"></textarea>
    </section>
  `;

  els.surveyMount.innerHTML = [generalCard, likertNote, sectionCards, openCard].join("");
}

function renderGeneralField(field) {
  if (field.type === "textarea") {
    return `
      <article class="general-card">
        <label class="field-label" for="${escapeHtml(field.code)}">${escapeHtml(field.label)}</label>
        <textarea class="textarea-input" id="${escapeHtml(field.code)}" name="${escapeHtml(field.code)}" ${field.required ? "required" : ""}></textarea>
      </article>
    `;
  }

  const options = field.options
    .map((option) => {
      const inputType = field.type === "multi" ? "checkbox" : "radio";
      return `
        <label class="option-label">
          <input type="${inputType}" name="${escapeHtml(field.code)}" value="${escapeHtml(option.value)}" ${field.required && inputType === "radio" ? "required" : ""}>
          <span>${escapeHtml(option.label)}</span>
        </label>
      `;
    })
    .join("");

  return `
    <article class="general-card">
      <span class="field-label">${escapeHtml(field.label)}</span>
      <div class="option-stack">${options}</div>
    </article>
  `;
}

function renderSurveySection(section) {
  return `
    <section class="section-card">
      <div class="section-head">
        <div>
          <p class="section-index">${escapeHtml(section.index_label)}</p>
          <h3 class="section-title">${escapeHtml(section.title)}</h3>
        </div>
      </div>
      ${section.groups
        .map(
          (group) => `
            <div class="question-group">
              <h4 class="subsection-title">${escapeHtml(group.title)}</h4>
              <div class="question-list">
                ${group.items.map((item) => renderLikertQuestion(item)).join("")}
              </div>
            </div>
          `
        )
        .join("")}
    </section>
  `;
}

function renderLikertQuestion(item) {
  const options = state.content.survey.likert.options
    .map(
      (option) => `
        <label class="likert-option">
          <input type="radio" name="${escapeHtml(item.code)}" value="${escapeHtml(option.value)}" required>
          <span>${escapeHtml(option.label)}</span>
        </label>
      `
    )
    .join("");

  return `
    <article class="question-card">
      <div class="question-top">
        <p class="question-text">${escapeHtml(item.prompt)}</p>
        <span class="question-code">${escapeHtml(item.code)}</span>
      </div>
      <div class="likert-grid">${options}</div>
    </article>
  `;
}

function renderInterview(interview) {
  els.interviewTitle.textContent = interview.title;
  els.interviewVersion.textContent = interview.version;

  const metaCard = `
    <section class="interview-card">
      <h3>الوظيفة المنهجية</h3>
      <p>${escapeHtml(interview.purpose)}</p>
      <ul class="meta-list">
        ${interview.highlights.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </section>
  `;

  const audienceCard = `
    <section class="interview-card">
      <h3>الفئة المستهدفة والبيانات الأولية</h3>
      <ul class="meta-list">
        ${interview.audience.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
      <ul class="meta-list">
        ${interview.initial_profile.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </section>
  `;

  const sections = interview.sections
    .map(
      (section) => `
        <section class="interview-card">
          <h3>${escapeHtml(section.title)}</h3>
          <ol>
            ${section.questions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ol>
          ${
            section.follow_ups.length
              ? `
                <p class="sidebar-label" style="margin-top: 1rem;">أسئلة متابعة</p>
                <ul class="meta-list">
                  ${section.follow_ups.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
                </ul>
              `
              : ""
          }
        </section>
      `
    )
    .join("");

  const codingCard = `
    <section class="interview-card">
      <h3>شبكة الترميز النوعي المقترحة</h3>
      <ul class="meta-list">
        ${interview.coding_map.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </section>
  `;

  els.interviewMount.innerHTML = [metaCard, audienceCard, sections, codingCard].join("");
}

function bindSurvey() {
  els.surveyForm.addEventListener("change", updateProgress);
  els.surveyForm.addEventListener("submit", submitSurvey);
}

function updateProgress() {
  const answered = state.content
    ? collectLikertResponses().filter(Boolean).length
    : 0;
  const total = state.totalLikertQuestions;
  const ratio = total ? (answered / total) * 100 : 0;
  els.progressFill.style.width = `${ratio}%`;
  els.progressText.textContent = `${answered} / ${total}`;
}

async function submitSurvey(event) {
  event.preventDefault();
  const payload = buildPayload();
  const validationError = validatePayload(payload);
  setFormMessage(validationError || "جاري إرسال الاستبيان...", validationError ? "error" : "info");
  if (validationError) {
    return;
  }

  const button = els.surveyForm.querySelector("button[type='submit']");
  button.disabled = true;
  try {
    const response = await fetch("/api/submit-survey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "تعذر حفظ الاستبيان.");
    }
    els.surveyForm.reset();
    updateProgress();
    setFormMessage(`تم حفظ الاستبيان بنجاح. رقم العملية: ${result.submission_id}`, "success");
  } catch (error) {
    setFormMessage(error.message, "error");
  } finally {
    button.disabled = false;
  }
}

function buildPayload() {
  const general = {};
  state.content.survey.general_fields.forEach((field) => {
    if (field.type === "multi") {
      general[field.code] = Array.from(
        document.querySelectorAll(`input[name="${field.code}"]:checked`)
      ).map((input) => input.value);
      return;
    }

    if (field.type === "textarea") {
      general[field.code] = document.getElementById(field.code)?.value.trim() || "";
      return;
    }

    const selected = document.querySelector(`input[name="${field.code}"]:checked`);
    general[field.code] = selected ? selected.value : "";
  });

  const answers = {};
  flattenItems(state.content.survey.sections).forEach((item) => {
    const selected = document.querySelector(`input[name="${item.code}"]:checked`);
    answers[item.code] = selected ? selected.value : "";
  });

  const openCode = state.content.survey.open_question.code;
  const openResponse = document.getElementById(openCode)?.value.trim() || "";

  return {
    study: state.content.meta.study_label,
    survey_version: state.content.survey.version,
    interview_version: state.content.interview.version,
    submitted_from: window.location.origin,
    general,
    answers,
    open_response: openResponse,
  };
}

function validatePayload(payload) {
  for (const field of state.content.survey.general_fields) {
    if (!field.required) {
      continue;
    }
    const value = payload.general[field.code];
    if (field.type === "multi" && (!Array.isArray(value) || value.length === 0)) {
      return `يرجى استكمال الحقل: ${field.label}`;
    }
    if (field.type !== "multi" && !value) {
      return `يرجى استكمال الحقل: ${field.label}`;
    }
  }

  const missingLikert = Object.entries(payload.answers).find(([, value]) => !value);
  if (missingLikert) {
    return `يرجى الإجابة عن جميع بنود ليكرت قبل الإرسال.`;
  }

  return "";
}

function setFormMessage(message, kind) {
  els.formMessage.textContent = message;
  els.formMessage.classList.remove("is-error", "is-success");
  if (kind === "error") {
    els.formMessage.classList.add("is-error");
  }
  if (kind === "success") {
    els.formMessage.classList.add("is-success");
  }
}

function collectLikertResponses() {
  return flattenItems(state.content.survey.sections).map((item) => {
    const selected = document.querySelector(`input[name="${item.code}"]:checked`);
    return selected ? selected.value : "";
  });
}

function flattenItems(sections) {
  return sections.flatMap((section) => section.groups.flatMap((group) => group.items));
}

function countLikertQuestions(sections) {
  return flattenItems(sections).length;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
