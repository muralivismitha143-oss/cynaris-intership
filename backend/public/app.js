const { createApp } = Vue;

createApp({
  data() {
    return {
      stages: ["Screening", "Technical Round 1", "Technical Round 2", "HR Round", "Offered", "Rejected"],
      applicants: [],
      todayCounts: {},
      loading: false,
      updatingId: null,
      error: "",
      success: ""
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
        if (!applicantsResponse.ok || !dashboardResponse.ok) throw new Error("Could not load pipeline data.");
        this.applicants = await applicantsResponse.json();
        const dashboard = await dashboardResponse.json();
        this.todayCounts = dashboard.counts;
      } catch (error) {
        this.error = `${error.message} Check that the API server is running.`;
      } finally {
        this.loading = false;
      }
    },
    async updateStage(applicant, stage) {
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
        if (!response.ok) throw new Error(result.error || "Could not update applicant stage.");
        const index = this.applicants.findIndex(item => item.id === applicant.id);
        this.applicants.splice(index, 1, result.applicant);
        await this.loadDashboard();
        this.success = `${applicant.name} moved to ${stage}.`;
      } catch (error) {
        this.error = error.message;
      } finally {
        this.updatingId = null;
      }
    },
    async loadDashboard() {
      const response = await fetch("/api/dashboard/stages-today");
      if (!response.ok) throw new Error("Stage changed, but today's summary could not refresh.");
      const dashboard = await response.json();
      this.todayCounts = dashboard.counts;
    },
    applicantsFor(stage) {
      return this.applicants.filter(applicant => applicant.pipeline_stage === stage);
    },
    initials(name) {
      return name.split(/\s+/).map(part => part[0]).slice(0, 2).join("").toUpperCase();
    },
    stageClass(stage) {
      return `stage-${this.stages.indexOf(stage)}`;
    }
  },
  mounted() {
    this.loadApplicants();
  }
}).mount("#app");
