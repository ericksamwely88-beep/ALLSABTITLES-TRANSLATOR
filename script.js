
    // ============================================================
    //  JAVASCRIPT KAMILI
    // ============================================================

    // ---------- STATE ----------
    let selectedFile = null;
    let fileContent = null;
    let translatedContent = null;
    let isTranslating = false;
    const MAX_CONCURRENT_TRANSLATIONS = 20;

    // ---------- DOM REFS ----------
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const fileStatus = document.getElementById('fileStatus');
    const removeFileBtn = document.getElementById('removeFile');
    const sourceLang = document.getElementById('sourceLang');
    const targetLang = document.getElementById('targetLang');
    const swapBtn = document.getElementById('swapBtn');
    const translateBtn = document.getElementById('translateBtn');
    const progressWrap = document.getElementById('progressWrap');
    const progressFill = document.getElementById('progressFill');
    const progressPercent = document.getElementById('progressPercent');
    const progressTitle = document.getElementById('progressTitle');
    const progressStats = document.getElementById('progressStats');
    const progressSpeed = document.getElementById('progressSpeed');
    const resultBox = document.getElementById('resultBox');
    const resultName = document.getElementById('resultName');
    const resultSub = document.getElementById('resultSub');
    const downloadBtn = document.getElementById('downloadBtn');
    const themeToggle = document.getElementById('themeToggle');

    // ---------- THEME ----------
    let dark = localStorage.getItem('theme') === 'dark';
    function setTheme(d) {
        dark = d;
        document.documentElement.setAttribute('data-theme', d ? 'dark' : 'light');
        themeToggle.textContent = d ? '☀️' : '🌙';
        localStorage.setItem('theme', d ? 'dark' : 'light');
    }
    setTheme(dark);
    themeToggle.addEventListener('click', () => setTheme(!dark));

    // ---------- FILE HANDLING ----------
    function handleFile(file) {
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        const valid = ['.srt', '.ass', '.vtt', '.sub'];
        if (!valid.includes(ext)) {
            alert('Tafadhali chagua faili ya subtitle: .srt, .ass, .vtt, .sub');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            alert('Faili ni kubwa sana (max 10MB)');
            return;
        }
        selectedFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            fileContent = e.target.result;
            showFileInfo(file);
            translateBtn.disabled = false;
            resultBox.classList.remove('show');
            translatedContent = null;
        };
        reader.readAsText(file, 'UTF-8');
    }

    function showFileInfo(file) {
        fileName.textContent = file.name;
        fileSize.textContent = (file.size / 1024).toFixed(1) + ' KB';
        fileStatus.textContent = '✅ Tayari';
        fileStatus.className = 'file-status';
        fileInfo.classList.add('show');
        dropZone.style.display = 'none';
    }

    function resetFile() {
        selectedFile = null;
        fileContent = null;
        translatedContent = null;
        fileInfo.classList.remove('show');
        dropZone.style.display = 'block';
        translateBtn.disabled = true;
        progressWrap.classList.remove('show');
        resultBox.classList.remove('show');
        fileInput.value = '';
    }

    // Drag & Drop
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) handleFile(e.target.files[0]);
    });
    removeFileBtn.addEventListener('click', resetFile);

    // Swap lugha
    swapBtn.addEventListener('click', () => {
        const tmp = sourceLang.value;
        sourceLang.value = targetLang.value;
        targetLang.value = tmp;
    });

    // ---------- TRANSLATION ENGINE ----------
    translateBtn.addEventListener('click', async () => {
        if (!fileContent || isTranslating || !selectedFile) return;

        const from = sourceLang.value;
        const to = targetLang.value;
        if (from === to) {
            translatedContent = fileContent;
            const newName = selectedFile.name.replace(/\.[^.]+$/, '') + '_' + to + '.srt';
            resultName.textContent = newName;
            resultSub.textContent = 'Lugha ya chanzo na lengwa ni sawa; faili limehifadhiwa bila kubadilisha.';
            resultBox.classList.add('show');
            downloadBtn.onclick = () => downloadFile(newName, translatedContent);
            fileStatus.textContent = '✅ Tayari';
            fileStatus.className = 'file-status';
            return;
        }

        isTranslating = true;
        translateBtn.disabled = true;
        resultBox.classList.remove('show');
        progressWrap.classList.add('show');
        progressFill.style.width = '0%';
        progressPercent.textContent = '0%';
        progressStats.textContent = '0 mistari';
        progressSpeed.textContent = '0 mistari/sek';
        progressTitle.textContent = 'Inatafsiri...';

        try {
            const start = performance.now();
            const blocks = parseSubtitle(fileContent, selectedFile.name);
            if (!blocks.length) {
                throw new Error('Hakuna mistari inayoweza kusomwa kwenye faili hili.');
            }

            const translatedBlocks = [];
            const batchSize = 20;
            let processed = 0;

            for (let i = 0; i < blocks.length; i += batchSize) {
                const batch = blocks.slice(i, i + batchSize);
                const results = await translateTexts(
                    batch.map((block) => block.text),
                    from,
                    to
                );

                batch.forEach((block, idx) => {
                    translatedBlocks.push({
                        ...block,
                        text: results[idx] || block.text
                    });
                });

                processed += batch.length;
                const pct = Math.min(100, Math.round((processed / blocks.length) * 100));
                progressFill.style.width = pct + '%';
                progressPercent.textContent = pct + '%';
                progressStats.textContent = processed + ' / ' + blocks.length + ' mistari';

                const elapsed = (performance.now() - start) / 1000;
                const speed = elapsed > 0 ? Math.max(1, Math.round(processed / elapsed)) : 0;
                progressSpeed.textContent = speed + ' mistari/sek';
            }

            translatedContent = buildSRT(translatedBlocks);
            const totalTime = ((performance.now() - start) / 1000).toFixed(1);
            const newName = selectedFile.name.replace(/\.[^.]+$/, '') + '_' + to + '.srt';

            resultName.textContent = newName;
            resultSub.textContent = `Imetafsiriwa katika ${totalTime} sekunde`;
            resultBox.classList.add('show');
            downloadBtn.onclick = () => downloadFile(newName, translatedContent);

            progressTitle.textContent = '✅ Imekamilika!';
            progressPercent.textContent = '100%';
            progressSpeed.textContent = totalTime + 's jumla';
            fileStatus.textContent = '✅ Imetafsiriwa';
            fileStatus.className = 'file-status';

            setTimeout(() => {
                progressWrap.classList.remove('show');
            }, 2600);
        } catch (err) {
            console.error(err);
            alert('Hitilafu wakati wa tafsiri. Tafadhali jaribu tena.');
            fileStatus.textContent = '❌ Hitilafu';
            fileStatus.className = 'file-status error';
            progressTitle.textContent = '❌ Hitilafu';
        } finally {
            isTranslating = false;
            translateBtn.disabled = false;
        }
    });

    const translationCache = new Map();

    async function translateTexts(texts, from, to) {
        const jobs = texts
            .map((text, index) => ({ index, text: typeof text === 'string' ? text.trim() : '' }))
            .filter((job) => job.text.length > 0);

        if (!jobs.length) return texts.map(() => '');

        const results = new Array(texts.length);
        let cursor = 0;
        const workerCount = Math.min(MAX_CONCURRENT_TRANSLATIONS, jobs.length);

        const workers = Array.from({ length: workerCount }, async () => {
            while (cursor < jobs.length) {
                const current = jobs[cursor];
                cursor += 1;
                const translated = await translateText(current.text, from, to);
                results[current.index] = translated;
            }
        });

        await Promise.allSettled(workers);

        for (let i = 0; i < texts.length; i += 1) {
            if (results[i] === undefined) {
                results[i] = texts[i] || '';
            }
        }

        return results;
    }

    async function translateText(text, from, to) {
        const cleanText = (text || '').trim();
        if (!cleanText) return text;
        if (from === to) return cleanText;

        const cacheKey = `${from}->${to}:${cleanText}`;
        if (translationCache.has(cacheKey)) {
            return translationCache.get(cacheKey);
        }

        const tryFetch = async (url, options = {}) => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 15000);
            try {
                const res = await fetch(url, { ...options, signal: controller.signal });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return await res.json();
            } finally {
                clearTimeout(timer);
            }
        };

        try {
            const googleData = await tryFetch(
                `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(cleanText)}`
            );
            if (Array.isArray(googleData?.[0])) {
                const translated = googleData[0].map((entry) => entry[0]).join('');
                translationCache.set(cacheKey, translated);
                return translated;
            }
        } catch (error) {
            console.warn('Google Translate imekataa, inajaribu API nyingine...', error);
        }

        try {
            const argosData = await tryFetch('https://translate.argosopentech.com/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    q: cleanText,
                    source: from,
                    target: to,
                    format: 'text'
                })
            });
            if (argosData?.translatedText) {
                translationCache.set(cacheKey, argosData.translatedText);
                return argosData.translatedText;
            }
        } catch (error) {
            console.warn('Argos Translate imekataa, inajaribu LibreTranslate...', error);
        }

        try {
            const libreData = await tryFetch('https://libretranslate.com/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    q: cleanText,
                    source: from,
                    target: to,
                    format: 'text'
                })
            });
            if (libreData?.translatedText) {
                translationCache.set(cacheKey, libreData.translatedText);
                return libreData.translatedText;
            }
        } catch (error) {
            console.warn('LibreTranslate imekataa, maandishi yasiyo ya kutafsiri yanarudishwa.', error);
        }

        translationCache.set(cacheKey, cleanText);
        return cleanText;
    }

    function parseSubtitle(content, fileName) {
        if (!content || !content.trim()) return [];
        const safeText = content.replace(/\uFEFF/g, '').replace(/\r/g, '');
        const ext = (fileName || '').split('.').pop().toLowerCase();

        if (ext === 'ass' || safeText.includes('Dialogue:')) {
            return parseASS(safeText);
        }

        if (ext === 'vtt' || safeText.toUpperCase().startsWith('WEBVTT')) {
            return parseVTT(safeText);
        }

        return parseSRT(safeText);
    }

    function parseVTT(content) {
        const blocks = [];
        const entries = content.replace(/^WEBVTT[\s\S]*?\n\n/, '').split(/\n\n+/);

        entries.forEach((entry) => {
            const lines = entry.split(/\n/).map((line) => line.trim()).filter(Boolean);
            if (!lines.length) return;
            const timeLine = lines.find((line) => /\d{2}:\d{2}:\d{2}[,.]\d{1,3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.]\d{1,3}/.test(line));
            if (!timeLine) return;
            const textLines = lines.filter((line) => line !== timeLine && !/^\d+$/.test(line));
            if (!textLines.length) return;
            blocks.push({
                index: String(blocks.length + 1),
                time: timeLine,
                text: textLines.join('\n')
            });
        });

        return blocks;
    }

    function parseASS(content) {
        const blocks = [];
        const lines = content.split(/\n/);
        let current = null;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) {
                if (current && current.text) {
                    blocks.push(current);
                    current = null;
                }
                continue;
            }

            const match = trimmed.match(/^Dialogue:\s*.*?,\s*(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3}),\s*(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3}),.*?,\s*(.*)$/i);
            if (match) {
                current = {
                    index: String(blocks.length + 1),
                    time: `${match[1]} --> ${match[2]}`,
                    text: match[3].replace(/\{.*?\}/g, '').trim()
                };
            } else if (current && !trimmed.startsWith('Dialogue:')) {
                current.text += `\n${trimmed.replace(/\{.*?\}/g, '').trim()}`;
            }
        }

        if (current && current.text) {
            blocks.push(current);
        }

        return blocks;
    }

    function parseSRT(content) {
        const blocks = [];
        const lines = content.split(/\n/);
        let current = { index: '', time: '', text: [] };
        let textMode = false;

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed === '') {
                if (current.index && current.time && current.text.length) {
                    blocks.push({
                        index: current.index,
                        time: current.time,
                        text: current.text.join('\n')
                    });
                }
                current = { index: '', time: '', text: [] };
                textMode = false;
                continue;
            }

            if (!current.index && /^\d+$/.test(trimmed)) {
                current.index = trimmed;
            } else if (!current.time && /\d{1,2}:\d{2}:\d{2}[,.]\d{1,3}\s*-->\s*\d{1,2}:\d{2}:\d{2}[,.]\d{1,3}/.test(trimmed)) {
                current.time = trimmed;
                textMode = true;
            } else if (textMode) {
                current.text.push(line.trim());
            }
        }

        if (current.index && current.time && current.text.length) {
            blocks.push({
                index: current.index,
                time: current.time,
                text: current.text.join('\n')
            });
        }

        return blocks;
    }

    function buildSRT(blocks) {
        return blocks.map((b) => `${b.index}\n${b.time}\n${b.text}\n`).join('\n');
    }

    function downloadFile(name, content) {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            translateBtn.click();
        }
    });

    console.log('✅ SubtitlePro imewashwa kwenye Linux XFCE!');
    console.log('💡 Buruta faili au bonyeza Ctrl+Enter kutafsiri.');
