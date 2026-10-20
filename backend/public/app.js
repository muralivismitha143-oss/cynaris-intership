/**
 * Cynaris Interview Pipeline & AI Resume Analysis
 *
 * Core Concepts Implemented:
 * 1. addEventListener - Attaching event listeners for user interactions
 * 2. Event Objects - Inspecting target, currentTarget, type, timeStamp, preventDefault, stopPropagation
 * 3. Event Bubbling - Understanding event propagation from child to parent
 * 4. Event Delegation - Centralized event handling on parent container
 * 5. Form Events - submit, input, change event lifecycles
 * 6. Groq (llama-3.3-70b-versatile) + OpenRouter Fallback Integration
 */

// ==========================================
// DOM Notification & Helper Manager
// ==========================================
const DOMPipelineHelper = {
  logActivity(candidateName, oldStage, newStage, actionType = "update") {
    const feed = document.getElementById("activityFeedList");
    if (!feed) return;

    const item = document.createElement("li");
    item.classList.add("activity-item");
    item.classList.add(`action-${actionType}`);

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
      selectedApplicantForModal: null
    };
  },
  computed: {
    totalToday() {
      return Object.values(this.todayCounts).reduce((sum, count) => sum + count, 0);
    }
  },
  methods: {
    async loadApplicants() {
      this.loading = true;
      this.error = "";
      try {
        const [applicantsResponse, dashboardResponse] = await Promise.all([
          fetch("/api/applicants"),
          fetch("/api/dashboard/stages-today")
        ]);

        if (!applicantsResponse.ok || !dashboardResponse.ok) {
          throw new Error("Could not load pipeline data.");
        }

        this.applicants = await applicantsResponse.json();
        const dashboard = await dashboardResponse.json();
        this.todayCounts = dashboard.counts || {};

        DOMPipelineHelper.showToast("Pipeline synchronized with backend", "info");
      } catch (error) {
        this.error = `${error.message} Check that the API server is running.`;
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
        const response = await fetch(`/api/applicants/${applicant.id}/stage`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage })
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Could not update applicant stage.");
        }

        const index = this.applicants.findIndex(item => item.id === applicant.id);
        if (index !== -1) {
          this.applicants.splice(index, 1, result.applicant);
        }

        await this.loadDashboard();
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
        const response = await fetch("/api/applicants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: this.newCandidateName.trim(),
            job_title: this.newCandidateRole,
            experience_years: this.newCandidateExp,
            skills: this.newCandidateSkills,
            stage: this.newCandidateStage
          })
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Failed to create candidate");
        }

        this.applicants.push(result.applicant);
        await this.loadDashboard();

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

        const response = await fetch(`/api/applicants/${applicant.id}/ai-summary?${queryParams.toString()}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            simulate_groq_failure: this.simulateGroqFailure,
            simulate_both_failure: this.simulateBothFailure
          })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to generate AI summary.");
        }

        // Update candidate in local state
        applicant.ai_resume_summary = result.summary;
        applicant.ai_summary_provider = result.provider;
        applicant.ai_analyzed_at = result.analyzed_at;

        DOMPipelineHelper.logActivity(applicant.name, "", result.provider, "ai-analysis");
        DOMPipelineHelper.showToast(`AI Summary generated via ${result.provider}!`, "success");

        // Display AI Modal
        this.openSummaryModal(applicant);
      } catch (err) {
        this.error = err.message;
        DOMPipelineHelper.showToast(`AI Error: ${err.message}`, "error");
      } finally {
        this.analyzingId = null;
      }
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

      // Convert simple markdown headings and bullets to rich HTML
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

    async loadDashboard() {
      const response = await fetch("/api/dashboard/stages-today");
      if (!response.ok) return;
      const dashboard = await response.json();
      this.todayCounts = dashboard.counts || {};
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

    // =========================================================================
    // NATIVE DOM EVENT DELEGATION & EVENT OBJECT HANDLING
    // =========================================================================

    // 1. EVENT DELEGATION ON KANBAN BOARD CONTAINER
    // Attaching a single click listener to #delegatedBoardContainer.
    // Events bubble from card action buttons up to this parent.
    const boardContainer = document.getElementById("delegatedBoardContainer");
    if (boardContainer) {
      boardContainer.addEventListener("click", (event) => {
        // Inspect Event Object properties
        const target = event.target;
        const actionButton = target.closest("[data-action]");

        if (!actionButton) {
          // Event bubbled from elsewhere in the board
          DOMPipelineHelper.updateEventInspector(event, "Clicked outside action buttons (bubbled to board)");
          return;
        }

        // Demonstrate stopPropagation to prevent unnecessary parent propagation
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

    // 2. FORM EVENTS (input & change)
    const searchInput = document.getElementById("applicantSearchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        DOMPipelineHelper.updateEventInspector(
          e,
          `Live search filter input: "${e.target.value}" (length: ${e.target.value.length})`
        );
      });
    }

    const groqToggle = document.getElementById("simulateGroqFailureCheck");
    if (groqToggle) {
      groqToggle.addEventListener("change", (e) => {
        DOMPipelineHelper.updateEventInspector(
          e,
          `Groq outage simulation changed to: ${e.target.checked}`
        );
      });
    }

    const bothToggle = document.getElementById("simulateBothFailureCheck");
    if (bothToggle) {
      bothToggle.addEventListener("change", (e) => {
        DOMPipelineHelper.updateEventInspector(
          e,
          `Both providers outage simulation changed to: ${e.target.checked}`
        );
      });
    }

    // 3. MODAL DISMISSAL EVENT LISTENERS
    const closeBtn = document.getElementById("modalCloseBtn");
    const closeFooterBtn = document.getElementById("modalCloseFooterBtn");
    const modalBackdrop = document.getElementById("aiSummaryModal");
    const copyBtn = document.getElementById("modalCopyBtn");

    if (closeBtn) closeBtn.addEventListener("click", () => this.closeSummaryModal());
    if (closeFooterBtn) closeFooterBtn.addEventListener("click", () => this.closeSummaryModal());

    if (modalBackdrop) {
      modalBackdrop.addEventListener("click", (e) => {
        // If clicking directly on backdrop outside the modal card, close it
        if (e.target === modalBackdrop) {
          this.closeSummaryModal();
        }
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

    // Keyboard event: ESC key to close modal
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeSummaryModal();
      }
    });

    DOMPipelineHelper.logActivity("System", "", "AI Ready", "ai-analysis");
  }
});

app.mount("#app");
