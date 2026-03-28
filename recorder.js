(function () {
    'use strict';

    const recorders = {};
    const DEFAULT_LANG = 'ar-DZ';
    const LANGS = {
        'ar-DZ': 'عربي',
        'fr-FR': 'FR'
    };

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.recorder-box').forEach(box => {
            const questionId = box.id.replace('rec-', '');
            recorders[questionId] = {
                transcript: '',
                recognition: null,
                isRecording: false,
                lang: DEFAULT_LANG,
                timerInterval: null,
                timerStart: null
            };
            renderRecorderUI(box, questionId);
        });
    });

    function renderRecorderUI(container, questionId) {
        container.innerHTML = `
            <div class="rec-controls">
                <button class="rec-btn" data-q="${questionId}" onclick="window._toggleRecord('${questionId}')">
                    <span class="rec-icon">🎙️</span>
                    <span class="rec-status-text">ابدأ التفريغ</span>
                </button>
                <div class="rec-timer" id="timer-${questionId}">00:00</div>
                <div class="lang-toggle">
                    ${Object.entries(LANGS).map(([code, label], index) => `
                        <button class="lang-btn ${index === 0 ? 'active' : ''}" data-lang="${code}" onclick="window._setLang('${questionId}', '${code}')">${label}</button>
                    `).join('')}
                </div>
            </div>
            <div class="rec-wave" id="wave-${questionId}">
                <div class="wave-bars">
                    <span></span><span></span><span></span><span></span><span></span>
                    <span></span><span></span><span></span><span></span><span></span>
                </div>
            </div>
            <div class="transcript-area">
                <label class="transcript-label">النص المفرغ:</label>
                <textarea class="transcript-text" id="transcript-${questionId}" rows="3" placeholder="سيظهر النص هنا أثناء الحديث ويمكن تعديله يدويا" dir="rtl"></textarea>
            </div>
        `;
    }

    window._toggleRecord = function (questionId) {
        const recorder = recorders[questionId];
        if (!recorder) return;

        if (recorder.isRecording) {
            stopRecording(questionId);
        } else {
            startRecording(questionId);
        }
    };

    function startRecording(questionId) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('المتصفح الحالي لا يدعم التفريغ الصوتي المباشر. يفضل استخدام Google Chrome.');
            return;
        }

        const recorder = recorders[questionId];
        const recognition = new SpeechRecognition();
        const transcriptField = document.getElementById(`transcript-${questionId}`);

        recognition.lang = recorder.lang;
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onresult = event => {
            if (recorders[questionId].recognition !== recognition) return;

            let interim = '';
            let finalText = '';

            for (let index = event.resultIndex; index < event.results.length; index += 1) {
                const transcript = event.results[index][0].transcript;
                if (event.results[index].isFinal) {
                    finalText += transcript;
                } else {
                    interim += transcript;
                }
            }

            if (finalText) {
                appendUniqueTranscript(questionId, finalText);
                recognition.stop();
            } else if (transcriptField) {
                transcriptField.value = `${recorder.transcript} ${interim}`.trim().replace(/\s+/g, ' ');
            }
        };

        recognition.onerror = event => {
            console.warn('Speech recognition error', event.error);
            if (event.error === 'not-allowed') {
                stopRecording(questionId);
            }
        };

        recognition.onend = () => {
            if (recorders[questionId].isRecording && recorders[questionId].recognition === recognition) {
                setTimeout(() => {
                    try {
                        recognition.start();
                    } catch (error) {
                        console.warn('Recognition restart blocked', error);
                    }
                }, 120);
            }
        };

        recorder.recognition = recognition;
        recorder.isRecording = true;
        recorder.timerStart = Date.now();
        recorder.timerInterval = setInterval(() => updateTimer(questionId), 1000);
        updateRecorderUI(questionId, true);

        try {
            recognition.start();
        } catch (error) {
            console.error('Recognition start failed', error);
            stopRecording(questionId);
        }
    }

    function stopRecording(questionId) {
        const recorder = recorders[questionId];
        if (!recorder) return;

        recorder.isRecording = false;
        if (recorder.recognition) {
            recorder.recognition.stop();
            recorder.recognition = null;
        }

        if (recorder.timerInterval) {
            clearInterval(recorder.timerInterval);
            recorder.timerInterval = null;
        }

        updateRecorderUI(questionId, false);
    }

    function appendUniqueTranscript(questionId, newText) {
        const recorder = recorders[questionId];
        const transcriptField = document.getElementById(`transcript-${questionId}`);
        const current = (recorder.transcript || '').trim();
        const incoming = (newText || '').trim();

        if (!incoming) return;
        if (current.endsWith(incoming)) return;

        recorder.transcript = `${current} ${incoming}`.trim().replace(/\s+/g, ' ');
        if (transcriptField) transcriptField.value = recorder.transcript;
    }

    function updateTimer(questionId) {
        const recorder = recorders[questionId];
        const timer = document.getElementById(`timer-${questionId}`);
        if (!recorder || !timer || !recorder.timerStart) return;

        const elapsed = Math.floor((Date.now() - recorder.timerStart) / 1000);
        const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const seconds = String(elapsed % 60).padStart(2, '0');
        timer.textContent = `${minutes}:${seconds}`;
    }

    function updateRecorderUI(questionId, isRecording) {
        const button = document.querySelector(`.rec-btn[data-q="${questionId}"]`);
        const wave = document.getElementById(`wave-${questionId}`);

        if (!button || !wave) return;

        button.classList.toggle('recording', isRecording);
        wave.classList.toggle('active', isRecording);
        button.querySelector('.rec-icon').textContent = isRecording ? '⏹️' : '🎙️';
        button.querySelector('.rec-status-text').textContent = isRecording ? 'إيقاف' : 'ابدأ التفريغ';
    }

    window._setLang = function (questionId, lang) {
        const recorder = recorders[questionId];
        if (!recorder) return;

        recorder.lang = lang;
        const box = document.getElementById(`rec-${questionId}`);
        if (box) {
            box.querySelectorAll('.lang-btn').forEach(button => {
                button.classList.toggle('active', button.dataset.lang === lang);
            });
        }

        if (recorder.isRecording) {
            stopRecording(questionId);
            setTimeout(() => startRecording(questionId), 250);
        }
    };

    function buildReview() {
        const container = document.getElementById('interview-review');
        if (!container) return;

        const cards = Array.from(document.querySelectorAll('.interview-question')).map(question => {
            const questionId = question.dataset.q;
            const prompt = question.querySelector('.q-text')?.textContent?.trim() || '';
            const transcript = document.getElementById(`transcript-${questionId}`)?.value?.trim() || '';
            const complete = transcript.length > 0;

            return `
                <div class="review-card">
                    <div class="review-q">${prompt}</div>
                    <div class="review-status">
                        <span class="${complete ? 'status-done' : 'status-pending'}">${complete ? 'تم التفريغ' : 'فارغ'}</span>
                    </div>
                    <div class="review-transcript">${transcript || '<em>لا يوجد نص</em>'}</div>
                </div>
            `;
        }).join('');

        container.innerHTML = cards;
    }

    async function collectInterviewData() {
        const metadata = {};
        ['interviewee_code', 'job_title', 'department', 'years_experience', 'responsibility_scope', 'interview_location'].forEach(name => {
            const field = document.querySelector(`[name="${name}"]`);
            metadata[name] = field ? field.value.trim() : '';
        });

        const questions = Array.from(document.querySelectorAll('.interview-question')).map(question => {
            const questionId = question.dataset.q;
            return {
                id: questionId,
                text: question.querySelector('.q-text')?.textContent?.trim() || '',
                transcript: document.getElementById(`transcript-${questionId}`)?.value?.trim() || '',
                duration: document.getElementById(`timer-${questionId}`)?.textContent || '00:00'
            };
        });

        return {
            id: `interview_${Date.now()}`,
            timestamp: new Date().toISOString(),
            study: 'cntpp_green_marketing_2026',
            metadata,
            questions
        };
    }

    async function saveToBackend() {
        try {
            const interviewData = await collectInterviewData();
            const response = await fetch('/api/save_interview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(interviewData)
            });

            const result = typeof window.parseApiResponse === 'function'
                ? await window.parseApiResponse(response)
                : await response.json().catch(() => null);
            if (!response.ok || !result?.success) {
                const message = typeof window.getApiErrorMessage === 'function'
                    ? window.getApiErrorMessage(response, result, 'Failed to save interview')
                    : (result?.error || `HTTP ${response.status}`);
                throw new Error(message);
            }

            if (Array.isArray(result?.warnings) && result.warnings.length) {
                console.warn('Interview saved with warnings', result.warnings, result.storage_details);
            }

            if (typeof updateStats === 'function') await updateStats();
            if (typeof showPage === 'function') showPage('thank-you');
            if (typeof showToast === 'function') showToast('تم حفظ المقابلة بنجاح', 'success');
        } catch (error) {
            console.error('Interview save failed', error);
            alert(`تعذر حفظ المقابلة: ${error.message}`);
        }
    }

    function exportInterview(format) {
        collectInterviewData().then(interviewData => {
            if (format === 'json') {
                const blob = new Blob([JSON.stringify(interviewData, null, 2)], { type: 'application/json' });
                downloadBlob(blob, `interview_${Date.now()}.json`);
                return;
            }

            let csv = '\uFEFFid,timestamp,interviewee_code,job_title,department,question_id,question_text,transcript,duration\n';
            interviewData.questions.forEach(question => {
                csv += [
                    interviewData.id,
                    interviewData.timestamp,
                    interviewData.metadata.interviewee_code,
                    interviewData.metadata.job_title,
                    interviewData.metadata.department,
                    question.id,
                    question.text,
                    question.transcript,
                    question.duration
                ].map(value => `"${String(value || '').replace(/"/g, '""')}"`).join(',') + '\n';
            });

            downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `interview_${Date.now()}.csv`);
        });
    }

    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    function resetInterviewRecorders() {
        Object.keys(recorders).forEach(questionId => {
            stopRecording(questionId);
            recorders[questionId].transcript = '';
            const transcriptField = document.getElementById(`transcript-${questionId}`);
            const timer = document.getElementById(`timer-${questionId}`);
            if (transcriptField) transcriptField.value = '';
            if (timer) timer.textContent = '00:00';
        });
    }

    window.buildInterviewReview = buildReview;
    window.saveToBackend = saveToBackend;
    window.saveInterview = saveToBackend;
    window._exportInterview = exportInterview;
    window.resetInterviewRecorders = resetInterviewRecorders;
})();
