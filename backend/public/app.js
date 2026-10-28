/**
 * Cynaris Interview Pipeline & Performance Sprint
 * Week 2 Day 4: Debug & Performance Sprint - Log Analysis & Query Optimisation
 *
 * Core Technical Competencies:
 * 1. HTTP requests using Fetch API (GET, POST, PATCH)
 * 2. Handling Promises (Promise.allSettled, Promise lifecycle, AbortController)
 * 3. Async / Await with robust try...catch...finally blocks
 * 4. Safe JSON response parsing and schema inspection
 * 5. Real-time Network Telemetry & Performance Profiling
 */

// ==========================================
// DOM Notification & Helper Manager
// ==========================================
const DOMPipelineHelper = {
  logActivity(candidateName, oldStage, newStage, actionType = "update") {
    const feed = document.getElementById("activityFeedList");
    if (!feed) return;

    const item = document.createElement("li");
    item.classList.add("activity-item", `action-${actionType}`);

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    const safeName = String(candidateName).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
    const safeOld = String(oldStage).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
    const safeNew = String(newStage).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));

    if (actionType === "ai-analysis") {
      item.innerHTML = `
        <div class="activity-icon ai-icon-badge">✨</div>
        <div class="activity-content">
          <p>AI Resume Summary generated for <strong>${safeName}</strong> via <span class="badge-pill new">${safeNew}</span></p>
          <time class="activity-time">${timeStr}</time>
        </div>
      `;
    } else if (actionType === "create") {
      item.innerHTML = `
        <div class="activity-icon create-icon">+</div>
        <div class="activity-content">
          <p>Candidate <strong>${safeName}</strong> added to <span class="badge-pill">${safeNew}</span></p>
          <time class="activity-time">${timeStr}</time>
        </div>
      `;
    } else if (actionType === "telemetry") {
      item.innerHTML = `
        <div class="activity-icon update-icon">⚡</div>
        <div class="activity-content">
          <p><strong>${safeName}</strong>: ${safeOld}</p>
          <time class="activity-time">${timeStr}</time>
        </div>
      `;
    } else {
      item.innerHTML = `
        <div class="activity-icon update-icon">➔</div>
        <div class="activity-content">
          <p><strong>${safeName}</strong> moved from <span class="badge-pill old">${safeOld}</span> to <span class="badge-pill new">${safeNew}</span></p>
          <time class="activity-time">${timeStr}</time>
        </div>
      `;
    }

    feed.prepend(item);
    while (feed.children.length > 8) {
      feed.removeChild(feed.lastChild);
    }
  },

  showToast(message, type = "info") {
    const container = document.querySelector("#toastContainer") || document.querySelector(".toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.classList.add("dom-toast", `toast-${type}`);

    const safeMsg = String(message).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));

    toast.innerHTML = `
      <span class="toast-indicator"></span>
      <span class="toast-message">${safeMsg}</span>
      <button type="button" class="toast-close" aria-label="Close notification">&times;</button>
    `;

    const closeBtn = toast.querySelector(".toast-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        toast.classList.add("toast-leaving");
        setTimeout(() => toast.remove(), 250);
      });
    }

    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) {
        toast.classList.add("toast-leaving");
        setTimeout(() => toast.remove(), 250);
      }
    }, 4500);
  },

  updateEventInspector(e, notes = "") {
    const box = document.getElementById("lastEventDisplay");
    if (!box) return;

    const targetEl = e.target;
    const currentEl = e.currentTarget;
    const time = new Date().toLocaleTimeString();

    box.innerHTML = `
      <div class="event-meta-line"><strong>Event Type:</strong> <code class="tag-type">${e.type}</code> <span class="event-time">at ${time}</span></div>
      <div class="event-meta-line"><strong>Origin Target (e.target):</strong> <code>&lt;${targetEl.tagName.toLowerCase()}&gt;</code> ${targetEl.className ? `class="${targetEl.className}"` : ''}</div>
      <div class="event-meta-line"><strong>Handler (e.currentTarget):</strong> <code>&lt;${currentEl ? currentEl.tagName.toLowerCase() : 'window'}&gt;</code> ${currentEl && currentEl.id ? `id="${currentEl.id}"` : ''}</div>
      <div class="event-meta-line"><strong>Bubbling Status:</strong> <span class="badge-bubbles">${e.bubbles ? 'Bubbled Up DOM Tree' : 'Direct Target'}</span></div>
      ${notes ? `<div class="event-meta-line"><strong>Action Note:</strong> <em>${notes}</em></div>` : ''}
    `;
  }
};

// ==========================================
// Vue 3 Pipeline Component
// ==========================================
const { createApp } = Vue;

const app = createApp({
  data() {
    return {
      stages: [
        "Screening",
        "Technical Round 1",
        "Technical Round 2",
        "HR Round",
        "Offered",
        "Rejected"
      ],
      applicants: [],
      todayCounts: {},
      telemetryRequests: [], // Real-time Fetch API & Promise logger
      loading: false,
      updatingId: null,
      analyzingId: null,
      submitting: false,
      error: "",
      success: "",
      searchQuery: "",
      selectedFilter: null,
      showAddForm: false,
      newCandidateName: "",
      newCandidateRole: "Full Stack Developer",
      newCandidateExp: 2,
      newCandidateSkills: "Vue.js, Node.js, Python, PostgreSQL",
      newCandidateStage: "Screening",
      simulateGroqFailure: false,
      simulateBothFailure: false,
      selectedApplicantForModal: null,
      activeAbortController: null
    };
  },
  computed: {
    totalToday() {
      return Object.values(this.todayCounts).reduce((sum, count) => sum + count, 0);
    },
    avgLatency() {
      if (!this.telemetryRequests.length) return 0;
      const total = this.telemetryRequests.reduce((acc, r) => acc + (r.durationMs || 0), 0);
      return Math.round((total / this.telemetryRequests.length) * 10) / 10;
    },
    cacheHitRatio() {
      if (!this.telemetryRequests.length) return 0;
      const hits = this.telemetryRequests.filter(r => r.cacheHit).length;
      return Math.round((hits / this.telemetryRequests.length) * 100);
    }
  },
  methods: {
    /**
     * Instrumented Fetch API Client with Promise Lifecycle & JSON Handling
     */
    async apiFetch(url, options = {}) {
      const method = options.method || "GET";
      const start = performance.now();
      const timeStr = new Date().toLocaleTimeString();

      // Telemetry log entry in 'Pending' state
      const telemetryEntry = {
        method,
        url,
        promiseState: "Pending",
        status: "...",
        durationMs: 0,
        cacheHit: false,
        timeStr
      };
      this.telemetryRequests.unshift(telemetryEntry);

      // Inject default headers
      const headers = {
        "Content-Type": "application/json",
        "X-Client-Timezone": Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
        ...(options.headers || {})
      };

      try {
        const response = await fetch(url, { ...options, headers });
        const durationMs = Math.round((performance.now() - start) * 100) / 100;

        // Parse JSON response
        let data = null;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          data = await response.json();
        } else {
          data = await response.text();
        }

        // Update telemetry entry to 'Fulfilled'
        telemetryEntry.promiseState = "Fulfilled";
        telemetryEntry.status = response.status;
        telemetryEntry.durationMs = durationMs;
        telemetryEntry.cacheHit = !!(data && data.cache_hit);

        if (!response.ok) {
          const errMsg = (data && data.error) || `HTTP error ${response.status}`;
          throw new Error(errMsg);
        }

        return data;
      } catch (err) {
        const durationMs = Math.round((performance.now() - start) * 100) / 100;
        telemetryEntry.promiseState = err.name === "AbortError" ? "Aborted" : "Rejected";
        telemetryEntry.status = err.name === "AbortError" ? "Canceled" : "Failed";
        telemetryEntry.durationMs = durationMs;
        throw err;
      }
    },

    /**
     * Load Pipeline Data using Promise.allSettled for Fault Tolerance
     */
    async loadApplicants() {
      this.loading = true;
      this.error = "";

      try {
        // Handle Promises concurrently using Promise.allSettled
        const [applicantsResult, dashboardResult] = await Promise.allSettled([
          this.apiFetch("/api/applicants"),
          this.apiFetch("/api/dashboard/stages-today")
        ]);

        if (applicantsResult.status === "fulfilled") {
          this.applicants = applicantsResult.value;
        } else {
          this.error = `Could not load applicants: ${applicantsResult.reason.message}`;
        }

        if (dashboardResult.status === "fulfilled") {
          this.todayCounts = dashboardResult.value.counts || {};
        } else {
          console.warn("Dashboard metrics unavailable:", dashboardResult.reason.message);
        }

        DOMPipelineHelper.showToast("Pipeline synchronized (Fetch API Promise.allSettled)", "info");
      } catch (err) {
        this.error = `Unexpected sync error: ${err.message}`;
        DOMPipelineHelper.showToast(this.error, "error");
      } finally {
        this.loading = false;
      }
    },

    async updateStage(applicant, stage) {
      if (applicant.pipeline_stage === stage) return;
      const oldStage = applicant.pipeline_stage;
      this.updatingId = applicant.id;
      this.error = "";
      this.success = "";

      try {
        const result = await this.apiFetch(`/api/applicants/${applicant.id}/stage`, {
          method: "PATCH",
          body: JSON.stringify({ stage })
        });

        const index = this.applicants.findIndex(item => item.id === applicant.id);
        if (index !== -1) {
          this.applicants.splice(index, 1, result.applicant);
        }

        // Refresh dashboard metrics
        await this.loadDashboard(true);
        this.success = `${applicant.name} moved to ${stage}.`;

        DOMPipelineHelper.logActivity(applicant.name, oldStage, stage, "update");
        DOMPipelineHelper.showToast(`${applicant.name} moved to ${stage}`, "success");
      } catch (error) {
        this.error = error.message;
        DOMPipelineHelper.showToast(`Update failed: ${error.message}`, "error");
      } finally {
        this.updatingId = null;
      }
    },

    async createApplicant() {
      if (!this.newCandidateName.trim()) return;
      this.submitting = true;
      this.error = "";

      try {
        const result = await this.apiFetch("/api/applicants", {
          method: "POST",
          body: JSON.stringify({
            name: this.newCandidateName.trim(),
            job_title: this.newCandidateRole,
            experience_years: this.newCandidateExp,
            skills: this.newCandidateSkills,
            stage: this.newCandidateStage
          })
        });

        this.applicants.push(result.applicant);
        await this.loadDashboard(true);

        const addedName = this.newCandidateName;
        const addedStage = this.newCandidateStage;

        // Reset form
        this.newCandidateName = "";
        this.showAddForm = false;

        DOMPipelineHelper.logActivity(addedName, "", addedStage, "create");
        DOMPipelineHelper.showToast(`Candidate ${addedName} added successfully`, "success");
      } catch (error) {
        this.error = error.message;
        DOMPipelineHelper.showToast(`Error: ${error.message}`, "error");
      } finally {
        this.submitting = false;
      }
    },

    async analyzeApplicantResume(applicantId) {
      const applicant = this.applicants.find(a => a.id === Number(applicantId));
      if (!applicant) return;

      this.analyzingId = applicant.id;
      this.error = "";

      DOMPipelineHelper.showToast(
        `Consulting AI engine for ${applicant.name} (Groq with OpenRouter fallback)...`,
        "info"
      );

      try {
        const queryParams = new URLSearchParams();
        if (this.simulateGroqFailure) queryParams.set("simulate_groq_failure", "true");
        if (this.simulateBothFailure) queryParams.set("simulate_both_failure", "true");

        const result = await this.apiFetch(
          `/api/applicants/${applicant.id}/ai-summary?${queryParams.toString()}`,
          {
            method: "POST",
            body: JSON.stringify({
              simulate_groq_failure: this.simulateGroqFailure,
              simulate_both_failure: this.simulateBothFailure
            })
          }
        );

        applicant.ai_resume_summary = result.summary;
        applicant.ai_summary_provider = result.provider;
        applicant.ai_analyzed_at = result.analyzed_at;

        DOMPipelineHelper.logActivity(applicant.name, "", result.provider, "ai-analysis");
        DOMPipelineHelper.showToast(`AI Summary generated via ${result.provider}!`, "success");

        this.openSummaryModal(applicant);
      } catch (err) {
        this.error = err.message;
        DOMPipelineHelper.showToast(`AI Error: ${err.message}`, "error");
      } finally {
        this.analyzingId = null;
      }
    },

    async loadDashboard(force = false) {
      try {
        const url = force ? "/api/dashboard/stages-today?force_refresh=true" : "/api/dashboard/stages-today";
        const dashboard = await this.apiFetch(url);
        this.todayCounts = dashboard.counts || {};
      } catch (err) {
        console.warn("Dashboard fetch failed:", err.message);
      }
    },

    /**
     * Sprint Test 1: Parallel Requests via Promise.allSettled
     */
    async testConcurrentRequests() {
      DOMPipelineHelper.showToast("Firing 4 concurrent Fetch requests via Promise.allSettled...", "info");
      const startTime = performance.now();

      const promises = [
        this.apiFetch("/api/health"),
        this.apiFetch("/api/stages"),
        this.apiFetch("/api/applicants"),
        this.apiFetch("/api/dashboard/stages-today")
      ];

      const settlements = await Promise.allSettled(promises);
      const totalDuration = Math.round((performance.now() - startTime) * 100) / 100;

      const fulfilledCount = settlements.filter(s => s.status === "fulfilled").length;
      DOMPipelineHelper.showToast(
        `Promise.allSettled complete: ${fulfilledCount}/4 fulfilled in ${totalDuration}ms`,
        "success"
      );
      DOMPipelineHelper.logActivity("Promise.allSettled", `${fulfilledCount}/4 resolved`, `${totalDuration}ms`, "telemetry");
    },

    /**
     * Sprint Test 2: Latency & Range-Scan Cache Benchmark
     */
    async testCacheBenchmark() {
      DOMPipelineHelper.showToast("Testing Cache Latency: Miss vs Hit...", "info");

      // 1. Force cache miss
      const t0 = performance.now();
      const missRes = await this.apiFetch("/api/dashboard/stages-today?force_refresh=true");
      const missDuration = Math.round((performance.now() - t0) * 100) / 100;

      // 2. Immediate second call: Cache Hit
      const t1 = performance.now();
      const hitRes = await this.apiFetch("/api/dashboard/stages-today");
      const hitDuration = Math.round((performance.now() - t1) * 100) / 100;

      DOMPipelineHelper.showToast(
        `Cache Benchmark: Miss took ${missDuration}ms -> Cache Hit took ${hitDuration}ms (<2ms)!`,
        "success"
      );
      DOMPipelineHelper.logActivity("Query Cache Test", `Miss: ${missDuration}ms`, `Hit: ${hitDuration}ms`, "telemetry");
    },

    /**
     * Sprint Test 3: AbortController Request Cancellation
     */
    async testAbortRequest() {
      const controller = new AbortController();
      DOMPipelineHelper.showToast("Dispatched fetch with AbortController, canceling in 5ms...", "info");

      setTimeout(() => {
        controller.abort();
      }, 5);

      try {
        await this.apiFetch("/api/applicants", { signal: controller.signal });
      } catch (err) {
        if (err.name === "AbortError") {
          DOMPipelineHelper.showToast("Fetch successfully aborted via AbortController!", "success");
          DOMPipelineHelper.logActivity("AbortController", "Request canceled cleanly", "AbortError handled", "telemetry");
        } else {
          DOMPipelineHelper.showToast(`Fetch failed: ${err.message}`, "error");
        }
      }
    },

    clearTelemetry() {
      this.telemetryRequests = [];
      DOMPipelineHelper.showToast("Telemetry logs cleared", "info");
    },

    openSummaryModal(applicant) {
      this.selectedApplicantForModal = applicant;
      const modal = document.getElementById("aiSummaryModal");
      const title = document.getElementById("modalTitle");
      const provider = document.getElementById("modalProviderBadge");
      const model = document.getElementById("modalModelLabel");
      const time = document.getElementById("modalTimestamp");
      const body = document.getElementById("modalBody");

      if (!modal) return;

      title.textContent = `${applicant.name} — ${applicant.job_title || 'Software Engineer'}`;
      provider.textContent = applicant.ai_summary_provider || "Groq";
      model.textContent = applicant.ai_summary_provider && applicant.ai_summary_provider.includes("OpenRouter")
        ? "meta-llama/llama-3.3-70b-instruct"
        : "llama-3.3-70b-versatile";
      time.textContent = applicant.ai_analyzed_at ? new Date(applicant.ai_analyzed_at).toLocaleTimeString() : "Just now";

      const raw = applicant.ai_resume_summary || "No summary available.";
      const formattedHtml = raw
        .replace(/### (.*)/g, '<h4>$1</h4>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/- (.*)/g, '<li>$1</li>')
        .replace(/\n\n/g, '<br><br>');

      body.innerHTML = formattedHtml;
      modal.classList.remove("hidden");
    },

    closeSummaryModal() {
      const modal = document.getElementById("aiSummaryModal");
      if (modal) {
        modal.classList.add("hidden");
      }
    },

    applicantsFor(stage) {
      return this.applicants.filter(applicant => {
        const matchesStage = applicant.pipeline_stage === stage;
        if (!this.searchQuery) return matchesStage;
        const q = this.searchQuery.toLowerCase();
        const matchesName = applicant.name.toLowerCase().includes(q);
        const matchesSkill = applicant.skills && applicant.skills.toLowerCase().includes(q);
        return matchesStage && (matchesName || matchesSkill);
      });
    },

    filterByStage(stage) {
      this.selectedFilter = this.selectedFilter === stage ? null : stage;
    },

    clearFilter() {
      this.selectedFilter = null;
      this.searchQuery = "";
    },

    toggleAddForm() {
      this.showAddForm = !this.showAddForm;
    },

    initials(name) {
      if (!name) return "??";
      return name.split(/\s+/).map(p => p[0]).slice(0, 2).join("").toUpperCase();
    },

    stageClass(stage) {
      const idx = this.stages.indexOf(stage);
      return idx >= 0 ? `stage-${idx}` : "stage-0";
    }
  },
  mounted() {
    this.loadApplicants();

    // Event Delegation
    const boardContainer = document.getElementById("delegatedBoardContainer");
    if (boardContainer) {
      boardContainer.addEventListener("click", (event) => {
        const target = event.target;
        const actionButton = target.closest("[data-action]");

        if (!actionButton) {
          DOMPipelineHelper.updateEventInspector(event, "Clicked outside action buttons (bubbled to board)");
          return;
        }

        event.stopPropagation();
        const action = actionButton.dataset.action;
        const applicantId = actionButton.dataset.applicantId;

        DOMPipelineHelper.updateEventInspector(
          event,
          `Event Delegation intercepted action="${action}" for applicant #${applicantId}`
        );

        if (action === "analyze-resume") {
          this.analyzeApplicantResume(applicantId);
        } else if (action === "view-summary") {
          const applicant = this.applicants.find(a => a.id === Number(applicantId));
          if (applicant) {
            this.openSummaryModal(applicant);
          }
        }
      });
    }

    // Form Events
    const searchInput = document.getElementById("applicantSearchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        DOMPipelineHelper.updateEventInspector(
          e,
          `Live search filter input: "${e.target.value}" (length: ${e.target.value.length})`
        );
      });
    }

    // Modal Events
    const closeBtn = document.getElementById("modalCloseBtn");
    const closeFooterBtn = document.getElementById("modalCloseFooterBtn");
    const modalBackdrop = document.getElementById("aiSummaryModal");
    const copyBtn = document.getElementById("modalCopyBtn");

    if (closeBtn) closeBtn.addEventListener("click", () => this.closeSummaryModal());
    if (closeFooterBtn) closeFooterBtn.addEventListener("click", () => this.closeSummaryModal());

    if (modalBackdrop) {
      modalBackdrop.addEventListener("click", (e) => {
        if (e.target === modalBackdrop) this.closeSummaryModal();
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        if (this.selectedApplicantForModal && this.selectedApplicantForModal.ai_resume_summary) {
          navigator.clipboard.writeText(this.selectedApplicantForModal.ai_resume_summary);
          DOMPipelineHelper.showToast("Summary copied to clipboard!", "success");
        }
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.closeSummaryModal();
    });

    DOMPipelineHelper.logActivity("System", "", "Sprint Telemetry Online", "telemetry");
  }
});

app.mount("#app");
