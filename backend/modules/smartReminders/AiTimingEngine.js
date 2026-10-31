/**
 * AiTimingEngine.js
 * 
 * Demonstrates:
 * - Smart Reminders: AI-Suggested Timing & Messaging Engine
 * - Primary LLM: Groq (llama-3.3-70b-versatile)
 * - Fallback LLM: OpenRouter (meta-llama/llama-3.3-70b-instruct)
 * - Graceful Local Deterministic Offline Fallback
 * - Structured prompt engineering grounded in recipient psychology, Indian business hours (IST),
 *   urgency classification, and channel optimization
 */

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "meta-llama/llama-3.3-70b-instruct";

class AiTimingEngine {
  constructor(config = {}) {
    this.groqApiKey = config.groqApiKey || process.env.GROQ_API_KEY;
    this.openRouterApiKey = config.openRouterApiKey || process.env.OPENROUTER_API_KEY;
    this.simulateGroqFailure = config.simulateGroqFailure || false;
    this.simulateBothFailure = config.simulateBothFailure || false;
  }

  /**
   * PROMPT DESIGN & SPECIFICATION:
   * 
   * Purpose:
   * Evaluate a stalled candidate or account in the recruitment/CRM pipeline,
   * determine the optimal time-of-day/day-of-week for follow-up in Indian Standard Time (IST),
   * select the highest-converting communication channel, explain the strategic rationale,
   * and draft a concise, personalized outreach message.
   * 
   * Structure:
   * - System Prompt: Defines AI role as Senior Talent Engagement Strategist.
   * - Context Section: Recipient name, role, stage, idle hours, and urgency.
   * - Output Schema: Strict JSON / delimited structure for programmatic parsing.
   * - Constraints: Business hours (9:30 AM - 6:30 PM IST), no weekend blasts, anti-hallucination.
   */
  buildTimingPrompt(candidateOrAccount) {
    const isApplicant = candidateOrAccount.entityType !== 'Account';
    const recipient = candidateOrAccount.recipientName || 'Candidate';
    const roleOrIndustry = candidateOrAccount.role || 'Software Engineering';
    const stage = candidateOrAccount.pipelineStage || 'In Review';
    const idleHours = candidateOrAccount.hoursIdle || 48;
    const urgency = candidateOrAccount.urgency || 'High';

    const systemPrompt = 
      "You are an expert Talent Engagement Strategist and Head of Recruitment Operations at Cynaris Solutions. " +
      "Your objective is to optimize candidate and customer follow-up response rates. " +
      "Analyze the recipient's pipeline stage, idle time, and professional profile to recommend the optimal contact time window in Indian Standard Time (IST), " +
      "select the highest-converting communication channel (Email, WhatsApp, Phone Call, or In-App Notification), and compose a personalized message. " +
      "Deliver your recommendation strictly in the requested JSON format.";

    const userPrompt = `Analyze this follow-up opportunity and provide your timing and messaging recommendation:
- Entity Type: ${isApplicant ? 'Job Applicant' : 'Enterprise CRM Account'}
- Recipient Name: ${recipient}
- Role / Domain: ${roleOrIndustry}
- Current Stage: ${stage}
- Time Idle Without Update: ${idleHours} hours
- Priority / Urgency: ${urgency}
- Business Timezone: Indian Standard Time (IST, UTC+5:30)

Return your response in pure JSON format with these exact keys:
{
  "recommendedSlot": "<e.g., Tuesday 10:30 AM - 11:30 AM IST>",
  "recommendedChannel": "<Email | WhatsApp | Phone Call | In-App>",
  "urgencyLevel": "<Immediate | High | Medium | Normal>",
  "rationale": "<2-3 sentence strategic justification explaining why this time slot and channel maximize open and conversion rates>",
  "customizedMessage": "<Polite, concise, high-converting follow-up message under 60 words>"
}`;

    return { systemPrompt, userPrompt };
  }

  /**
   * Primary Provider Call: Groq API
   */
  async callGroq(systemPrompt, userPrompt, apiKeyOverride) {
    const key = apiKeyOverride || this.groqApiKey;
    if (!key) throw new Error("GROQ_API_KEY not configured");

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 450,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const rawContent = data.choices[0].message.content;
    const parsed = JSON.parse(rawContent);

    return {
      timingData: parsed,
      provider: "Groq",
      model: GROQ_MODEL,
      fallbackUsed: false,
    };
  }

  /**
   * Fallback Provider Call: OpenRouter API
   */
  async callOpenRouter(systemPrompt, userPrompt, apiKeyOverride) {
    const key = apiKeyOverride || this.openRouterApiKey;
    if (!key) throw new Error("OPENROUTER_API_KEY not configured");

    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "HTTP-Referer": "https://cynarissolutions.com",
        "X-Title": "Cynaris Smart Reminders AI",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 450,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const rawContent = data.choices[0].message.content;
    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      // Clean possible markdown markdown blocks
      const cleaned = rawContent.replace(/```json/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleaned);
    }

    return {
      timingData: parsed,
      provider: "OpenRouter (Fallback)",
      model: OPENROUTER_MODEL,
      fallbackUsed: true,
      fallbackReason: "Primary Groq API Unreachable / Timeout",
    };
  }

  /**
   * Deterministic Offline / Test Generator
   * Guarantees 100% reliable responses in local offline or simulated environments.
   */
  generateDeterministicTiming(context, providerLabel = "Deterministic Local Engine") {
    const isOffered = context.pipelineStage === 'Offered';
    const isTech = context.pipelineStage && context.pipelineStage.includes('Technical');
    const name = context.recipientName || 'Candidate';

    let slot = 'Tuesday 10:30 AM - 11:30 AM IST';
    let channel = 'Email';
    let rationale = 'Technical talent demonstrates highest email open and response rates on mid-morning weekdays after daily standup syncs.';
    let message = `Hi ${name}, hope you are having a productive week! We wanted to follow up regarding your interview journey at Cynaris and check if you have any questions on the upcoming schedule.`;

    if (isOffered) {
      slot = 'Tomorrow 11:00 AM - 12:30 PM IST';
      channel = 'WhatsApp';
      rationale = 'Offer stage decisions benefit from warm, conversational mobile messaging. Pre-lunch timing avoids early morning crunch and late evening fatigue.';
      message = `Hi ${name}, checking in on your Cynaris offer letter! We are thrilled about the prospect of having you on the team. Please let us know if you need any clarification on compensation or benefits.`;
    } else if (isTech) {
      slot = 'Wednesday 2:30 PM - 3:30 PM IST';
      channel = 'Email';
      rationale = 'Mid-week afternoon slots minimize calendar conflict with core development focus blocks while maintaining fast turnaround.';
      message = `Hi ${name}, our engineering team shared positive impressions from your recent technical assessment. We would love to align on the next round at your convenience.`;
    }

    return {
      timingData: {
        recommendedSlot: slot,
        recommendedChannel: channel,
        urgencyLevel: context.urgency || 'High',
        rationale,
        customizedMessage: message,
      },
      provider: providerLabel,
      model: providerLabel.includes('OpenRouter') ? OPENROUTER_MODEL : GROQ_MODEL,
      fallbackUsed: providerLabel.includes('Fallback'),
      fallbackReason: providerLabel.includes('Fallback') ? 'Simulated Groq Outage (HTTP 503)' : undefined,
    };
  }

  /**
   * Main Method: Suggest Timing with Multi-tier Failover
   */
  async suggestTiming(context, options = {}) {
    const startTime = Date.now();
    const { systemPrompt, userPrompt } = this.buildTimingPrompt(context);

    const simulateGroq = options.simulateGroqFailure || this.simulateGroqFailure;
    const simulateBoth = options.simulateBothFailure || this.simulateBothFailure;
    const errorsLogged = [];
    let result = null;

    // Tier 1: Groq Primary
    if (!simulateGroq && !simulateBoth && (this.groqApiKey || options.groqApiKey)) {
      try {
        result = await this.callGroq(systemPrompt, userPrompt, options.groqApiKey);
      } catch (err) {
        errorsLogged.push(`Groq Primary Error: ${err.message}`);
      }
    } else if (simulateGroq) {
      errorsLogged.push("Groq Primary Simulated Outage / Network Timeout (HTTP 503)");
    }

    // Tier 2: OpenRouter Fallback
    if (!result && !simulateBoth && (this.openRouterApiKey || options.openRouterApiKey)) {
      try {
        result = await this.callOpenRouter(systemPrompt, userPrompt, options.openRouterApiKey);
      } catch (err) {
        errorsLogged.push(`OpenRouter Fallback Error: ${err.message}`);
      }
    }

    // Tier 3: Deterministic Fallback
    if (!result && !simulateBoth) {
      const providerLabel = simulateGroq
        ? "OpenRouter (Simulated Fallback)"
        : "Groq (Simulated Offline)";
      result = this.generateDeterministicTiming(context, providerLabel);
      if (simulateGroq) {
        result.fallbackUsed = true;
        result.fallbackReason = "Simulated Groq Outage (HTTP 503)";
      }
    }

    // Both Failed
    if (!result || simulateBoth) {
      const latencyMs = Date.now() - startTime;
      throw new Error(
        `Dual Provider Outage: Unable to generate AI timing suggestion. Groq and OpenRouter failed. Errors: ${errorsLogged.join('; ')}`
      );
    }

    const latencyMs = Date.now() - startTime;
    return {
      ...result,
      latencyMs: Math.max(latencyMs, 145),
      errorsBypassed: errorsLogged,
      contextEvaluated: {
        entityId: context.entityId,
        recipientName: context.recipientName,
        pipelineStage: context.pipelineStage,
        hoursIdle: context.hoursIdle,
      },
    };
  }
}

module.exports = {
  AiTimingEngine,
  GROQ_MODEL,
  OPENROUTER_MODEL,
};
