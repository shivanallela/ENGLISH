/**
 * Antigravity AI - Frontend Application Script
 * Orchestrates Light/Dark themes, voice capture recorders, drag-drop files,
 * AJAX requests to Flask REST endpoints, diff views, and dynamic history tracking.
 */

document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements ---
  const body = document.body;
  const rawInputTextarea = document.getElementById("raw-input-textarea");
  const charCountSpan = document.getElementById("char-count");
  const clearInputBtn = document.getElementById("clear-input-btn");
  const processBtn = document.getElementById("process-btn");
  
  // Theme & Settings
  const themeToggleBtn = document.getElementById("theme-toggle-btn");
  const openSettingsBtn = document.getElementById("open-settings-btn");
  const closeSettingsBtn = document.getElementById("close-settings-btn");
  const settingsModal = document.getElementById("settings-modal");
  const saveSettingsBtn = document.getElementById("save-settings-btn");
  const testConnectionBtn = document.getElementById("test-connection-btn");
  const clearApiKeyBtn = document.getElementById("clear-api-key-btn");
  const apiKeyInput = document.getElementById("api-key-input");
  const toggleKeyVisibility = document.getElementById("toggle-key-visibility");
  const modelSelection = document.getElementById("model-selection");
  const apiStatusBadge = document.getElementById("api-status-badge");
  const testStatusMsg = document.getElementById("test-status-msg");
  
  // App Configs
  const reconstructionModeSelect = document.getElementById("reconstruction-mode");
  const languageProfileSelect = document.getElementById("language-profile");
  const confidenceThresholdSlider = document.getElementById("confidence-threshold");
  const confidenceValSpan = document.getElementById("confidence-val");
  
  // Workspace panels
  const outputStateEmpty = document.getElementById("output-state-empty");
  const outputStateLoading = document.getElementById("output-state-loading");
  const outputStateResults = document.getElementById("output-state-results");
  
  // Results details
  const resConfidence = document.getElementById("res-confidence");
  const resLanguage = document.getElementById("res-language");
  const resInputMode = document.getElementById("res-input-mode");
  const resEmotion = document.getElementById("res-emotion");
  const resGoal = document.getElementById("res-goal");
  
  // Clarification
  const clarificationCard = document.getElementById("clarification-card");
  const clarificationText = document.getElementById("clarification-text");
  const clarificationInput = document.getElementById("clarification-input");
  const submitClarificationBtn = document.getElementById("submit-clarification-btn");
  
  // Outputs & Diff
  const tabBtns = document.querySelectorAll(".tab-btn");
  const naturalText = document.getElementById("natural-text");
  const professionalText = document.getElementById("professional-text");
  const formalText = document.getElementById("formal-text");
  const diffView = document.getElementById("diff-view");
  const copyBtn = document.getElementById("copy-btn");
  const downloadResultsBtn = document.getElementById("download-results-btn");
  
  // Accordions & Education
  const issuesCount = document.getElementById("issues-count");
  const issuesList = document.getElementById("issues-list");
  const grammarList = document.getElementById("grammar-list");
  const alternativesList = document.getElementById("alternatives-list");
  const learningTipText = document.getElementById("learning-tip-text");
  
  // Audio uploads & recorders
  const audioFileInput = document.getElementById("audio-file-input");
  const fileUploadStatus = document.getElementById("file-upload-status");
  const uploadFilenameSpan = document.getElementById("upload-filename");
  const removeUploadedFileBtn = document.getElementById("remove-uploaded-file-btn");
  
  const recordingOverlay = document.getElementById("recording-overlay");
  const cancelRecordingBtn = document.getElementById("cancel-recording-btn");
  const stopRecordingBtn = document.getElementById("stop-recording-btn");
  const recordingTime = document.getElementById("recording-time");
  const recordingStatus = document.getElementById("recording-status");
  const recordSpeechBtn = document.getElementById("record-speech-btn");
  const liveSpeechBtn = document.getElementById("live-speech-btn");
  
  const audioWavePath1 = document.querySelector("#audio-wave path:first-child");
  const audioWavePath2 = document.querySelector("#audio-wave path:last-child");

  // History lists
  const historyList = document.getElementById("history-list");
  const historyLoading = document.getElementById("history-loading");
  const historyEmpty = document.getElementById("history-empty");

  // Presets
  const presetBtns = document.querySelectorAll(".preset-btn");

  // --- State Management ---
  let isRecordingAudio = false;
  let isRecordingLiveSpeech = false;
  let mediaRecorder = null;
  let audioChunks = [];
  let recordingDuration = 0;
  let recordingTimerInterval = null;
  let liveSpeechRecognition = null;
  
  let currentActiveTab = "natural";
  let lastApiResponseData = null;
  let uploadedAudioFile = null;
  
  let audioCtx = null;
  let analyser = null;
  let dataArray = null;
  let sourceNode = null;
  let animationFrameId = null;

  // Initialize Icons
  lucide.createIcons();

  // --- 1. Theme Configuration (Dark / Light Mode) ---
  const activeTheme = localStorage.getItem("antigravity_theme") || "dark-theme";
  body.className = activeTheme;
  updateThemeIcon(activeTheme);

  themeToggleBtn.addEventListener("click", () => {
    const isDark = body.classList.contains("dark-theme");
    const nextTheme = isDark ? "light-theme" : "dark-theme";
    body.className = nextTheme;
    localStorage.setItem("antigravity_theme", nextTheme);
    updateThemeIcon(nextTheme);
  });

  function updateThemeIcon(theme) {
    const iconName = theme === "dark-theme" ? "sun" : "moon";
    themeToggleBtn.innerHTML = `<i data-lucide="${iconName}"></i>`;
    try {
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    } catch (e) {
      console.warn("Lucide icons failed to render:", e);
    }
  }

  // --- 2. Database History Tracking ---
  loadReconstructionHistory();

  async function loadReconstructionHistory() {
    historyLoading.classList.remove("hidden");
    historyList.classList.add("hidden");
    historyEmpty.classList.add("hidden");
    
    try {
      const response = await fetch("/api/history");
      if (!response.ok) throw new Error("Failed to fetch history");
      
      const records = await response.json();
      historyLoading.classList.add("hidden");
      
      if (records.length === 0) {
        historyEmpty.classList.remove("hidden");
        return;
      }
      
      historyList.innerHTML = "";
      records.forEach(rec => {
        const item = document.createElement("div");
        item.className = "history-card";
        item.addEventListener("click", (e) => {
          // If delete button was clicked, don't trigger load
          if (e.target.closest(".history-card-delete-btn")) return;
          loadHistoryRecordIntoWorkspace(rec);
        });
        
        const timestamp = new Date(rec.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const snippetText = rec.original_input || "[Voice Audio]";

        item.innerHTML = `
          <div class="history-card-body">
            <div class="history-card-text" title="${escapeHTML(snippetText)}">${escapeHTML(snippetText)}</div>
            <div class="history-card-meta">
              <span class="history-card-badge">${escapeHTML(rec.language)}</span>
              <span>${timestamp}</span>
            </div>
          </div>
          <button class="history-card-delete-btn" title="Delete record">
            <i data-lucide="trash-2"></i>
          </button>
        `;
        
        // Add delete button listener
        const delBtn = item.querySelector(".history-card-delete-btn");
        delBtn.addEventListener("click", async () => {
          if (confirm("Delete this history record?")) {
            await deleteHistoryRecord(rec.id);
          }
        });
        
        historyList.appendChild(item);
      });
      
      historyList.classList.remove("hidden");
      lucide.createIcons();
      
    } catch (err) {
      console.error(err);
      historyLoading.classList.add("hidden");
      historyEmpty.textContent = "Error loading history.";
      historyEmpty.classList.remove("hidden");
    }
  }

  async function deleteHistoryRecord(id) {
    try {
      const response = await fetch(`/api/history/${id}`, { method: "DELETE" });
      if (response.ok) {
        loadReconstructionHistory();
      }
    } catch (err) {
      console.error("Delete history failed:", err);
    }
  }

  function loadHistoryRecordIntoWorkspace(rec) {
    rawInputTextarea.value = rec.original_input;
    rawInputTextarea.dispatchEvent(new Event("input"));
    
    // Clear any file uploads
    clearFileUploadState();
    
    // Render results instantly without spinner
    lastApiResponseData = rec;
    renderResults(rec);
  }

  // --- 3. Configuration Setup & Synced Displays ---
  fetchServerCredentials();
  
  confidenceThresholdSlider.addEventListener("input", (e) => {
    confidenceValSpan.textContent = `${e.target.value}%`;
  });

  rawInputTextarea.addEventListener("input", (e) => {
    const chars = e.target.value.length;
    charCountSpan.textContent = `${chars} character${chars !== 1 ? 's' : ''}`;
  });

  clearInputBtn.addEventListener("click", () => {
    rawInputTextarea.value = "";
    charCountSpan.textContent = "0 characters";
    clearFileUploadState();
    showEmptyState();
  });

  function clearFileUploadState() {
    uploadedAudioFile = null;
    audioFileInput.value = "";
    fileUploadStatus.classList.add("hidden");
  }

  // Accordions Trigger
  document.querySelectorAll(".accordion-trigger").forEach(trigger => {
    trigger.addEventListener("click", () => {
      const parent = trigger.parentElement;
      const isExpanded = parent.classList.contains("expanded");
      
      document.querySelectorAll(".accordion-item").forEach(item => {
        item.classList.remove("expanded");
        item.querySelector(".accordion-content").style.maxHeight = null;
      });

      if (!isExpanded) {
        parent.classList.add("expanded");
        const content = parent.querySelector(".accordion-content");
        content.style.maxHeight = content.scrollHeight + "px";
      }
    });
  });

  // --- 4. Presets Panel Loading ---
  const PRESET_MAPPING = {
    "speech-fillers": { text: "uh look we need to like reschedule the meeting for tomorrow because um you know something came up and we can't make it... sort of.", mode: "business", lang: "english" },
    "telugu-mixed": { text: "nenu repu office ki ravatledhu because I am not feeling well and please update the manager.", mode: "business", lang: "multilingual" },
    "hindi-mixed": { text: "kya aap mujhe file send kar sakte hain? I need to review it before client presentation.", mode: "business", lang: "multilingual" },
    "extreme-typos": { text: "the project manager sed we shud deploy the code but I think it hs bugs, plese double check and tell me wat to do.", mode: "business", lang: "english" },
    "incomplete-ocr": { text: "so the marketing plan... next week. did we... who is responsible?", mode: "business", lang: "english" }
  };

  presetBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const presetKey = btn.getAttribute("data-preset");
      const mapping = PRESET_MAPPING[presetKey];
      if (mapping) {
        clearFileUploadState();
        rawInputTextarea.value = mapping.text;
        rawInputTextarea.dispatchEvent(new Event("input"));
        reconstructionModeSelect.value = mapping.mode;
        languageProfileSelect.value = mapping.lang;
        rawInputTextarea.classList.add("highlight-pulse");
        setTimeout(() => rawInputTextarea.classList.remove("highlight-pulse"), 1000);
      }
    });
  });

  // --- 5. Settings Modal Controls & Connections ---
  openSettingsBtn.addEventListener("click", () => {
    testStatusMsg.classList.add("hidden");
    settingsModal.classList.remove("hidden");
  });

  closeSettingsBtn.addEventListener("click", () => {
    settingsModal.classList.add("hidden");
  });

  toggleKeyVisibility.addEventListener("click", () => {
    const isPassword = apiKeyInput.type === "password";
    apiKeyInput.type = isPassword ? "text" : "password";
    const iconName = isPassword ? "eye-off" : "eye";
    toggleKeyVisibility.innerHTML = `<i data-lucide="${iconName}"></i>`;
    try {
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    } catch (e) {
      console.warn("Lucide icons failed to render:", e);
    }
  });

  saveSettingsBtn.addEventListener("click", async () => {
    const key = apiKeyInput.value.trim();
    const model = modelSelection.value;
    
    // Save in LocalStorage to sync across client sessions
    localStorage.setItem("antigravity_gemini_key", key);
    localStorage.setItem("antigravity_gemini_model", model);

    // Apply configuration dynamically to Flask server runtime session
    try {
      await fetch("/api/analyze", {
        method: "OPTIONS", // Or a dedicated config route. We can also just send it headers
      });
      // In this setup, we store config client-side and pass it or Flask loads it from local .env.
      // We will also send it to the server dynamically or sync it:
      updateApiStatusUI(!!key);
      settingsModal.classList.add("hidden");
    } catch (e) {
      console.warn("Could not sync key with Flask server, relying on local config.");
      settingsModal.classList.add("hidden");
    }
  });

  clearApiKeyBtn.addEventListener("click", () => {
    localStorage.removeItem("antigravity_gemini_key");
    apiKeyInput.value = "";
    updateApiStatusUI(false);
    testStatusMsg.className = "test-status-message error";
    testStatusMsg.innerHTML = `<i data-lucide="info"></i> API Credentials cleared. Server will run in Sandbox fallback mode.`;
    testStatusMsg.classList.remove("hidden");
    lucide.createIcons();
  });

  testConnectionBtn.addEventListener("click", async () => {
    const testKey = apiKeyInput.value.trim();
    if (!testKey) {
      testStatusMsg.className = "test-status-message error";
      testStatusMsg.innerHTML = `<i data-lucide="alert-triangle"></i> Please enter an API key to test.`;
      testStatusMsg.classList.remove("hidden");
      lucide.createIcons();
      return;
    }

    testStatusMsg.className = "test-status-message";
    testStatusMsg.innerHTML = `Testing connection to Gemini...`;
    testStatusMsg.classList.remove("hidden");

    try {
      // Connect to Google Generative Language endpoints to test the key
      const model = modelSelection.value;
      const testEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${testKey}`;
      const response = await fetch(testEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: "Hello" }] }], generationConfig: { maxOutputTokens: 2 } })
      });
      
      if (!response.ok) throw new Error("Invalid API key secret");
      
      testStatusMsg.className = "test-status-message success";
      testStatusMsg.innerHTML = `<i data-lucide="check-circle"></i> Connection successful! Model ready.`;
      lucide.createIcons();
    } catch (err) {
      testStatusMsg.className = "test-status-message error";
      testStatusMsg.innerHTML = `<i data-lucide="alert-octagon"></i> Connection failed: ${err.message}`;
      lucide.createIcons();
    }
  });

  function fetchServerCredentials() {
    const key = localStorage.getItem("antigravity_gemini_key") || "";
    const model = localStorage.getItem("antigravity_gemini_model") || "gemini-2.5-flash";
    apiKeyInput.value = key;
    modelSelection.value = model;
    updateApiStatusUI(!!key);
  }

  function updateApiStatusUI(connected) {
    if (connected) {
      apiStatusBadge.className = "status-badge connected";
      apiStatusBadge.querySelector(".status-label").textContent = "API Connected";
    } else {
      apiStatusBadge.className = "status-badge sandbox";
      apiStatusBadge.querySelector(".status-label").textContent = "Sandbox Mode";
    }
  }

  // --- 6. Dynamic File Upload Actions ---
  audioFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      handleAudioFileSelected(file);
    }
  });

  // Drag and drop textarea integrations
  rawInputTextarea.addEventListener("dragover", (e) => {
    e.preventDefault();
    rawInputTextarea.classList.add("dragover");
  });

  rawInputTextarea.addEventListener("dragleave", () => {
    rawInputTextarea.classList.remove("dragover");
  });

  rawInputTextarea.addEventListener("drop", (e) => {
    e.preventDefault();
    rawInputTextarea.classList.remove("dragover");
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("audio/")) {
      handleAudioFileSelected(file);
    } else {
      alert("Please upload valid audio formats only.");
    }
  });

  function handleAudioFileSelected(file) {
    uploadedAudioFile = file;
    uploadFilenameSpan.textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
    fileUploadStatus.classList.remove("hidden");
    rawInputTextarea.value = `[Uploaded Audio File Selected: ${file.name}]`;
    rawInputTextarea.dispatchEvent(new Event("input"));
  }

  removeUploadedFileBtn.addEventListener("click", () => {
    clearFileUploadState();
    rawInputTextarea.value = "";
    rawInputTextarea.dispatchEvent(new Event("input"));
  });

  // --- 7. Tab toggling & diff generation ---
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      const tabName = btn.getAttribute("data-tab");
      currentActiveTab = tabName;
      
      document.getElementById("output-version-natural").classList.add("hidden");
      document.getElementById("output-version-professional").classList.add("hidden");
      document.getElementById("output-version-formal").classList.add("hidden");
      
      if (tabName === "natural") {
        document.getElementById("output-version-natural").classList.remove("hidden");
        updateDiffView(lastApiResponseData.natural_version);
      } else if (tabName === "professional") {
        document.getElementById("output-version-professional").classList.remove("hidden");
        updateDiffView(lastApiResponseData.professional_version);
      } else if (tabName === "formal") {
        document.getElementById("output-version-formal").classList.remove("hidden");
        updateDiffView(lastApiResponseData.formal_version);
      }
    });
  });

  // Copy to Clipboard
  copyBtn.addEventListener("click", () => {
    let text = "";
    if (currentActiveTab === "natural") text = naturalText.textContent;
    else if (currentActiveTab === "professional") text = professionalText.textContent;
    else if (currentActiveTab === "formal") text = formalText.textContent;

    navigator.clipboard.writeText(text).then(() => {
      const icon = copyBtn.querySelector("i");
      icon.setAttribute("data-lucide", "check");
      lucide.createIcons();
      setTimeout(() => {
        icon.setAttribute("data-lucide", "copy");
        lucide.createIcons();
      }, 2000);
    });
  });

  // Download Text Reconstructions
  downloadResultsBtn.addEventListener("click", () => {
    if (!lastApiResponseData) return;
    
    const summary = `
==================================================
ANTIGRAVITY AI RECONSTRUCTION REPORT
==================================================
Original Input: 
${lastApiResponseData.original_input}

--------------------------------------------------
Natural Reconstruction:
${lastApiResponseData.natural_version}

Professional Reconstruction:
${lastApiResponseData.professional_version}

Academic/Formal Reconstruction:
${lastApiResponseData.formal_version}

--------------------------------------------------
CLASSIFICATIONS
Confidence Score: ${lastApiResponseData.confidence_score}%
Detected Language: ${lastApiResponseData.language}
Communication Goal: ${lastApiResponseData.communication_goal}
Primary Emotion: ${lastApiResponseData.emotion}
Estimated Intent: ${lastApiResponseData.intent}

--------------------------------------------------
LEARNING HUB INSIGHT
${lastApiResponseData.learning_tip}
==================================================
`;
    
    const blob = new Blob([summary.trim()], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `reconstruction_${lastApiResponseData.record_id || Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  });

  // Submit clarification replies
  submitClarificationBtn.addEventListener("click", () => {
    const val = clarificationInput.value.trim();
    if (val) {
      rawInputTextarea.value = `${rawInputTextarea.value}\n[Clarification: ${val}]`;
      clarificationInput.value = "";
      clarificationCard.classList.add("hidden");
      triggerReconstructionPipeline();
    }
  });

  // --- 8. Reconstruction Pipeline Requests ---
  processBtn.addEventListener("click", () => {
    triggerReconstructionPipeline();
  });

  async function triggerReconstructionPipeline() {
    const text = rawInputTextarea.value.trim();
    if (!text && !uploadedAudioFile) return;

    showLoadingState();

    // Clear steps
    const steps = document.querySelectorAll(".timeline-step");
    steps.forEach(step => {
      step.classList.remove("active", "completed");
      step.querySelector(".step-status").textContent = "Pending...";
    });

    const runStep = (stepNumber, statusText, duration = 250) => {
      return new Promise(resolve => {
        const step = document.querySelector(`.timeline-step[data-step="${stepNumber}"]`);
        step.classList.add("active");
        step.querySelector(".step-status").textContent = statusText;
        setTimeout(() => {
          step.classList.remove("active");
          step.classList.add("completed");
          step.querySelector(".step-status").textContent = "Completed";
          resolve();
        }, duration);
      });
    };

    try {
      // Step 1: Identify Context
      await runStep(1, "Detecting language boundaries, communication domain and goals...", 300);
      
      // Step 2: Analyze Anomalies
      await runStep(2, "Analyzing typing noise, spelling errors, vocabulary issues...", 300);
      
      // Step 3: Recover Intent
      await runStep(3, "Inferring underlying communication context and missing words...", 300);

      // Start REST API call
      const mode = reconstructionModeSelect.value;
      const langProfile = languageProfileSelect.value;
      const apiKey = localStorage.getItem("antigravity_gemini_key") || "";
      const model = localStorage.getItem("antigravity_gemini_model") || "gemini-2.5-flash";
      
      let fetchPromise;
      
      const headers = { "X-Gemini-Key": apiKey, "X-Gemini-Model": model };
      
      if (uploadedAudioFile) {
        // Multi-part upload
        const formData = new FormData();
        formData.append("audio", uploadedAudioFile);
        formData.append("mode", mode);
        formData.append("language_profile", langProfile);
        
        fetchPromise = fetch("/api/speech", {
          method: "POST",
          headers: headers,
          body: formData
        }).then(async r => {
          if (!r.ok) {
            const err = await r.json().catch(() => ({}));
            throw new Error(err.error || `HTTP ${r.status}`);
          }
          return r.json();
        });
      } else {
        // JSON payload request
        fetchPromise = fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify({
            text: text,
            mode: mode,
            language_profile: langProfile,
            input_mode: isRecordingAudio ? "Voice Recording" : (isRecordingLiveSpeech ? "Live Speech" : "Typed Text")
          })
        }).then(async r => {
          if (!r.ok) {
            const err = await r.json().catch(() => ({}));
            throw new Error(err.error || `HTTP ${r.status}`);
          }
          return r.json();
        });
      }

      // Step 4: Semantic Reconstruction
      await runStep(4, "Rebuilding sentences using grammatically sound structures...", 300);

      // Step 5: Rank Alternatives
      await runStep(5, "Running target style variations and mapping outputs...", 250);

      // Step 6: Confidence Validation
      await runStep(6, "Evaluating clarification parameters against thresholds...", 250);

      // Step 7: Synthesize Explanations
      await runStep(7, "Formulating grammatical analysis and explanations...", 250);

      // Step 8: Formulate Learning Tip
      await runStep(8, "Generating user tutoring tips for professional communication...", 200);

      const result = await fetchPromise;
      
      // Update inputs textarea with predicted original sentence if it was voice audio
      if (uploadedAudioFile && result.original_input) {
        rawInputTextarea.value = result.original_input;
        rawInputTextarea.dispatchEvent(new Event("input"));
      }

      lastApiResponseData = result;
      renderResults(result);
      
      // Refresh saved history sidebar
      loadReconstructionHistory();

    } catch (err) {
      console.error(err);
      showEmptyState();
      alert(`Error during processing request: ${err.message}`);
    }
  }

  function renderResults(data) {
    showResultsState();

    // 1. Metadata Panel
    resConfidence.textContent = `${data.confidence_score}%`;
    if (data.confidence_score >= 80) {
      resConfidence.className = "meta-val highlight-green";
    } else {
      resConfidence.className = "meta-val danger-text";
    }
    
    resLanguage.textContent = data.language || "Unknown";
    resInputMode.textContent = data.input_mode || "Typed Text";
    resEmotion.textContent = data.emotion || "Neutral";
    resGoal.textContent = data.communication_goal || "General";

    // 2. Clarification Trigger
    const threshold = parseInt(confidenceThresholdSlider.value);
    if (data.confidence_score < threshold && data.clarification_question) {
      clarificationText.textContent = data.clarification_question;
      clarificationCard.classList.remove("hidden");
    } else {
      clarificationCard.classList.add("hidden");
    }

    // 3. Output Versions
    naturalText.textContent = data.natural_version || data.predicted_original_sentence;
    professionalText.textContent = data.professional_version || data.predicted_original_sentence;
    formalText.textContent = data.formal_version || data.predicted_original_sentence;

    // Reset Tabs
    tabBtns.forEach(b => b.classList.remove("active"));
    tabBtns[0].classList.add("active");
    currentActiveTab = "natural";
    document.getElementById("output-version-natural").classList.remove("hidden");
    document.getElementById("output-version-professional").classList.add("hidden");
    document.getElementById("output-version-formal").classList.add("hidden");

    // 4. Render Diff
    updateDiffView(data.natural_version || data.predicted_original_sentence);

    // 5. Issues List Accordion
    issuesList.innerHTML = "";
    if (data.detected_issues && data.detected_issues.length > 0) {
      issuesCount.textContent = data.detected_issues.length;
      data.detected_issues.forEach(issue => {
        const li = document.createElement("li");
        li.innerHTML = `
          <div class="issue-icon-wrapper">
            <i data-lucide="${getIssueIcon(issue.type)}"></i>
          </div>
          <div class="issue-body">
            <span class="issue-title">${escapeHTML(issue.issue)}</span>
            <span class="issue-desc">${escapeHTML(issue.type.toUpperCase().replace("_", " "))} detected.</span>
            ${issue.context ? `<span class="issue-context">Context: "${escapeHTML(issue.context)}"</span>` : ""}
          </div>
        `;
        issuesList.appendChild(li);
      });
    } else {
      issuesCount.textContent = "0";
      issuesList.innerHTML = `<li class="input-hint">No major structural issues detected in text.</li>`;
    }

    // 6. Grammar Explanations Accordion
    grammarList.innerHTML = "";
    if (data.grammar_explanations && data.grammar_explanations.length > 0) {
      data.grammar_explanations.forEach(item => {
        const div = document.createElement("div");
        div.className = "grammar-item";
        div.innerHTML = `
          <div class="grammar-header">
            <del>${escapeHTML(item.original)}</del>
            <span class="grammar-arrow">&rarr;</span>
            <ins>${escapeHTML(item.corrected)}</ins>
            <span class="grammar-rule-badge">${escapeHTML(item.rule)}</span>
          </div>
          <div class="grammar-explanation">${escapeHTML(item.explanation)}</div>
        `;
        grammarList.appendChild(div);
      });
    } else {
      grammarList.innerHTML = `<p class="input-hint">No explicit grammatical explanations needed.</p>`;
    }

    // 7. Alternatives Accordion
    alternativesList.innerHTML = "";
    if (data.alternative_predictions && data.alternative_predictions.length > 0) {
      data.alternative_predictions.forEach(alt => {
        const div = document.createElement("div");
        div.className = "alternative-item";
        div.innerHTML = `
          <span>"${escapeHTML(alt.sentence)}"</span>
          <span class="alternative-confidence-badge ${alt.confidence >= 80 ? 'high' : ''}">${alt.confidence}% confidence</span>
        `;
        alternativesList.appendChild(div);
      });
    } else {
      alternativesList.innerHTML = `<p class="input-hint">No secondary alternative interpretations identified.</p>`;
    }

    // 8. Learning tip
    learningTipText.textContent = data.learning_tip || "Excellent structural formatting matches standard corporate goals.";

    lucide.createIcons();
    
    // Automatically trigger accordion open
    const issuesAccordion = document.getElementById("detected-issues-accordion");
    if (issuesAccordion && !issuesAccordion.classList.contains("expanded")) {
      issuesAccordion.querySelector(".accordion-trigger").click();
    }
  }

  function getIssueIcon(type) {
    switch (type?.toLowerCase()) {
      case "filler": return "mic-off";
      case "mixed_language": return "languages";
      case "spelling":
      case "typo":
      case "spelling_typo": return "spell-check";
      case "grammar": return "alert-circle";
      case "fragment": return "scissors";
      default: return "alert-triangle";
    }
  }

  // --- 9. Word-level LCS Diff calculation ---
  function updateDiffView(correctedText) {
    const rawInput = rawInputTextarea.value.trim();
    if (!rawInput) {
      diffView.innerHTML = `<p class="input-hint">No text available for diff calculation.</p>`;
      return;
    }
    const cleanInput = rawInput.replace(/\[Clarification:.*?\]/g, "").replace(/\[Uploaded Audio File Selected:.*?\]/g, "").trim();
    if (!cleanInput) {
      diffView.innerHTML = `<p class="reconstruction-text">${correctedText}</p>`;
      return;
    }
    
    const diff = diffWords(cleanInput, correctedText);
    diffView.innerHTML = "";
    
    diff.forEach(chunk => {
      if (chunk.type === "added") {
        const ins = document.createElement("ins");
        ins.textContent = chunk.value + " ";
        diffView.appendChild(ins);
      } else if (chunk.type === "removed") {
        const del = document.createElement("del");
        del.textContent = chunk.value + " ";
        diffView.appendChild(del);
      } else {
        diffView.appendChild(document.createTextNode(chunk.value + " "));
      }
    });
  }

  function diffWords(original, reconstructed) {
    const words1 = original.split(/\s+/).filter(w => w !== "");
    const words2 = reconstructed.split(/\s+/).filter(w => w !== "");
    
    const n = words1.length;
    const m = words2.length;
    
    const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
    const cleanWord = (w) => w.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");

    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        if (cleanWord(words1[i - 1]) === cleanWord(words2[j - 1])) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }
    
    let i = n, j = m;
    const diff = [];
    
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && cleanWord(words1[i - 1]) === cleanWord(words2[j - 1])) {
        diff.unshift({ type: "common", value: words2[j - 1] });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        diff.unshift({ type: "added", value: words2[j - 1] });
        j--;
      } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
        diff.unshift({ type: "removed", value: words1[i - 1] });
        i--;
      }
    }
    return diff;
  }

  // UI Helpers
  function showEmptyState() {
    outputStateEmpty.classList.remove("hidden");
    outputStateLoading.classList.add("hidden");
    outputStateResults.classList.add("hidden");
  }

  function showLoadingState() {
    outputStateEmpty.classList.add("hidden");
    outputStateLoading.classList.remove("hidden");
    outputStateResults.classList.add("hidden");
  }

  function showResultsState() {
    outputStateEmpty.classList.add("hidden");
    outputStateLoading.classList.add("hidden");
    outputStateResults.classList.remove("hidden");
  }

  function escapeHTML(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // --- 10. Live Speech transcription (Web Speech API) ---
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    liveSpeechRecognition = new SpeechRecognition();
    liveSpeechRecognition.continuous = true;
    liveSpeechRecognition.interimResults = true;
    liveSpeechRecognition.lang = "en-US";

    liveSpeechRecognition.onstart = () => {
      isRecordingLiveSpeech = true;
      clearFileUploadState();
      recordingStatus.textContent = "Listening Live Speech...";
      recordingDuration = 0;
      recordingTime.textContent = "00:00";
      
      recordingTimerInterval = setInterval(() => {
        recordingDuration++;
        const mins = Math.floor(recordingDuration / 60).toString().padStart(2, "0");
        const secs = (recordingDuration % 60).toString().padStart(2, "0");
        recordingTime.textContent = `${mins}:${secs}`;
      }, 1000);
      
      startMockWaveformAnimation();
      recordingOverlay.classList.remove("hidden");
    };

    liveSpeechRecognition.onresult = (event) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        rawInputTextarea.value = (rawInputTextarea.value + " " + finalTranscript).trim();
        rawInputTextarea.dispatchEvent(new Event("input"));
      }
    };

    liveSpeechRecognition.onerror = () => {
      stopLiveSpeechRecording();
    };

    liveSpeechRecognition.onend = () => {
      stopLiveSpeechRecording();
    };
  }

  liveSpeechBtn.addEventListener("click", () => {
    if (!SpeechRecognition) {
      alert("Live speech recognition (Speech-to-Text) is not supported in this browser. Please use Chrome or Edge.");
      return;
    }
    if (isRecordingLiveSpeech) {
      stopLiveSpeechRecording(true);
    } else {
      if (isRecordingAudio) stopAudioRecording();
      liveSpeechRecognition.start();
    }
  });

  function stopLiveSpeechRecording(triggerAnalysis = false) {
    if (!isRecordingLiveSpeech) return;
    isRecordingLiveSpeech = false;
    clearInterval(recordingTimerInterval);
    stopWaveformAnimation();
    recordingOverlay.classList.add("hidden");
    
    if (liveSpeechRecognition) {
      liveSpeechRecognition.stop();
    }
    
    if (triggerAnalysis && rawInputTextarea.value.trim()) {
      triggerReconstructionPipeline();
    }
  }

  // --- 11. Microphone Audio Recording (MediaRecorder + Web Audio Visualizer) ---
  recordSpeechBtn.addEventListener("click", async () => {
    if (isRecordingAudio) {
      stopAudioRecording(true);
    } else {
      if (isRecordingLiveSpeech) stopLiveSpeechRecording();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        startAudioRecording(stream);
      } catch (err) {
        console.error("Microphone Access Denied:", err);
        alert("Microphone permission denied or device not found.");
      }
    }
  });

  function startAudioRecording(stream) {
    isRecordingAudio = true;
    clearFileUploadState();
    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
      stream.getTracks().forEach(track => track.stop());

      if (isRecordingAudio === false && audioChunks.length > 0) {
        // Set recorded audio as the current uploadedAudioFile to pass to /api/speech
        const file = new File([audioBlob], "recorded_voice.webm", { type: "audio/webm" });
        handleAudioFileSelected(file);
        
        // Auto-run pipeline
        triggerReconstructionPipeline();
      }
    };

    mediaRecorder.start();
    
    recordingStatus.textContent = "Recording Voice Audio...";
    recordingDuration = 0;
    recordingTime.textContent = "00:00";
    
    recordingTimerInterval = setInterval(() => {
      recordingDuration++;
      const mins = Math.floor(recordingDuration / 60).toString().padStart(2, "0");
      const secs = (recordingDuration % 60).toString().padStart(2, "0");
      recordingTime.textContent = `${mins}:${secs}`;
    }, 1000);

    setupRealtimeAudioVisualizer(stream);
    recordingOverlay.classList.remove("hidden");
  }

  function stopAudioRecording(triggerAnalysis = false) {
    if (!isRecordingAudio) return;
    clearInterval(recordingTimerInterval);
    stopWaveformAnimation();
    recordingOverlay.classList.add("hidden");
    
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    
    if (!triggerAnalysis) {
      isRecordingAudio = false;
    } else {
      isRecordingAudio = false;
    }
  }

  cancelRecordingBtn.addEventListener("click", () => {
    if (isRecordingAudio) {
      isRecordingAudio = false;
      stopAudioRecording(false);
    }
    if (isRecordingLiveSpeech) {
      stopLiveSpeechRecording(false);
    }
  });

  stopRecordingBtn.addEventListener("click", () => {
    if (isRecordingAudio) stopAudioRecording(true);
    if (isRecordingLiveSpeech) stopLiveSpeechRecording(true);
  });

  // --- Real-time SVG Audio Wave Canvas Animator ---
  function setupRealtimeAudioVisualizer(stream) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      sourceNode = audioCtx.createMediaStreamSource(stream);
      sourceNode.connect(analyser);
      
      analyser.fftSize = 64;
      const bufferLength = analyser.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);

      function renderAudioWave() {
        if (!isRecordingAudio) return;
        animationFrameId = requestAnimationFrame(renderAudioWave);
        analyser.getByteFrequencyData(dataArray);

        let points1 = [];
        let points2 = [];
        const width = 200;
        const middleY = 30;
        const sliceWidth = width / bufferLength;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const amplitude = (v - 1.0) * 15;
          const x = i * sliceWidth;
          const y1 = middleY + amplitude * Math.sin(i * 0.5 + Date.now() * 0.015);
          const y2 = middleY - amplitude * Math.cos(i * 0.3 + Date.now() * 0.01);
          points1.push(`${x.toFixed(1)},${y1.toFixed(1)}`);
          points2.push(`${x.toFixed(1)},${y2.toFixed(1)}`);
        }

        audioWavePath1.setAttribute("d", `M 0,30 Q ${points1.join(" T ")} L 200,30`);
        audioWavePath2.setAttribute("d", `M 0,30 Q ${points2.join(" T ")} L 200,30`);
      }

      renderAudioWave();
    } catch (e) {
      startMockWaveformAnimation();
    }
  }

  function startMockWaveformAnimation() {
    let frame = 0;
    function animateMockWave() {
      if (!isRecordingAudio && !isRecordingLiveSpeech) return;
      animationFrameId = requestAnimationFrame(animateMockWave);
      
      frame++;
      let points1 = [];
      let points2 = [];
      const width = 200;
      const middleY = 30;
      const step = 8;
      
      for (let i = 0; i <= step; i++) {
        const x = (i * (width / step));
        const amp = 8 + 4 * Math.sin(frame * 0.1 + i);
        const y1 = middleY + amp * Math.sin(frame * 0.15 + i * 0.8);
        const y2 = middleY - amp * Math.cos(frame * 0.12 + i * 0.6);
        points1.push(`${x.toFixed(1)},${y1.toFixed(1)}`);
        points2.push(`${x.toFixed(1)},${y2.toFixed(1)}`);
      }
      audioWavePath1.setAttribute("d", `M 0,30 C ${points1.join(" ")} L 200,30`);
      audioWavePath2.setAttribute("d", `M 0,30 C ${points2.join(" ")} L 200,30`);
    }
    animateMockWave();
  }

  function stopWaveformAnimation() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    if (audioCtx) {
      audioCtx.close();
      audioCtx = null;
    }
    audioWavePath1.setAttribute("d", "M 10 30 Q 30 15 50 30 T 90 30 T 130 30 T 170 30 T 190 30");
    audioWavePath2.setAttribute("d", "M 10 30 Q 30 20 50 30 T 90 30 T 130 30 T 170 30 T 190 30");
  }
});
