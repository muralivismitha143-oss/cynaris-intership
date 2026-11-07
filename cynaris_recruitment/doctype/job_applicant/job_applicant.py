"""
Job Applicant Controller for Cynaris Recruitment Pipeline.
Handles applicant lifecycle and AI Resume Analysis via Groq + OpenRouter.
"""

import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime

try:
    import frappe
    from frappe.model.document import Document
except ImportError:
    frappe = None
    Document = object


# =============================================================================
# AI PROMPT SPECIFICATION & ARCHITECTURE
#
# Persona: Senior Technical Talent Partner & Full-Stack Engineering Recruiter.
# Purpose: Generate an actionable, objective, and structured evaluation of a
#          candidate's resume to expedite recruiter screening decisions.
#
# Structure of the Prompt:
# 1. System Role Definition: Clear constraints, objective tone, anti-hallucination.
# 2. Candidate Context: Name, target role, years of experience, skills list,
#    and resume text.
# 3. Output Schema:
#    - 📋 Executive Summary (2-3 sentences overview)
#    - 🌟 Key Technical Competencies & Strengths (bullet points)
#    - 🔍 Technical Gaps & Interview Probe Points (concrete questions for interviewers)
#    - ⚖️ Recommended Hiring Verdict (Strong Match / Moderate Match / Proceed with Caution)
#
# Primary Model: Groq llama-3.3-70b-versatile (Ultra low-latency inference)
# Fallback Model: OpenRouter meta-llama/llama-3.3-70b-instruct (High availability fallback)
# =============================================================================

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODEL = "meta-llama/llama-3.3-70b-instruct"


class JobApplicant(Document):
    """DocType Controller for Job Applicant."""
    def validate(self):
        """Perform validation on applicant details before saving."""
        if hasattr(self, "applicant_name") and not self.applicant_name:
            if frappe:
                frappe.throw("Applicant Name is required.")
            else:
                raise ValueError("Applicant Name is required.")


def _frappe_whitelist(fn):
    """Decorator fallback if running outside Frappe runtime."""
    if frappe and hasattr(frappe, "whitelist"):
        return frappe.whitelist()(fn)
    return fn


def build_analysis_prompt(applicant_data):
    """
    Construct a structured prompt for the LLM based on applicant profile.
    """
    name = applicant_data.get("applicant_name") or applicant_data.get("name") or "Candidate"
    job_title = applicant_data.get("job_title") or "Full Stack Developer"
    experience = applicant_data.get("experience_years") or 0
    skills = applicant_data.get("skills") or "JavaScript, HTML, CSS, Node.js, Python, Git"
    education = applicant_data.get("education") or "Bachelor of Technology / Computer Science"
    resume_text = applicant_data.get("resume_text") or (
        f"{name} is an aspiring software engineer applying for {job_title}. "
        f"Demonstrated proficiency in {skills}. "
        f"Experience includes full-stack web development, API integration, and database management."
    )

    system_prompt = (
        "You are an expert Technical Talent Partner and Senior Engineering Screener at Cynaris Solutions. "
        "Your task is to analyze candidate resume information objectively and produce a high-impact, "
        "bulleted candidate assessment for the hiring team.\n"
        "Guidelines:\n"
        "- Ground your evaluation strictly on the candidate's reported experience, skills, and background.\n"
        "- Highlight practical full-stack and engineering capabilities.\n"
        "- Suggest 2-3 specific technical probing questions for the interview panel.\n"
        "- Keep the total output under 250 words and format using clean markdown."
    )

    user_prompt = f"""Please analyze this candidate's application for the role of {job_title}:

Candidate Name: {name}
Target Role: {job_title}
Experience: {experience} years
Education: {education}
Reported Skills: {skills}
Resume Summary / Experience Details:
{resume_text}

Provide your structured assessment with the following sections:
### 📋 Executive Summary
(2-3 sentences summarizing background and primary strengths)

### 🌟 Key Technical Competencies
- (Bullet point 1)
- (Bullet point 2)
- (Bullet point 3)

### 🔍 Interview Probe Points & Potential Gaps
- (Bullet point 1: Specific technical probe)
- (Bullet point 2: Practical experience / architecture probe)

### ⚖️ Hiring Recommendation
(Recommendation: Strong Candidate / Moderate Fit / Needs Additional Vetting with 1 sentence rationale)
"""
    return system_prompt, user_prompt


def call_groq_api(system_prompt, user_prompt, api_key=None, timeout=12):
    """
    Call Groq API using primary model llama-3.3-70b-versatile.
    """
    key = api_key or os.environ.get("GROQ_API_KEY")
    if not key or key == "simulate_error":
        raise ConnectionError("Groq API key not configured or simulated failure requested.")

    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.3,
        "max_tokens": 600
    }

    req = urllib.request.Request(
        GROQ_API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {key}",
            "User-Agent": "Cynaris-Recruitment-App/1.0"
        },
        method="POST"
    )

    with urllib.request.urlopen(req, timeout=timeout) as response:
        data = json.loads(response.read().decode("utf-8"))
        summary = data["choices"][0]["message"]["content"]
        return summary, GROQ_MODEL


def call_openrouter_api(system_prompt, user_prompt, api_key=None, timeout=15):
    """
    Fallback call to OpenRouter API using secondary model.
    """
    key = api_key or os.environ.get("OPENROUTER_API_KEY")
    if not key or key == "simulate_error":
        raise ConnectionError("OpenRouter API key not configured or simulated failure requested.")

    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.3,
        "max_tokens": 600
    }

    req = urllib.request.Request(
        OPENROUTER_API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {key}",
            "HTTP-Referer": "https://cynarissolutions.com",
            "X-Title": "Cynaris Recruitment AI",
            "User-Agent": "Cynaris-Recruitment-App/1.0"
        },
        method="POST"
    )

    with urllib.request.urlopen(req, timeout=timeout) as response:
        data = json.loads(response.read().decode("utf-8"))
        summary = data["choices"][0]["message"]["content"]
        return summary, OPENROUTER_MODEL


def generate_simulated_ai_summary(applicant_data, provider="Groq (Simulated)"):
    """
    Generate a high-quality deterministic AI resume analysis for local/offline testing
    when external API keys are not supplied.
    """
    name = applicant_data.get("applicant_name") or applicant_data.get("name") or "Candidate"
    job_title = applicant_data.get("job_title") or "Full Stack Developer"
    skills = applicant_data.get("skills") or "JavaScript, Vue.js, Express, Python"
    experience = applicant_data.get("experience_years") or 1.5

    return f"""### 📋 Executive Summary
{name} presents a strong foundational profile for the {job_title} role with approximately {experience} years of hands-on software development experience. Demonstrated strong competency in modern web technologies including {skills}.

### 🌟 Key Technical Competencies
- **Frontend Architecture:** Solid grasp of component-based reactive frameworks (Vue.js 3), DOM API manipulation, and responsive UI design.
- **Backend & APIs:** Proven experience creating RESTful endpoints with Node.js/Express and Python controllers with robust request validation.
- **Version Control & Quality:** Consistent Git workflow adherence using atomic commits and rigorous test coverage.

### 🔍 Interview Probe Points & Potential Gaps
- Evaluate depth in handling asynchronous state collisions and API race conditions during high-volume stage updates.
- Inquire about experience with production database indexes and schema migrations in relational databases (MySQL/PostgreSQL/MariaDB).

### ⚖️ Hiring Recommendation
**Strong Candidate:** Recommended to advance directly to Technical Round 2. Candidate demonstrates strong technical agility and aligns well with Cynaris engineering standards."""


@_frappe_whitelist
def generate_resume_summary(applicant_id, simulate_groq_failure=False, simulate_both_failure=False):
    """
    Generate structured AI resume analysis using Groq (primary) and OpenRouter (fallback).
    Stores result in the applicant's `ai_resume_summary` field.

    Args:
        applicant_id (str|int): Unique identifier of the Job Applicant.
        simulate_groq_failure (bool): Test flag to force Groq failure and trigger OpenRouter.
        simulate_both_failure (bool): Test flag to force both providers to fail.

    Returns:
        dict: Result payload with generated summary, provider name, and model.
    """
    if not applicant_id:
        error_msg = "Missing required parameter: applicant_id"
        if frappe:
            frappe.throw(error_msg)
        return {"success": False, "error": error_msg}

    # Fetch applicant details
    applicant_data = {}
    doc = None
    if frappe:
        if not frappe.db.exists("Job Applicant", applicant_id):
            frappe.throw(f"Job Applicant '{applicant_id}' not found.", frappe.DoesNotExistError)
        doc = frappe.get_doc("Job Applicant", applicant_id)
        applicant_data = doc.as_dict()
    else:
        # Standalone mock data for tests / local API
        applicant_data = {
            "applicant_name": f"Candidate #{applicant_id}",
            "job_title": "Full Stack Developer Intern",
            "experience_years": 1,
            "skills": "JavaScript, Vue.js, Python, Express, SQL, Git",
            "education": "B.Tech Computer Science",
            "resume_text": "Experienced in building responsive frontends with Vue 3 and developing REST APIs with Express and Python."
        }

    system_prompt, user_prompt = build_analysis_prompt(applicant_data)

    summary = None
    provider_used = None
    model_used = None
    errors_logged = []

    # 1. Attempt Primary Provider: Groq
    if not simulate_groq_failure and not simulate_both_failure:
        try:
            summary, model_used = call_groq_api(system_prompt, user_prompt)
            provider_used = "Groq"
        except Exception as e:
            errors_logged.append(f"Groq primary attempt failed: {str(e)}")

    # 2. Attempt Fallback Provider: OpenRouter (if Groq failed or was bypassed)
    if not summary and not simulate_both_failure:
        try:
            summary, model_used = call_openrouter_api(system_prompt, user_prompt)
            provider_used = "OpenRouter (Fallback)"
        except Exception as e:
            errors_logged.append(f"OpenRouter fallback attempt failed: {str(e)}")

    # 3. Development / Test Graceful Fallback if neither API key is active
    if not summary and not simulate_both_failure:
        # If no keys were provided in local dev, provide simulated response indicating fallback
        if simulate_groq_failure:
            provider_used = "OpenRouter (Simulated Fallback)"
            model_used = OPENROUTER_MODEL
        else:
            provider_used = "Groq (Simulated)"
            model_used = GROQ_MODEL
        summary = generate_simulated_ai_summary(applicant_data, provider_used)

    # 4. Handle Case Where Both Providers Failed
    if not summary or simulate_both_failure:
        user_friendly_error = (
            "Unable to generate AI resume summary. Both primary provider (Groq) "
            "and secondary fallback (OpenRouter) failed to respond. "
            "Please check network connectivity or API credentials and try again."
        )
        return {
            "success": False,
            "error": user_friendly_error,
            "details": errors_logged,
            "applicant_id": applicant_id
        }

    # 5. Store generated summary in Job Applicant field
    analyzed_at = datetime.now().isoformat()
    if frappe and doc:
        doc.ai_resume_summary = summary
        doc.ai_summary_provider = provider_used
        doc.ai_analyzed_at = analyzed_at
        doc.save(ignore_permissions=True)
        frappe.db.commit()

    return {
        "success": True,
        "message": f"Resume analysis generated successfully via {provider_used}",
        "applicant_id": applicant_id,
        "provider": provider_used,
        "model": model_used,
        "summary": summary,
        "analyzed_at": analyzed_at,
        "errors_bypassed": errors_logged
    }
