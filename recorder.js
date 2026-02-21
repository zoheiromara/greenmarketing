/* =====================================================
   Interview Transcriber (Audio-less version)
   - Web Speech API for live Arabic/French transcription
   - Backend API saving (Text only)
   ===================================================== */

(function () {
    'use strict';

    // ── State ──
    const recorders = {};       // questionId -> { transcript, recognition, isRecording, lang }
    let currentLang = 'ar-DZ';  // default: Algerian Arabic

    // ── Constants ──
    const LANGS = {
        'ar-DZ': 'عربي جزائري',
        'ar': 'عربي فصحى',
        'fr-FR': 'Français'
    };

    // ── Init: build recorder UI in every .recorder-box ──
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.recorder-box').forEach(box => {
            const qId = box.id.replace('rec-', '');
            recorders[qId] = {
                transcript: '',
                recognition: null,
                isRecording: false,
                lang: currentLang
            };
            buildRecorderUI(box, qId);
        });
    });

    function buildRecorderUI(container, qId) {
        container.innerHTML = `
            <div class="rec-controls">
                <button class="rec-btn" data-q="${qId}" onclick="window._toggleRecord('${qId}')" title="ابدأ التفريغ">
                    <span class="rec-icon">🎙️</span>
                    <span class="rec-status-text">ابدأ التفريغ</span>
                </button>
                <div class="rec-timer" id="timer-${qId}">00:00</div>
                <div class="lang-toggle">
                    <button class="lang-btn active" data-lang="ar-DZ" onclick="window._setLang('${qId}','ar-DZ')">عربي</button>
                    <button class="lang-btn" data-lang="fr-FR" onclick="window._setLang('${qId}','fr-FR')">FR</button>
                </div>
            </div>
            <div class="rec-wave" id="wave-${qId}">
                <div class="wave-bars">
                    <span></span><span></span><span></span><span></span><span></span>
                    <span></span><span></span><span></span><span></span><span></span>
                </div>
            </div>
            <div class="transcript-area">
                <label class="transcript-label">النص المُفرَّغ (استماع مباشر):</label>
                <textarea class="transcript-text" id="transcript-${qId}" rows="3" placeholder="سيظهر النص المُفرَّغ هنا بمجرد التحدث... يمكنك التعديل يدوياً" dir="rtl"></textarea>
            </div>
            <!-- Playback hidden since we are text-only now, keeping structure compatible -->
            <div class="rec-playback" id="playback-${qId}" style="display:none;"></div>
        `;
    }

    // ── Toggle Recording (Transcription) ──
    window._toggleRecord = function (qId) {
        const state = recorders[qId];
        if (state.isRecording) {
            stopRecording(qId);
        } else {
            startTranscriptionOnly(qId);
        }
    };

    function startTranscriptionOnly(qId) {
        const state = recorders[qId];

        // Web Speech API check
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('عذراً، متصفحك لا يدعم تحويل الصوت إلى نص. يرجى استخدام Google Chrome.');
            return;
        }

        // We use non-continuous mode for Mobile robustness
        // Mobile Chrome often duplicates results when continuous is true.
        const recognition = new SpeechRecognition();
        recognition.lang = state.lang;
        recognition.continuous = false; // Fresh sessions per sentence
        recognition.interimResults = true;

        const textArea = document.getElementById(`transcript-${qId}`);

        recognition.onstart = () => {
            console.log(`[Diagnostic q${qId}] Fresh session started.`);
        };

        recognition.onresult = (event) => {
            if (state.recognition !== recognition) return;

            let interim = '';
            let final = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    final += transcript;
                } else {
                    interim += transcript;
                }
            }

            if (final) {
                appendUniqueText(qId, final);
                // On mobile, stopping and starting a fresh session is more reliable than 'continuous: true'
                recognition.stop();
            } else {
                // For interim (while speaking), we just show the view temporarily
                const baseText = state.transcript || '';
                textArea.value = (baseText + ' ' + interim).trim().replace(/\s+/g, ' ');
            }
        };

        // Guard against word duplication by checking the end of the current transcript
        function appendUniqueText(qId, newText) {
            const current = (state.transcript || '').trim();
            const incoming = newText.trim();

            // Basic deduplication: if the exact string was just added, skip it
            if (current.endsWith(incoming)) {
                console.log(`[Diagnostic q${qId}] Duplicate phrase detected, skipping append.`);
                return;
            }

            const updated = (current + ' ' + incoming).trim().replace(/\s+/g, ' ');
            state.transcript = updated;
            textArea.value = updated;
        }

        recognition.onerror = (event) => {
            console.warn(`[Diagnostic q${qId}] Recognition error:`, event.error);
            if (event.error === 'not-allowed') stopRecording(qId);
        };

        recognition.onend = () => {
            console.log(`[Diagnostic q${qId}] Session ended.`);
            // Auto-restart immediately if we are still in "Recording" mode
            if (state.isRecording && state.recognition === recognition) {
                setTimeout(() => {
                    if (state.isRecording) {
                        try { recognition.start(); } catch (e) { }
                    }
                }, 100);
            }
        };

        try {
            state.recognition = recognition;
            recognition.start();
        } catch (err) {
            console.error('Failed to start transcription:', err);
        }

        // UI Updates
        state.isRecording = true;
        const btn = document.querySelector(`.rec-btn[data-q="${qId}"]`);
        btn.classList.add('recording');
        btn.querySelector('.rec-icon').textContent = '⏹️';
        btn.querySelector('.rec-status-text').textContent = 'إيقاف';
        document.getElementById(`wave-${qId}`).classList.add('active');

        // Timer
        state._timerStart = Date.now();
        state._timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - state._timerStart) / 1000);
            const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
            const s = String(elapsed % 60).padStart(2, '0');
            document.getElementById(`timer-${qId}`).textContent = `${m}:${s}`;
        }, 1000);
    }

    function stopRecording(qId) {
        const state = recorders[qId];

        state.isRecording = false;
        if (state.recognition) {
            state.recognition.stop();
            state.recognition = null; // Clear the ref immediately
        }
        clearInterval(state._timerInterval);

        const btn = document.querySelector(`.rec-btn[data-q="${qId}"]`);
        btn.classList.remove('recording');
        btn.querySelector('.rec-icon').textContent = '🎙️';
        btn.querySelector('.rec-status-text').textContent = 'إكمال التفريغ';
        document.getElementById(`wave-${qId}`).classList.remove('active');
    }

    // ── Language Switch ──
    window._setLang = function (qId, lang) {
        const state = recorders[qId];
        state.lang = lang;

        // Update UI
        const box = document.getElementById(`rec-${qId}`);
        box.querySelectorAll('.lang-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.lang === lang);
        });

        // If currently transcribing, kill the old instance and start a fresh one for the new lang
        if (state.isRecording) {
            if (state.recognition) {
                state.recognition.stop();
                state.recognition = null; // Prevents onend from auto-restarting the old instance
            }
            setTimeout(() => {
                if (state.isRecording) startTranscriptionOnly(qId);
            }, 350);
        }
    };

    // ── Build Review Section ──
    function buildReview() {
        const container = document.getElementById('interview-review');
        if (!container) return;

        let html = '';
        const questions = document.querySelectorAll('.interview-question');
        questions.forEach(q => {
            const qId = q.dataset.q;
            const text = q.querySelector('.q-text').textContent.trim();
            const state = recorders[qId];
            const transcript = document.getElementById(`transcript-${qId}`)?.value || state?.transcript || '';
            const isDone = transcript.length > 0;

            html += `
                <div class="review-card">
                    <div class="review-q">${text}</div>
                    <div class="review-status">
                        <span class="${isDone ? 'status-done' : 'status-pending'}">
                            ${isDone ? '✅ تم التفريغ' : '⏳ فارغ'}
                        </span>
                    </div>
                    <div class="review-transcript">${transcript || '<em>لا يوجد نص</em>'}</div>
                </div>
            `;
        });

        html += `
            <div class="export-buttons" style="flex-direction: column; align-items: center; gap: 15px;">
                <button class="btn-export glow-btn" onclick="window.saveToBackend()" style="padding: 15px 40px; font-size: 1.1em;">💾 حفظ البيانات على الخادم</button>
                <div style="display: flex; gap: 10px;">
                    <button class="btn-export" onclick="window._exportInterview('json')">📥 تصدير JSON (محلي)</button>
                    <button class="btn-export" onclick="window._exportInterview('csv')">📊 تصدير CSV (محلي)</button>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    // Hook into section navigation to build review when entering section 8
    const origNext = window.nextSection;
    if (origNext) {
        window.nextSection = function (type, current) {
            if (type === 'employee' && current === 7) {
                buildReview();
            }
            origNext(type, current);
        };
    }

    // ── POST TO SERVER (Text Only) ──
    window.saveToBackend = async function () {
        try {
            const interviewData = await collectInterviewData();

            // Show loading
            const btn = document.querySelector('.glow-btn');
            const originalText = btn.innerHTML;
            btn.innerHTML = '⏳ جاري الحفظ... الرجاء الانتظار';
            btn.disabled = true;

            const response = await fetch('/api/save_interview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(interviewData)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                alert('✅ تم حفظ نصوص المقابلة بنجاح على الخادم!');
                if (typeof showPage === 'function') showPage('thank-you');
            } else {
                throw new Error(result.error || 'Unknown error');
            }

        } catch (err) {
            console.error(err);
            alert('❌ حدث خطأ أثناء الحفظ على الخادم: ' + err.message);
            const btn = document.querySelector('.glow-btn');
            btn.innerHTML = '💾 حفظ البيانات على الخادم';
            btn.disabled = false;
        }
    };

    // Helper to collect all metadata and transcripts
    async function collectInterviewData() {
        const metadata = {};
        const metaFields = ['e_interviewee_name', 'e_position', 'e_membership_duration', 'e_education', 'e_age', 'e_interview_location'];
        metaFields.forEach(name => {
            const el = document.querySelector(`[name="${name}"]`);
            if (el) {
                if (el.type === 'radio') {
                    const checked = document.querySelector(`[name="${name}"]:checked`);
                    metadata[name] = checked ? checked.value : '';
                } else {
                    metadata[name] = el.value;
                }
            }
        });

        const questions = [];
        for (const q of document.querySelectorAll('.interview-question')) {
            const qId = q.dataset.q;
            const transcript = document.getElementById(`transcript-${qId}`)?.value || '';

            questions.push({
                id: qId,
                text: q.querySelector('.q-text').textContent.trim(),
                transcript: transcript,
                duration: document.getElementById(`timer-${qId}`)?.textContent || '00:00'
            });
        }

        return {
            id: 'interview_text_' + Date.now(),
            timestamp: new Date().toISOString(),
            metadata,
            questions
        };
    }

    // ── Export (Local Fallback) ──
    window._exportInterview = async function (format) {
        // Collect current data directly instead of from localStorage
        const interviewData = await collectInterviewData();

        if (format === 'json') {
            const blob = new Blob([JSON.stringify([interviewData], null, 2)], { type: 'application/json' });
            downloadBlob(blob, `interview_${Date.now()}.json`);
        } else if (format === 'csv') {
            let csv = '\uFEFF'; // BOM for Arabic
            csv += 'Interview ID,Timestamp,Interviewee,Position,Question,Transcript,Duration\\n';
            const iv = interviewData;
            iv.questions.forEach(q => {
                const name = (iv.metadata.e_interviewee_name || '').replace(/"/g, '""');
                const pos = (iv.metadata.e_position || '').replace(/"/g, '""');
                const qText = q.text.replace(/"/g, '""');
                const transcript = (q.transcript || '').replace(/"/g, '""');
                csv += `"${iv.id}","${iv.timestamp}","${name}","${pos}","${qText}","${transcript}","${q.duration}"\\n`;
            });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
            downloadBlob(blob, `interview_${Date.now()}.csv`);
        }
    };

    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

})();
