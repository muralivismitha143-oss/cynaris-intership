/**
 * AiRecommendationService.js
 * 
 * Cynaris Platform — AI Learning Recommendations Engine
 * Week 6 Day 3: Generates personalized, data-driven learning recommendations
 * from candidate grades (mdl_grade_grades) and course completion data (mdl_course_completions).
 * 
 * Multi-Tier Fallback Lifecycle:
 *   Tier 1 (Primary): Groq Cloud API (llama-3.3-70b-versatile) for high-speed sub-350ms inference.
 *   Tier 2 (Fallback): OpenRouter API (meta-llama/llama-3.3-70b-instruct) on error, 429 quota exhaustion, or timeout.
 *   Tier 3 (Local Offline Fallback): Rule-based deterministic curriculum recommendation engine for 100% test reliability and zero downtime.
 */

const https = require('https');
const http = require('http');

class AiRecommendationService {
  constructor(options = {}) {
    this.groqApiKey = options.groqApiKey !== undefined ? options.groqApiKey : process.env.GROQ_API_KEY;
    this.openRouterApiKey = options.openRouterApiKey !== undefined ? options.openRouterApiKey : process.env.OPENROUTER_API_KEY;
    this.primaryModel = options.primaryModel || 'llama-3.3-70b-versatile';
    this.fallbackModel = options.fallbackModel || 'meta-llama/llama-3.3-70b-instruct';
    this.timeoutMs = options.timeoutMs || 6000;
    this.groqBaseUrl = options.groqBaseUrl || 'https://api.groq.com/openai/v1/chat/completions';
    this.openRouterBaseUrl = options.openRouterBaseUrl || 'https://openrouter.ai/api/v1/chat/completions';
  }

  /**
   * Constructs the structured Socratic prompt for learning recommendations.
   * Prompts are documented in code comments per assignment specification:
   * 
   * SYSTEM PROMPT DESIGN:
   * - Persona: Lead AI Learning Path Architect & Senior Staff Mentor.
   * - Pedagogical Rules: Grades >= 80% indicate mastery/strength; 60-79% indicate proficiency needing refinement;
   *   < 60% or incomplete modules indicate critical growth areas.
   * - Enforces strict JSON schema contract without markdown fences.
   * 
   * USER PROMPT DESIGN:
   * - Injects student details, completion status across courses, and all assessment grades.
   * - Mandates structured output with studentSummary, strengths, growthAreas, recommendedActions, nextMilestone, and encouragement.
   */
  buildRecommendationPrompt(studentProfile) {
    const student = studentProfile.user || { name: 'Engineering Candidate', department: 'Full Stack' };
    const completions = studentProfile.completions || [];
    const grades = studentProfile.grades || [];

    const completionsSummary = completions.map(c => 
      `- Course: ${c.courseName || `Course #${c.course}`} | Status: ${c.status === 1 ? 'COMPLETED' : 'IN_PROGRESS'} | Enrolled: ${c.timeenrolled ? new Date(c.timeenrolled * 1000).toISOString().slice(0, 10) : 'N/A'}`
    ).join('\n');

    const gradesSummary = grades.map(g => 
      `- Assessment: ${g.quizName || `Quiz #${g.itemid}`} | Score: ${g.finalgrade}/${g.rawgrademax || 100} | Feedback: "${g.feedback || 'Attempt recorded'}"`
    ).join('\n');

    const systemPrompt = `You are a Lead AI Learning Path Architect and Senior Staff Mentor at Cynaris Training Academy.
Analyze candidate assessment grades (mdl_grade_grades) and course completion records (mdl_course_completions) to generate personalized, data-driven learning recommendations.
Rules:
1. Analyze grade percentages: >=80% = strength/mastery, 60-79% = proficient but needs refinement, <60% or incomplete = critical growth area.
2. Formulate prioritized, actionable learning steps with concrete study topics and realistic estimated hours.
3. Classify candidate into a performance tier: 'Advanced', 'Proficient', or 'Needs Support'.
4. Provide a supportive, motivating pedagogical encouragement message tailored to their velocity.
5. Return ONLY a valid JSON object matching the requested schema. Never include markdown fences or introductory text.`;

    const userPrompt = `Generate personalized learning recommendations for the following candidate:
Candidate: ${student.name} (${student.department || 'Engineering Intern'})
Enrolled Courses & Completion Data:
${completionsSummary || 'No course completions recorded yet.'}

Assessment Grades & Feedback:
${gradesSummary || 'No graded attempts recorded yet.'}

Return strictly a JSON object conforming to this schema:
{
  "studentSummary": {
    "tier": "Advanced" | "Proficient" | "Needs Support",
    "averageGrade": 92.5,
    "completionRate": 66.7,
    "analysis": "Executive overview of candidate's technical velocity and readiness."
  },
  "strengths": [
    { "topic": "Topic Name", "evidence": "Score 95% on Quiz X" }
  ],
  "growthAreas": [
    { "topic": "Topic Name", "evidence": "Course Y pending completion" }
  ],
  "recommendedActions": [
    { "priority": 1, "action": "Actionable task", "targetCourse": "Course Name", "estimatedHours": 3 }
  ],
  "nextMilestone": {
    "goal": "Milestone title",
    "targetDateDays": 7,
    "readinessScore": 90
  },
  "pedagogicalEncouragement": "Encouraging closing note."
}`;

    return { systemPrompt, userPrompt };
  }

  /**
   * Validates recommendation structure against invariant contract.
   */
  validateRecommendationStructure(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Recommendation response must be a non-null object');
    }

    // Assert studentSummary
    if (!data.studentSummary || typeof data.studentSummary !== 'object') {
      throw new Error('Missing or invalid studentSummary in recommendation payload');
    }
    const validTiers = ['Advanced', 'Proficient', 'Needs Support'];
    if (!validTiers.includes(data.studentSummary.tier)) {
      throw new Error(`studentSummary.tier must be one of: ${validTiers.join(', ')}`);
    }
    if (typeof data.studentSummary.averageGrade !== 'number') {
      throw new Error('studentSummary.averageGrade must be a number');
    }

    // Assert arrays
    if (!Array.isArray(data.strengths) || data.strengths.length === 0) {
      throw new Error('strengths must be a non-empty array of mastery items');
    }
    if (!Array.isArray(data.growthAreas) || data.growthAreas.length === 0) {
      throw new Error('growthAreas must be a non-empty array of areas needing improvement');
    }
    if (!Array.isArray(data.recommendedActions) || data.recommendedActions.length === 0) {
      throw new Error('recommendedActions must be a non-empty array of prioritized next steps');
    }

    for (const act of data.recommendedActions) {
      if (typeof act.priority !== 'number' || !act.action) {
        throw new Error('Each recommendedAction must have priority and action text');
      }
    }

    // Assert nextMilestone & pedagogicalEncouragement
    if (!data.nextMilestone || !data.nextMilestone.goal) {
      throw new Error('Missing nextMilestone or nextMilestone.goal');
    }
    if (typeof data.pedagogicalEncouragement !== 'string' || !data.pedagogicalEncouragement.trim()) {
      throw new Error('pedagogicalEncouragement must be a non-empty string');
    }

    return true;
  }

  /**
   * Sanitizes and parses LLM text response into valid JSON.
   */
  cleanAndParseJson(rawText) {
    if (!rawText) return null;
    let cleaned = rawText.trim();
    // Strip markdown code fences if present
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();

    // Extract outer JSON object if wrapped in commentary
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    try {
      return JSON.parse(cleaned);
    } catch (e) {
      throw new Error(`Failed to parse LLM JSON: ${e.message}. Content was: ${cleaned.slice(0, 150)}...`);
    }
  }

  /**
   * Local deterministic fallback generating recommendations from actual grade/completion metrics.
   * Guarantees zero downtime and 100% test reliability during offline or air-gapped runs.
   */
  localDeterministicFallback(studentProfile) {
    const student = studentProfile.user || { name: 'Candidate', department: 'Engineering' };
    const completions = studentProfile.completions || [];
    const grades = studentProfile.grades || [];

    // Calculate metrics
    let avgGrade = 0;
    if (grades.length > 0) {
      const sum = grades.reduce((acc, g) => acc + Number(g.finalgrade || 0), 0);
      avgGrade = Number((sum / grades.length).toFixed(1));
    } else {
      avgGrade = 75.0; // Benchmark starting grade
    }

    const totalCourses = completions.length > 0 ? completions.length : 3;
    const completedCount = completions.filter(c => c.status === 1).length;
    const completionRate = Number(((completedCount / totalCourses) * 100).toFixed(1));

    // Determine performance tier
    let tier = 'Proficient';
    if (avgGrade >= 90 && completionRate >= 50) {
      tier = 'Advanced';
    } else if (avgGrade < 80 || completionRate < 40) {
      tier = 'Needs Support';
    }

    // Synthesize strengths
    const strengths = [];
    const highGrades = grades.filter(g => Number(g.finalgrade) >= 80);
    if (highGrades.length > 0) {
      highGrades.forEach(g => {
        strengths.push({
          topic: g.quizName || `Assessment #${g.itemid}`,
          evidence: `Scored ${g.finalgrade}% demonstrating strong technical mastery.`
        });
      });
    } else {
      strengths.push({
        topic: 'Foundational Induction & Core Syntax',
        evidence: 'Consistent progress across early training modules.'
      });
    }

    // Synthesize growth areas
    const growthAreas = [];
    const lowerGrades = grades.filter(g => Number(g.finalgrade) < 80);
    if (lowerGrades.length > 0) {
      lowerGrades.forEach(g => {
        growthAreas.push({
          topic: g.quizName || `Assessment #${g.itemid}`,
          evidence: `Scored ${g.finalgrade}%. Target is >= 85% for production readiness.`
        });
      });
    }

    const inProgressCompletions = completions.filter(c => c.status !== 1);
    if (inProgressCompletions.length > 0) {
      inProgressCompletions.forEach(c => {
        growthAreas.push({
          topic: c.courseName || `Course #${c.course}`,
          evidence: 'Module is currently in progress; completion criteria pending.'
        });
      });
    }

    if (growthAreas.length === 0) {
      growthAreas.push({
        topic: 'Production Deployment & Load Testing',
        evidence: 'Advanced performance profiling under concurrent workloads.'
      });
    }

    // Formulate prioritized actions
    const recommendedActions = [
      {
        priority: 1,
        action: growthAreas[0] ? `Review core principles for ${growthAreas[0].topic}` : 'Complete pending module assignments',
        targetCourse: inProgressCompletions[0] ? inProgressCompletions[0].courseName : 'CYN-OPS-103',
        estimatedHours: 4
      },
      {
        priority: 2,
        action: 'Re-take practice assessment quizzes in Moodle Question Bank',
        targetCourse: 'CYN-FS-101',
        estimatedHours: 2
      },
      {
        priority: 3,
        action: 'Review Docker Compose healthcheck dependencies and CI/CD DAGs',
        targetCourse: 'CYN-OPS-103',
        estimatedHours: 3
      }
    ];

    const readinessScore = Math.min(100, Math.round((avgGrade * 0.7) + (completionRate * 0.3)));

    return {
      studentSummary: {
        tier,
        averageGrade: avgGrade,
        completionRate,
        analysis: `${student.name} is performing at an ${tier} level with an average grade of ${avgGrade}% and a course completion rate of ${completionRate}%.`
      },
      strengths,
      growthAreas,
      recommendedActions,
      nextMilestone: {
        goal: tier === 'Advanced' ? 'Full Stack Developer Production Sign-off' : 'Core Architecture Milestone Certification',
        targetDateDays: tier === 'Advanced' ? 5 : 12,
        readinessScore
      },
      pedagogicalEncouragement: `Great dedication, ${student.name}! Your technical foundation is solid. Focus on the prioritized actions above to reach 100% production readiness.`
    };
  }

  /**
   * Dispatches HTTP/HTTPS POST request with timeout abort.
   */
  async _postJson(urlStr, headers, payload) {
    return new Promise((resolve, reject) => {
      const url = new URL(urlStr);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;
      const body = JSON.stringify(payload);

      const req = client.request(urlStr, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          ...headers,
        },
        timeout: this.timeoutMs,
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error(`Invalid JSON response: ${e.message}`));
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timed out after ${this.timeoutMs}ms`));
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.write(body);
      req.end();
    });
  }

  /**
   * Tier 1: Calls Groq Cloud API.
   */
  async callGroq(prompt) {
    if (!this.groqApiKey) {
      throw new Error('GROQ_API_KEY is not configured');
    }

    const payload = {
      model: this.primaryModel,
      messages: [
        { role: 'system', content: prompt.systemPrompt },
        { role: 'user', content: prompt.userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    };

    const headers = {
      'Authorization': `Bearer ${this.groqApiKey}`
    };

    const response = await this._postJson(this.groqBaseUrl, headers, payload);
    const content = response.choices && response.choices[0] && response.choices[0].message && response.choices[0].message.content;
    if (!content) {
      throw new Error('Groq returned empty response content');
    }
    return this.cleanAndParseJson(content);
  }

  /**
   * Tier 2: Calls OpenRouter API as fallback.
   */
  async callOpenRouter(prompt) {
    if (!this.openRouterApiKey) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    const payload = {
      model: this.fallbackModel,
      messages: [
        { role: 'system', content: prompt.systemPrompt },
        { role: 'user', content: prompt.userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 2000,
    };

    const headers = {
      'Authorization': `Bearer ${this.openRouterApiKey}`,
      'HTTP-Referer': 'https://cynaris.com',
      'X-Title': 'Cynaris Training Platform'
    };

    const response = await this._postJson(this.openRouterBaseUrl, headers, payload);
    const content = response.choices && response.choices[0] && response.choices[0].message && response.choices[0].message.content;
    if (!content) {
      throw new Error('OpenRouter returned empty response content');
    }
    return this.cleanAndParseJson(content);
  }

  /**
   * Master generation coordinator orchestrating Groq -> OpenRouter -> Local Deterministic Fallback.
   */
  async generateRecommendations(studentProfile, options = {}) {
    const startTime = Date.now();
    const prompt = this.buildRecommendationPrompt(studentProfile);

    let result = null;
    let provider = 'groq';
    let model = this.primaryModel;
    let fallbackUsed = false;
    let fallbackReason = null;

    // Simulate options for testing
    const simulateGroqFailure = options.simulateGroqFailure || options.groqApiKey === 'failing_key';
    const simulateBothFailure = options.simulateBothFailure;

    // 1. Attempt Primary: Groq API
    if (!simulateGroqFailure && !simulateBothFailure && this.groqApiKey) {
      try {
        result = await this.callGroq(prompt);
        this.validateRecommendationStructure(result);
      } catch (err) {
        fallbackUsed = true;
        fallbackReason = `Groq API error: ${err.message}`;
      }
    } else {
      fallbackUsed = true;
      fallbackReason = simulateBothFailure ? 'Simulated total cloud outage' : 'Groq API disabled or unavailable';
    }

    // 2. Attempt Fallback: OpenRouter API
    if (fallbackUsed && !simulateBothFailure && this.openRouterApiKey) {
      try {
        result = await this.callOpenRouter(prompt);
        this.validateRecommendationStructure(result);
        provider = 'openrouter';
        model = this.fallbackModel;
      } catch (err) {
        fallbackReason = `${fallbackReason} -> OpenRouter API error: ${err.message}`;
      }
    }

    // 3. Attempt Tier 3: Local Deterministic Rule Engine
    if (!result) {
      result = this.localDeterministicFallback(studentProfile);
      provider = 'local-deterministic';
      model = 'deterministic-recommendation-engine-v1';
      fallbackUsed = true;
      if (!fallbackReason) {
        fallbackReason = 'Activated local deterministic offline engine';
      }
    }

    const latencyMs = Date.now() - startTime;

    return {
      success: true,
      provider,
      model,
      latencyMs,
      fallbackUsed,
      fallbackReason,
      data: result,
      student: {
        id: (studentProfile.user && studentProfile.user.id) || null,
        name: (studentProfile.user && studentProfile.user.name) || 'Candidate'
      }
    };
  }

  /**
   * Returns operational health status of AI recommendation service.
   */
  getHealth() {
    return {
      status: 'operational',
      service: 'Cynaris AI Learning Recommendation Service',
      version: '1.0.0',
      primaryProvider: {
        provider: 'groq',
        model: this.primaryModel,
        configured: Boolean(this.groqApiKey)
      },
      fallbackProvider: {
        provider: 'openrouter',
        model: this.fallbackModel,
        configured: Boolean(this.openRouterApiKey)
      },
      offlineFallback: {
        provider: 'local-deterministic',
        model: 'deterministic-recommendation-engine-v1',
        available: true
      }
    };
  }
}

const aiRecommendationService = new AiRecommendationService();

module.exports = {
  AiRecommendationService,
  aiRecommendationService
};
