const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const validStages = [
  "Screening",
  "Technical Round 1",
  "Technical Round 2",
  "HR Round",
  "Offered",
  "Rejected"
];

const applicants = [
  {
    id: 1,
    name: "Rahul Kumar",
    pipeline_stage: "Screening",
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    name: "Priya Sharma",
    pipeline_stage: "Technical Round 1",
    updated_at: new Date().toISOString()
  },
  {
    id: 3,
    name: "Arun Kumar",
    pipeline_stage: "HR Round",
    updated_at: new Date().toISOString()
  }
];

// Check API health
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Interview API is running"
  });
});

// Get all applicants
app.get("/api/applicants", (req, res) => {
  res.json(applicants);
});

// Update interview stage
app.patch("/api/applicants/:applicant_id/stage", (req, res) => {
  const applicantId = Number(req.params.applicant_id);
  const { stage } = req.body;

  if (!Number.isInteger(applicantId) || applicantId < 1) {
    return res.status(400).json({
      error: "Invalid applicant ID"
    });
  }

  if (!validStages.includes(stage)) {
    return res.status(400).json({
      error: "Invalid stage",
      allowedStages: validStages
    });
  }

  const applicant = applicants.find(
    item => item.id === applicantId
  );

  if (!applicant) {
    return res.status(404).json({
      error: "Applicant not found"
    });
  }

  applicant.pipeline_stage = stage;
  applicant.updated_at = new Date().toISOString();

  res.json({
    message: "Pipeline stage updated successfully",
    applicant
  });
});

// Count applicants updated today by stage
app.get("/api/dashboard/stages-today", (req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  const counts = Object.fromEntries(
    validStages.map(stage => [stage, 0])
  );

  applicants.forEach(applicant => {
    if (applicant.updated_at.slice(0, 10) === today) {
      counts[applicant.pipeline_stage]++;
    }
  });

  res.json({ date: today, counts });
});

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found"
  });
});

app.listen(PORT, () => {
  console.log(
    `Interview API running at http://localhost:${PORT}`
  );
});
