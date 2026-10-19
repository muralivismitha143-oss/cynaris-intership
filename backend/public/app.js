/**
 * Cynaris Interview Pipeline Component
 * Combining Vue 3 Reactive Kanban Board with Native DOM Manipulation APIs:
 * - querySelector
 * - getElementById
 * - innerHTML
 * - classList
 * - createElement
 */

// ==========================================
// Native DOM Manipulation Utility Manager
// ==========================================
const DOMPipelineHelper = {
  /**
   * 1. getElementById & 5. createElement & 4. classList & 3. innerHTML
   * Adds an audit event item to the Live Activity Feed using pure DOM manipulation
   */
  logActivity(candidateName, oldStage, newStage, actionType = "update") {
    // 2. getElementById: targeting the feed list container
    const feed = document.getElementById("activityFeedList");
    if (!feed) return;

    // 5. createElement: creating a new list item and child elements
    const item = document.createElement("li");

    // 4. classList: applying styling classes and animation
    item.classList.add("activity-item");
    item.classList.add(`action-${actionType}`);

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    // Sanitize values to prevent XSS
    const safeName = String(candidateName).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
    const safeOld = String(oldStage).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
    const safeNew = String(newStage).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));

    // 3. innerHTML: setting formatted rich HTML inside the newly created element
    if (actionType === "create") {
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
          <p><strong>${safeName}</strong> transitioned from <span class="badge-pill old">${safeOld}</span> to <span class="badge-pill new">${safeNew}</span></p>
          <time class="activity-time">${timeStr}</time>
        </div>
      `;
    }

    // Prepend new activity to top of list
    feed.prepend(item);

    // Keep max 10 activity items in DOM
    while (feed.children.length > 10) {
      feed.removeChild(feed.lastChild);
    }
  },

  /**
   * 1. querySelector & 5. createElement & 4. classList & 3. innerHTML
   * Displays an ephemeral toast alert on the screen
   */
  showToast(message, type = "info") {
    // 1. querySelector: targeting the toast container
    const container = document.querySelector("#toastContainer") || document.querySelector(".toast-container");
    if (!container) return;

    // 5. createElement: creating toast card
    const toast = document.createElement("div");

    // 4. classList: adding type and animation classes
    toast.classList.add("dom-toast");
    toast.classList.add(`toast-${type}`);

    // 3. innerHTML: inserting sanitized notification content
    const safeMsg = String(message).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
    toast.innerHTML = `
      <span class="toast-indicator"></span>
      <span class="toast-message">${safeMsg}</span>
      <button type="button" class="toast-close" aria-label="Close notification">&times;</button>
    `;

    // Hook up dismiss button
    const closeBtn = toast.querySelector(".toast-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        // 4. classList: remove animation before removal
        toast.classList.add("toast-leaving");
        setTimeout(() => toast.remove(), 250);
      });
    }

    container.appendChild(toast);

    // Auto-remove toast after 4 seconds
    setTimeout(() => {
      if (toast.parentElement) {
        toast.classList.add("toast-leaving");
        setTimeout(() => toast.remove(), 250);
      }
    }, 4000);
  },

  /**
   * 1. querySelector & 4. classList
   * Highlights a column briefly when an applicant is placed into it
   */
  highlightColumn(stage) {
    // 1. querySelector: locate column by data attribute
    const column = document.querySelector(`.column[data-stage="${stage}"]`);
    if (column) {
      // 4. classList: add pulse animation class
      column.classList.add("column-highlight");
      setTimeout(() => {
        column.classList.remove("column-highlight");
      }, 1200);
    }
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
      submitting: false,
      error: "",
      success: "",
      searchQuery: "",
      selectedFilter: null,
      showAddForm: false,
      newCandidateName: "",
      newCandidateStage: "Screening"
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

        // Trigger native DOM manipulation helpers
        DOMPipelineHelper.logActivity(applicant.name, oldStage, stage, "update");
        DOMPipelineHelper.showToast(`${applicant.name} moved to ${stage}`, "success");
        DOMPipelineHelper.highlightColumn(stage);
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
        this.newCandidateStage = "Screening";
        this.showAddForm = false;

        // Trigger native DOM manipulation helpers
        DOMPipelineHelper.logActivity(addedName, "", addedStage, "create");
        DOMPipelineHelper.showToast(`Candidate ${addedName} added successfully`, "success");
        DOMPipelineHelper.highlightColumn(addedStage);
      } catch (error) {
        this.error = error.message;
        DOMPipelineHelper.showToast(`Error: ${error.message}`, "error");
      } finally {
        this.submitting = false;
      }
    },

    async loadDashboard() {
      const response = await fetch("/api/dashboard/stages-today");
      if (!response.ok) {
        throw new Error("Stage changed, but today's summary could not refresh.");
      }
      const dashboard = await response.json();
      this.todayCounts = dashboard.counts || {};
    },

    applicantsFor(stage) {
      return this.applicants.filter(applicant => {
        const matchesStage = applicant.pipeline_stage === stage;
        if (!this.searchQuery) return matchesStage;
        const matchesSearch = applicant.name.toLowerCase().includes(this.searchQuery.toLowerCase());
        return matchesStage && matchesSearch;
      });
    },

    filterByStage(stage) {
      if (this.selectedFilter === stage) {
        this.selectedFilter = null;
      } else {
        this.selectedFilter = stage;
      }
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
      return name
        .split(/\s+/)
        .map(part => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
    },

    stageClass(stage) {
      const idx = this.stages.indexOf(stage);
      return idx >= 0 ? `stage-${idx}` : "stage-0";
    }
  },
  mounted() {
    this.loadApplicants();

    // Initial greeting in DOM Activity Feed
    DOMPipelineHelper.logActivity("System", "", "Pipeline Ready", "create");
  }
});

app.mount("#app");
