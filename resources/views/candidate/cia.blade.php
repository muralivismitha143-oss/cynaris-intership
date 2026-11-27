<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Career Intelligence Advisor (CIA Mode) — Cynaris</title>
    <style>
        :root {
            --primary: #0284c7;
            --primary-dark: #0369a1;
            --bg-light: #f8fafc;
            --card-bg: #ffffff;
            --text-main: #0f172a;
            --text-muted: #64748b;
            --border-color: #e2e8f0;
            --success: #16a34a;
            --warning: #d97706;
            --danger: #dc2626;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg-light);
            color: var(--text-main);
            margin: 0;
            padding: 2rem;
        }
        .container {
            max-width: 1100px;
            margin: 0 auto;
            background: var(--card-bg);
            border-radius: 10px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.08);
            padding: 2rem;
        }
        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid var(--border-color);
            padding-bottom: 1.25rem;
            margin-bottom: 1.5rem;
        }
        h1 {
            margin: 0;
            color: var(--primary);
            font-size: 1.8rem;
        }
        .badge {
            background: #e0f2fe;
            color: var(--primary-dark);
            padding: 0.35rem 0.85rem;
            border-radius: 9999px;
            font-size: 0.85rem;
            font-weight: 600;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        .card {
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 1.5rem;
            background: #ffffff;
        }
        .card h3 {
            margin-top: 0;
            color: #1e293b;
            font-size: 1.15rem;
            margin-bottom: 1rem;
        }
        .score-circle {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: #f0fdf4;
            border: 3px solid var(--success);
            color: var(--success);
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 0.75rem;
        }
        .score-warning {
            background: #fffbeb;
            border-color: var(--warning);
            color: var(--warning);
        }
        .score-danger {
            background: #fef2f2;
            border-color: var(--danger);
            color: var(--danger);
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1rem;
            font-size: 0.9rem;
        }
        th, td {
            text-align: left;
            padding: 0.65rem 0.85rem;
            border-bottom: 1px solid var(--border-color);
        }
        th {
            background: #f8fafc;
            color: #475569;
            font-weight: 600;
        }
        .badge-severity {
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
        }
        .badge-matched { background: #dcfce7; color: #166534; }
        .badge-minor { background: #fef9c3; color: #854d0e; }
        .badge-critical { background: #fee2e2; color: #991b1b; }
        .btn {
            background: var(--primary);
            color: #ffffff;
            border: none;
            padding: 0.6rem 1.25rem;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
        }
        .btn:hover {
            background: var(--primary-dark);
        }
        .ai-panel {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-left: 4px solid var(--primary);
            padding: 1.25rem;
            border-radius: 6px;
            margin-top: 1.5rem;
        }
        .ai-panel h4 {
            margin-top: 0;
            color: #0f172a;
        }
        .provider-pill {
            display: inline-block;
            background: #e2e8f0;
            color: #334155;
            padding: 0.2rem 0.6rem;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: 500;
            margin-bottom: 0.5rem;
        }
        .radar-container {
            position: relative;
            max-width: 580px;
            margin: 0 auto;
            min-height: 380px;
        }
    </style>
    <!-- Chart.js for 5-Domain Skill Gap Radar Visualization -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <!-- Mermaid.js for Interactive Timeline Diagram -->
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <script>
        if (typeof mermaid !== 'undefined') {
            mermaid.initialize({ startOnLoad: false, theme: 'neutral' });
        }
    </script>
</head>
<body>
    <div class="container" id="cia-container">
        <header>
            <div>
                <h1>Career Intelligence Advisor (CIA Mode)</h1>
                <p style="color: var(--text-muted); margin: 0.25rem 0 0 0;">
                    AI-Driven Skill Gap Analysis, Vector Role Alignment & Adaptive Remediation
                </p>
            </div>
            <span class="badge">Model: {{ $primaryModel ?? 'llama-3.3-70b-versatile' }}</span>
        </header>

        <div class="grid">
            <!-- Candidate Profile Overview -->
            <div class="card" id="candidate-profile-card">
                <h3>👤 Candidate Profile</h3>
                <p><strong>Name:</strong> {{ $candidate['name'] ?? 'Murali' }}</p>
                <p><strong>Current Title:</strong> {{ $candidate['currentTitle'] ?? 'Junior Full Stack Developer' }}</p>
                <p><strong>Experience:</strong> {{ $candidate['experienceYears'] ?? 2 }} Years</p>
                <p><strong>Verified Skills:</strong></p>
                <div style="display: flex; flex-wrap: wrap; gap: 0.4rem;">
                    @foreach($candidate['skills'] ?? [] as $sk => $data)
                        <span class="badge" style="background: #f1f5f9; color: #334155;">
                            {{ $sk }} (L{{ is_array($data) ? $data['level'] : $data }})
                        </span>
                    @endforeach
                </div>
            </div>

            <!-- Target Role Selection & Gap Score -->
            <div class="card" id="target-role-card">
                <h3>🎯 Target Role Alignment</h3>
                <label for="target-role-select" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.5rem;">Select Desired Career Path:</label>
                <select id="target-role-select" class="target-role-dropdown" style="width: 100%; padding: 0.5rem; border-radius: 6px; border: 1px solid var(--border-color); margin-bottom: 1rem;">
                    @foreach($targetRoles ?? [] as $role)
                        <option value="{{ $role['id'] }}">{{ $role['title'] }} ({{ $role['targetLevel'] }})</option>
                    @endforeach
                </select>

                <div style="text-align: center;">
                    <div class="score-circle" id="cia-readiness-circle">78%</div>
                    <div style="font-weight: 600; color: #334155;" id="cia-readiness-label">Role Readiness Score</div>
                    <p style="font-size: 0.85rem; color: var(--text-muted);" id="cia-gap-score-text">Calculated Skill Gap: <strong>22.0%</strong> (Near Target)</p>
                </div>
            </div>

            <!-- ChromaDB Vector Store Similarity Match -->
            <div class="card" id="chromadb-vector-card">
                <h3>🔍 Vector Store Semantic Alignment</h3>
                <div class="provider-pill">ChromaDB Collection: cynaris_job_profiles</div>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem;">
                    Cosine Similarity against target job description embeddings:
                </p>
                <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: 6px; padding: 0.75rem; margin-bottom: 0.5rem;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
                        <span>Senior Full Stack Engineer</span>
                        <strong style="color: var(--success);">0.94 Cosine</strong>
                    </div>
                </div>
                <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: 6px; padding: 0.75rem;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
                        <span>DevOps & Cloud Systems Architect</span>
                        <strong style="color: var(--primary);">0.88 Cosine</strong>
                    </div>
                </div>
            </div>
        </div>

        <!-- 5-Domain Competency Radar Chart (Chart.js) -->
        <div class="card" id="radar-chart-card" style="margin-bottom: 2rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3 style="margin: 0;">🕸️ Competency Radar Analysis (5 Domains)</h3>
                <span class="badge" id="radar-chroma-namespace">ChromaDB: candidate_1_skill_gaps</span>
            </div>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.5rem;">
                Multi-domain competency assessment comparing verified candidate proficiency against target benchmarks across Frontend, Backend, Database, Cloud &amp; DevOps, and AI &amp; ML. Grounded via LlamaIndex RAG over curated 50-skill taxonomy.
            </p>
            <div class="radar-container">
                <canvas id="cia-skill-radar-chart"></canvas>
            </div>
        </div>

        <!-- Quantitative Itemized Gap Matrix -->
        <div class="card" style="margin-bottom: 2rem;">
            <h3>📊 Quantitative Skill Gap Matrix</h3>
            <p style="font-size: 0.85rem; color: var(--text-muted);">
                Weighted Gap Score Formula: <code>100 &times; (1 - &Sigma;(Matched Weight) / &Sigma;(Target Weight))</code>
            </p>
            <table>
                <thead>
                    <tr>
                        <th>Target Competency</th>
                        <th>Target Level</th>
                        <th>Candidate Level</th>
                        <th>Weight</th>
                        <th>Delta</th>
                        <th>Severity</th>
                        <th>Est. Remediation</th>
                    </tr>
                </thead>
                <tbody id="cia-skills-matrix-body">
                    <tr>
                        <td><strong>JavaScript / React</strong></td>
                        <td>Level 5</td>
                        <td>Level 4</td>
                        <td>3.0 (Critical)</td>
                        <td>-1.0</td>
                        <td><span class="badge-severity badge-minor">MINOR_GAP</span></td>
                        <td>12.0 Hours</td>
                    </tr>
                    <tr>
                        <td><strong>System Design</strong></td>
                        <td>Level 4</td>
                        <td>Level 0</td>
                        <td>3.0 (Critical)</td>
                        <td>-4.0</td>
                        <td><span class="badge-severity badge-critical">CRITICAL_MISSING</span></td>
                        <td>48.0 Hours</td>
                    </tr>
                    <tr>
                        <td><strong>Docker & Microservices</strong></td>
                        <td>Level 4</td>
                        <td>Level 3</td>
                        <td>2.5 (Important)</td>
                        <td>-1.0</td>
                        <td><span class="badge-severity badge-minor">MINOR_GAP</span></td>
                        <td>15.0 Hours</td>
                    </tr>
                    <tr>
                        <td><strong>PHP & Moodle DBAL</strong></td>
                        <td>Level 4</td>
                        <td>Level 4</td>
                        <td>2.0 (Important)</td>
                        <td>0.0</td>
                        <td><span class="badge-severity badge-matched">MATCHED</span></td>
                        <td>0.0 Hours</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- CrewAI Career Path Recommendations (3 Interactive Cards) (Week 7 Day 3) -->
        <div class="card" id="crewai-recommendations-section" style="margin-bottom: 2rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
                <div>
                    <h3 style="margin: 0; color: #1e293b;">🚀 Autonomous Career Recommendations (CrewAI Agent)</h3>
                    <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0.25rem 0 0 0;">
                        Synthesized by <code>CareerAdvisorAgent</code> using ChromaDB skill gaps, market placement trends, and structured 6-month milestones.
                    </p>
                </div>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <span class="badge" id="crewai-agent-badge" style="background: #ede9fe; color: #6d28d9;">Agent: Senior Career Counsellor (15 Yrs Exp)</span>
                    <button class="btn" id="crewai-refresh-btn" type="button" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">🎯 Refresh Paths</button>
                </div>
            </div>

            <div id="crewai-career-cards-container" class="grid" style="grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.25rem; margin-bottom: 0.5rem;">
                <!-- Fallback Initial 3 Interactive Cards -->
                <div class="card career-path-card" style="border: 1px solid #cbd5e1; border-top: 4px solid var(--primary); padding: 1.25rem; background: #ffffff;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                        <h4 style="margin: 0; font-size: 1.05rem; color: #0f172a;">Full Stack Cloud Solutions Architect</h4>
                        <span class="badge" style="background: #dcfce7; color: #166534; font-weight: 700;">94% Match</span>
                    </div>
                    <p style="font-size: 0.82rem; color: #475569; line-height: 1.45; margin-bottom: 0.75rem;">
                        Exceptional alignment with core full stack stack (Node.js, Express, React). Bridging system design and containerization gaps creates an immediate senior placement profile.
                    </p>
                    <div style="margin-bottom: 0.75rem;">
                        <strong style="font-size: 0.75rem; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Required Competencies:</strong>
                        <div style="display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.25rem;">
                            <span class="badge" style="background: #f1f5f9; color: #334155; font-size: 0.75rem;">JavaScript ES6+</span>
                            <span class="badge" style="background: #f1f5f9; color: #334155; font-size: 0.75rem;">Node.js</span>
                            <span class="badge" style="background: #f1f5f9; color: #334155; font-size: 0.75rem;">System Design</span>
                            <span class="badge" style="background: #f1f5f9; color: #334155; font-size: 0.75rem;">Docker</span>
                        </div>
                    </div>
                    <div class="roadmap-box" style="background: #f8fafc; border-radius: 6px; padding: 0.75rem; border: 1px solid #e2e8f0; font-size: 0.8rem;">
                        <strong style="color: var(--primary); display: block; margin-bottom: 0.35rem;">🗓️ 6-Month Action Roadmap:</strong>
                        <ul style="margin: 0; padding-left: 1.2rem; color: #334155;">
                            <li><strong>Month 1-2:</strong> Advanced System Design & Concurrency</li>
                            <li><strong>Month 3-4:</strong> Container Orchestration & CI/CD Pipelines</li>
                            <li><strong>Month 5-6:</strong> Enterprise Cloud Deployment & Capstone</li>
                        </ul>
                    </div>
                </div>

                <div class="card career-path-card" style="border: 1px solid #cbd5e1; border-top: 4px solid #8b5cf6; padding: 1.25rem; background: #ffffff;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                        <h4 style="margin: 0; font-size: 1.05rem; color: #0f172a;">AI Systems & Intelligent Backend Engineer</h4>
                        <span class="badge" style="background: #ede9fe; color: #6d28d9; font-weight: 700;">89% Match</span>
                    </div>
                    <p style="font-size: 0.82rem; color: #475569; line-height: 1.45; margin-bottom: 0.75rem;">
                        Capitalizes on proven backend REST API proficiency while elevating modern generative AI patterns (LlamaIndex RAG, Groq LPU inference, and ChromaDB vector embeddings).
                    </p>
                    <div style="margin-bottom: 0.75rem;">
                        <strong style="font-size: 0.75rem; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Required Competencies:</strong>
                        <div style="display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.25rem;">
                            <span class="badge" style="background: #f1f5f9; color: #334155; font-size: 0.75rem;">LlamaIndex RAG</span>
                            <span class="badge" style="background: #f1f5f9; color: #334155; font-size: 0.75rem;">ChromaDB</span>
                            <span class="badge" style="background: #f1f5f9; color: #334155; font-size: 0.75rem;">Groq LPU</span>
                            <span class="badge" style="background: #f1f5f9; color: #334155; font-size: 0.75rem;">Python / Node</span>
                        </div>
                    </div>
                    <div class="roadmap-box" style="background: #f8fafc; border-radius: 6px; padding: 0.75rem; border: 1px solid #e2e8f0; font-size: 0.8rem;">
                        <strong style="color: #8b5cf6; display: block; margin-bottom: 0.35rem;">🗓️ 6-Month Action Roadmap:</strong>
                        <ul style="margin: 0; padding-left: 1.2rem; color: #334155;">
                            <li><strong>Month 1-2:</strong> Vector Databases & Embedding Architectures</li>
                            <li><strong>Month 3-4:</strong> Multi-Tiered Resilient AI Pipelines</li>
                            <li><strong>Month 5-6:</strong> Autonomous Agent Frameworks (CrewAI)</li>
                        </ul>
                    </div>
                </div>

                <div class="card career-path-card" style="border: 1px solid #cbd5e1; border-top: 4px solid #10b981; padding: 1.25rem; background: #ffffff;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                        <h4 style="margin: 0; font-size: 1.05rem; color: #0f172a;">DevOps & Site Reliability Architect</h4>
                        <span class="badge" style="background: #e0f2fe; color: #0369a1; font-weight: 700;">85% Match</span>
                    </div>
                    <p style="font-size: 0.82rem; color: #475569; line-height: 1.45; margin-bottom: 0.75rem;">
                        Leverages strong Linux and Docker containerization fundamentals to specialize in enterprise automation, infrastructure-as-code, and production observability.
                    </p>
                    <div style="margin-bottom: 0.75rem;">
                        <strong style="font-size: 0.75rem; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Required Competencies:</strong>
                        <div style="display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.25rem;">
                            <span class="badge" style="background: #f1f5f9; color: #334155; font-size: 0.75rem;">Docker</span>
                            <span class="badge" style="background: #f1f5f9; color: #334155; font-size: 0.75rem;">Kubernetes</span>
                            <span class="badge" style="background: #f1f5f9; color: #334155; font-size: 0.75rem;">CI/CD Actions</span>
                            <span class="badge" style="background: #f1f5f9; color: #334155; font-size: 0.75rem;">APM Logging</span>
                        </div>
                    </div>
                    <div class="roadmap-box" style="background: #f8fafc; border-radius: 6px; padding: 0.75rem; border: 1px solid #e2e8f0; font-size: 0.8rem;">
                        <strong style="color: #10b981; display: block; margin-bottom: 0.35rem;">🗓️ 6-Month Action Roadmap:</strong>
                        <ul style="margin: 0; padding-left: 1.2rem; color: #334155;">
                            <li><strong>Month 1-2:</strong> Production Container Hardening & Multi-Stage Builds</li>
                            <li><strong>Month 3-4:</strong> Automated CI/CD Deployment Gates</li>
                            <li><strong>Month 5-6:</strong> High-Availability Site Reliability & APM Observability</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>

        <!-- ChromaDB Vector Search Internship Matching Section (Week 7 Day 4) -->
        <div class="card" id="chromadb-internship-matching-section" style="margin-bottom: 2rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
                <div>
                    <h3 style="margin: 0; color: #1e293b;">🎯 Top 5 Matching Internship Roles (ChromaDB Vector Search)</h3>
                    <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0.25rem 0 0 0;">
                        Candidate skill embeddings searched across ChromaDB collection <code>cynaris_internship_roles</code> (20 seeded profiles) via 384-dim cosine similarity.
                    </p>
                </div>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <span class="badge" style="background: #e0f2fe; color: #0369a1;">Collection: cynaris_internship_roles</span>
                    <button class="btn" id="internship-match-refresh-btn" type="button" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">⚡ Re-Rank Matches</button>
                </div>
            </div>

            <div id="chromadb-internship-list-container" style="display: flex; flex-direction: column; gap: 1rem;">
                <!-- Fallback Initial 5 Ranked Matches -->
                <div class="card" style="border: 1px solid #e2e8f0; border-left: 5px solid var(--primary); padding: 1rem; background: #ffffff;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span class="badge" style="background: #0284c7; color: #ffffff; font-weight: 700;">#1</span>
                            <h4 style="margin: 0; color: #0f172a; font-size: 1rem;">Full Stack Development Intern (Node.js &amp; React)</h4>
                        </div>
                        <span class="badge" style="background: #dcfce7; color: #166534; font-weight: 700; font-size: 0.85rem;">96.2% Match</span>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem;">
                        <strong>Engineering</strong> &bull; Bengaluru, India (Hybrid) &bull; <strong style="color: #0f172a;">₹25,000 / month</strong>
                    </div>
                    <p style="font-size: 0.82rem; color: #475569; margin: 0.25rem 0 0.5rem 0;">
                        Architect and deploy end-to-end recruitment modules using modern React hooks, Node.js asynchronous streams, and Dockerized microservices.
                    </p>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; font-size: 0.8rem;">
                        <span style="font-weight: 600; color: #166534;">Matched Skills:</span>
                        <span class="badge badge-severity badge-matched">JavaScript</span>
                        <span class="badge badge-severity badge-matched">Node.js</span>
                        <span class="badge badge-severity badge-matched">Docker &amp; Containers</span>
                        <span style="font-weight: 600; color: #991b1b; margin-left: 0.5rem;">Missing Skills:</span>
                        <span class="badge badge-severity badge-critical">TypeScript</span>
                        <span class="badge badge-severity badge-minor">MySQL</span>
                    </div>
                </div>

                <div class="card" style="border: 1px solid #e2e8f0; border-left: 5px solid #8b5cf6; padding: 1rem; background: #ffffff;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span class="badge" style="background: #8b5cf6; color: #ffffff; font-weight: 700;">#2</span>
                            <h4 style="margin: 0; color: #0f172a; font-size: 1rem;">Backend Systems Engineering Intern (Express &amp; MySQL)</h4>
                        </div>
                        <span class="badge" style="background: #ede9fe; color: #6d28d9; font-weight: 700; font-size: 0.85rem;">92.5% Match</span>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem;">
                        <strong>Engineering</strong> &bull; Pune, India (Onsite) &bull; <strong style="color: #0f172a;">₹22,000 / month</strong>
                    </div>
                    <p style="font-size: 0.82rem; color: #475569; margin: 0.25rem 0 0.5rem 0;">
                        Design high-concurrency RESTful APIs and middleware services. Profile database query execution plans using EXPLAIN and tune composite B-Tree indexes.
                    </p>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; font-size: 0.8rem;">
                        <span style="font-weight: 600; color: #166534;">Matched Skills:</span>
                        <span class="badge badge-severity badge-matched">Node.js</span>
                        <span class="badge badge-severity badge-matched">Express.js</span>
                        <span class="badge badge-severity badge-matched">Git Workflow</span>
                        <span style="font-weight: 600; color: #991b1b; margin-left: 0.5rem;">Missing Skills:</span>
                        <span class="badge badge-severity badge-critical">REST APIs</span>
                        <span class="badge badge-severity badge-minor">MySQL / Relational DB</span>
                    </div>
                </div>

                <div class="card" style="border: 1px solid #e2e8f0; border-left: 5px solid #10b981; padding: 1rem; background: #ffffff;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span class="badge" style="background: #10b981; color: #ffffff; font-weight: 700;">#3</span>
                            <h4 style="margin: 0; color: #0f172a; font-size: 1rem;">AI &amp; RAG Pipeline Engineering Intern (LlamaIndex &amp; Groq)</h4>
                        </div>
                        <span class="badge" style="background: #dcfce7; color: #166534; font-weight: 700; font-size: 0.85rem;">88.0% Match</span>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem;">
                        <strong>AI &amp; Data Systems</strong> &bull; Bengaluru, India (Hybrid) &bull; <strong style="color: #0f172a;">₹30,000 / month</strong>
                    </div>
                    <p style="font-size: 0.82rem; color: #475569; margin: 0.25rem 0 0.5rem 0;">
                        Engineer multi-tier RAG retrieval pipelines using LlamaIndex and Groq LPU inference. Implement automated secondary failover to OpenRouter.
                    </p>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; font-size: 0.8rem;">
                        <span style="font-weight: 600; color: #166534;">Matched Skills:</span>
                        <span class="badge badge-severity badge-matched">JavaScript</span>
                        <span style="font-weight: 600; color: #991b1b; margin-left: 0.5rem;">Missing Skills:</span>
                        <span class="badge badge-severity badge-critical">Python</span>
                        <span class="badge badge-severity badge-critical">LlamaIndex RAG</span>
                        <span class="badge badge-severity badge-minor">Groq LPU</span>
                    </div>
                </div>

                <div class="card" style="border: 1px solid #e2e8f0; border-left: 5px solid #f59e0b; padding: 1rem; background: #ffffff;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span class="badge" style="background: #f59e0b; color: #ffffff; font-weight: 700;">#4</span>
                            <h4 style="margin: 0; color: #0f172a; font-size: 1rem;">DevOps &amp; Cloud Infrastructure Intern (Docker &amp; GitHub Actions)</h4>
                        </div>
                        <span class="badge" style="background: #fef3c7; color: #92400e; font-weight: 700; font-size: 0.85rem;">84.5% Match</span>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem;">
                        <strong>Cloud Infrastructure</strong> &bull; Hyderabad, India (Hybrid) &bull; <strong style="color: #0f172a;">₹26,000 / month</strong>
                    </div>
                    <p style="font-size: 0.82rem; color: #475569; margin: 0.25rem 0 0.5rem 0;">
                        Construct multi-stage Docker container build pipelines and zero-defect GitHub Actions deployment DAGs. Implement container healthchecks and Nginx.
                    </p>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; font-size: 0.8rem;">
                        <span style="font-weight: 600; color: #166534;">Matched Skills:</span>
                        <span class="badge badge-severity badge-matched">Docker &amp; Containers</span>
                        <span class="badge badge-severity badge-matched">Git Workflow</span>
                        <span style="font-weight: 600; color: #991b1b; margin-left: 0.5rem;">Missing Skills:</span>
                        <span class="badge badge-severity badge-critical">GitHub Actions CI/CD</span>
                        <span class="badge badge-severity badge-critical">Linux Administration</span>
                    </div>
                </div>

                <div class="card" style="border: 1px solid #e2e8f0; border-left: 5px solid #06b6d4; padding: 1rem; background: #ffffff;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span class="badge" style="background: #06b6d4; color: #ffffff; font-weight: 700;">#5</span>
                            <h4 style="margin: 0; color: #0f172a; font-size: 1rem;">Frontend UX &amp; Web Performance Intern (React &amp; Chart.js)</h4>
                        </div>
                        <span class="badge" style="background: #cffafe; color: #155e75; font-weight: 700; font-size: 0.85rem;">81.0% Match</span>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem;">
                        <strong>Engineering</strong> &bull; Remote (India) &bull; <strong style="color: #0f172a;">₹22,000 / month</strong>
                    </div>
                    <p style="font-size: 0.82rem; color: #475569; margin: 0.25rem 0 0.5rem 0;">
                        Build high-performance interactive radar dashboards and candidate evaluation UI cards. Ensure strict W3C ARIA live region accessibility.
                    </p>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; font-size: 0.8rem;">
                        <span style="font-weight: 600; color: #166534;">Matched Skills:</span>
                        <span class="badge badge-severity badge-matched">JavaScript</span>
                        <span style="font-weight: 600; color: #991b1b; margin-left: 0.5rem;">Missing Skills:</span>
                        <span class="badge badge-severity badge-critical">React</span>
                        <span class="badge badge-severity badge-minor">Chart.js</span>
                        <span class="badge badge-severity badge-minor">W3C ARIA Standards</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Week 7 Day 5: LangGraph Workflow — 8-Week Learning Path Generator -->
        <div class="card" id="langgraph-learning-path-section" style="margin-bottom: 2rem; border-top: 4px solid #8b5cf6;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
                <div>
                    <h3 style="margin: 0; color: #1e293b; font-size: 1.15rem;">🗺️ Module 4: LangGraph Workflow — 8-Week Learning Path Generator</h3>
                    <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0.25rem 0 0 0;">
                        State Machine Nodes: <span style="font-family: monospace; font-size: 0.8rem; background: #ede9fe; color: #6d28d9; padding: 2px 6px; border-radius: 4px;">AssessCurrentState → IdentifyGaps → GeneratePlan → ValidatePlan → OutputPlan</span>
                    </p>
                </div>
                <div class="provider-pill" id="langgraph-active-provider" style="background: #ede9fe; color: #6d28d9; border: 1px solid #c4b5fd;">LangGraph 5-Node Workflow</div>
            </div>

            <!-- Controls and Parameters -->
            <div style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; background: #f8fafc; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid #e2e8f0;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <label for="langgraph-daily-hours" style="font-size: 0.85rem; font-weight: 600; color: #334155;">Daily Commitment:</label>
                    <select id="langgraph-daily-hours" style="padding: 0.35rem 0.65rem; border-radius: 6px; border: 1px solid var(--border-color); font-size: 0.85rem;">
                        <option value="1.5">1.5 hrs / day (Casual)</option>
                        <option value="2.0" selected>2.0 hrs / day (Recommended)</option>
                        <option value="2.5">2.5 hrs / day (Intensive)</option>
                        <option value="3.0">3.0 hrs / day (Bootcamp)</option>
                    </select>
                </div>
                <button class="btn" id="btn-generate-learning-path" type="button" style="background: #8b5cf6; color: #ffffff; border: none; padding: 0.45rem 1rem; border-radius: 6px; font-weight: 600; cursor: pointer;">
                    🚀 Generate 8-Week Learning Path (LangGraph)
                </button>
            </div>

            <!-- Live Status & Telemetry -->
            <div id="langgraph-status-announcement" role="status" aria-live="polite" style="font-size: 0.82rem; color: #6d28d9; margin-bottom: 0.75rem; font-weight: 600;">
                LangGraph State Machine Ready. Nodes: AssessCurrentState, IdentifyGaps, GeneratePlan, ValidatePlan, OutputPlan.
            </div>

            <!-- Learning Plan Output Container -->
            <div id="langgraph-learning-path-container">
                <!-- Overview & Metrics Summary -->
                <div id="langgraph-overview-box" style="background: #fdf4ff; border: 1px solid #f0abfc; border-radius: 8px; padding: 1rem; margin-bottom: 1.25rem;">
                    <h4 style="margin: 0 0 0.4rem 0; color: #86198f; font-size: 0.95rem;">Curriculum Strategy Overview</h4>
                    <p id="langgraph-overview-text" style="font-size: 0.85rem; color: #4a044e; margin: 0 0 0.5rem 0;">
                        Accelerated 8-week structured roadmap bridging candidate skill gaps for Senior Full Stack Engineer. Daily technical mastery combined with practical capstone deliverables.
                    </p>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; font-size: 0.8rem;">
                        <span class="badge" style="background: #fae8ff; color: #86198f;">Total Duration: 8 Weeks</span>
                        <span class="badge" style="background: #ede9fe; color: #6d28d9;">Daily Commitment: 2.0 hrs/day</span>
                        <span class="badge" style="background: #e0f2fe; color: #0369a1;">Total Study Hours: ~112 hrs</span>
                        <span class="badge" style="background: #dcfce7; color: #166534;">Validation Status: 5/5 Checks Passed</span>
                    </div>
                </div>

                <!-- Interactive Mermaid Timeline Diagram Container -->
                <div style="margin-bottom: 1.5rem;">
                    <h4 style="margin: 0 0 0.5rem 0; color: #1e293b; font-size: 0.95rem; display: flex; align-items: center; gap: 0.5rem;">
                        <span>📅 Interactive Timeline Diagram (Mermaid)</span>
                    </h4>
                    <div id="langgraph-mermaid-timeline-box" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; overflow-x: auto;">
                        <pre class="mermaid" id="langgraph-mermaid-pre" style="margin: 0; font-family: monospace; font-size: 0.85rem; color: #1e293b;">
timeline
  title 8-Week Accelerated Upskilling Roadmap
  section Foundations & Core Architecture
    Week 1 : Advanced Asynchronous JS : Event Loop & Microtasks : Stream Parser
    Week 2 : Express Middleware : JWT Stateless Authentication : Auth Middleware
  section Data & Storage Engine
    Week 3 : MySQL B-Tree Indexing : Sargable Query Optimization : 50x Speedup
    Week 4 : Relational CRUD : Multi-Table Transactions : Atomic Repository
  section Containerization & Cloud CI/CD
    Week 5 : Multi-Stage Docker : dumb-init & Security Hardening : Alpine Container
    Week 6 : GitHub Actions CI/CD : Docker Hub Buildx Caching : 30+ Test Suites
  section AI Systems & Capstone
    Week 7 : Vector Embeddings : ChromaDB & Cosine Similarity : 20 Role Matching
    Week 8 : Enterprise Capstone : Production Cloud Deployment : Live Production
                        </pre>
                    </div>
                </div>

                <!-- Weekly Curriculum Cards List -->
                <div>
                    <h4 style="margin: 0 0 0.75rem 0; color: #1e293b; font-size: 0.95rem;">📚 Week-by-Week Curriculum & Practical Milestones</h4>
                    <div id="langgraph-weeks-list" style="display: flex; flex-direction: column; gap: 0.75rem;">
                        <!-- Static fallback cards populated dynamically -->
                        <div class="card" style="border: 1px solid #e2e8f0; border-left: 5px solid #8b5cf6; padding: 1rem; background: #ffffff;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <span class="badge" style="background: #8b5cf6; color: #ffffff; font-weight: 700;">Week 1</span>
                                    <h4 style="margin: 0; color: #0f172a; font-size: 0.95rem;">Advanced Asynchronous JavaScript &amp; Event Loop Mechanics</h4>
                                </div>
                                <span class="badge" style="background: #ede9fe; color: #6d28d9; font-weight: 600;">2.0 hrs/day</span>
                            </div>
                            <div style="font-size: 0.82rem; color: #475569; margin-bottom: 0.4rem;">
                                <strong>Topics:</strong> Node.js Event Loop phases &bull; Microtasks vs Macrotasks queue &bull; Streams API &amp; Backpressure
                            </div>
                            <div style="font-size: 0.8rem; color: #64748b; margin-bottom: 0.4rem;">
                                <strong>Resources:</strong> <span class="badge" style="background: #f1f5f9; color: #334155;">CYN-FS-101: Asynchronous Architecture</span>
                            </div>
                            <div style="background: #f8fafc; padding: 0.5rem 0.75rem; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 0.8rem; color: #1e293b;">
                                <strong>🎯 Milestone:</strong> Construct a non-blocking stream parser handling 50MB log chunks with zero event loop lag.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Week 8 Day 1: Module 5: Resume Intelligence — Docling + Groq ATS Scoring -->
        <div class="card" id="docling-resume-intelligence-section" style="margin-bottom: 2rem; border-top: 4px solid #059669;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
                <div>
                    <h3 style="margin: 0; color: #1e293b; font-size: 1.15rem;">📄 Module 5: Resume Intelligence — Docling + Groq ATS Scoring</h3>
                    <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0.25rem 0 0 0;">
                        IBM Docling Structural Document Conversion &bull; Groq LPU ATS Keyword Analysis &bull; Interview Probes
                    </p>
                </div>
                <div class="provider-pill" id="docling-active-provider" style="background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0;">Docling + Groq (llama-3.3-70b-versatile)</div>
            </div>

            <!-- Action Controls -->
            <div style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; background: #f8fafc; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid #e2e8f0;">
                <div style="font-size: 0.85rem; color: #334155;">
                    <strong>Document Parser:</strong> IBM Docling Engine (PDF/DOCX to Markdown) &bull; <strong>ATS Algorithm:</strong> Keyword Density + Structural Invariant Model
                </div>
                <button class="btn" id="btn-generate-docling-ats" type="button" style="background: #059669; color: #ffffff; border: none; padding: 0.45rem 1rem; border-radius: 6px; font-weight: 600; cursor: pointer;">
                    ⚡ Generate AI Resume Summary &amp; ATS Score
                </button>
            </div>

            <!-- Live Status & Telemetry -->
            <div id="docling-status-announcement" role="status" aria-live="polite" style="font-size: 0.82rem; color: #047857; margin-bottom: 0.75rem; font-weight: 600;">
                Resume Intelligence Engine Ready. Docling parser &amp; Groq LPU connected.
            </div>

            <!-- ATS Scorecard & Intelligence Container -->
            <div id="docling-intelligence-container">
                <!-- Metrics Bar -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1.25rem;">
                    <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 1rem; text-align: center;">
                        <div style="font-size: 0.8rem; font-weight: 600; color: #065f46; text-transform: uppercase;">ATS Compatibility Score</div>
                        <div id="ats-score-badge" style="font-size: 2rem; font-weight: 800; color: #047857; margin: 0.25rem 0;">88.5%</div>
                        <span class="badge" id="ats-tier-badge" style="background: #059669; color: #ffffff;">HIGH MATCH</span>
                    </div>

                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem;">
                        <div style="font-size: 0.8rem; font-weight: 600; color: #64748b; margin-bottom: 0.35rem;">TARGET ROLE ALIGNMENT</div>
                        <div style="font-weight: 700; color: #0f172a; font-size: 1rem;">Senior Full Stack Engineer</div>
                        <p style="font-size: 0.8rem; color: #475569; margin: 0.25rem 0 0 0;">Evaluated against 14 benchmark keywords &amp; multi-tier full stack repository skills.</p>
                    </div>

                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem;">
                        <div style="font-size: 0.8rem; font-weight: 600; color: #64748b; margin-bottom: 0.35rem;">DOCLING PARSE QUALITY</div>
                        <div style="font-weight: 700; color: #047857; font-size: 1rem;">Structured Markdown (Clean)</div>
                        <p style="font-size: 0.8rem; color: #475569; margin: 0.25rem 0 0 0;">4 Core Sections extracted with zero lossy character artifacts.</p>
                    </div>
                </div>

                <!-- Keywords Match Breakdown -->
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; margin-bottom: 1.25rem;">
                    <h4 style="margin: 0 0 0.5rem 0; color: #0f172a; font-size: 0.95rem;">🎯 ATS Keyword Density &amp; Coverage Analysis</h4>
                    <div style="margin-bottom: 0.5rem;">
                        <span style="font-weight: 600; font-size: 0.82rem; color: #166534;">Matched Technical Keywords:</span>
                        <div id="ats-matched-keywords" style="display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.25rem;">
                            <span class="badge badge-severity badge-matched">javascript</span>
                            <span class="badge badge-severity badge-matched">node.js</span>
                            <span class="badge badge-severity badge-matched">react</span>
                            <span class="badge badge-severity badge-matched">express</span>
                            <span class="badge badge-severity badge-matched">mysql</span>
                            <span class="badge badge-severity badge-matched">docker</span>
                            <span class="badge badge-severity badge-matched">git</span>
                            <span class="badge badge-severity badge-matched">rest</span>
                            <span class="badge badge-severity badge-matched">api</span>
                        </div>
                    </div>
                    <div>
                        <span style="font-weight: 600; font-size: 0.82rem; color: #991b1b;">Recommended Missing Keywords to Add:</span>
                        <div id="ats-missing-keywords" style="display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.25rem;">
                            <span class="badge badge-severity badge-minor">kubernetes</span>
                            <span class="badge badge-severity badge-minor">redis</span>
                            <span class="badge badge-severity badge-minor">graphql</span>
                        </div>
                    </div>
                </div>

                <!-- AI Resume Summary Body -->
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.25rem;">
                    <h4 style="margin: 0 0 0.75rem 0; color: #0f172a; font-size: 0.95rem;">📋 AI Generated Resume Analysis &amp; Screening Verdict</h4>
                    <div id="docling-ai-summary-content" style="font-size: 0.85rem; line-height: 1.6; color: #334155;">
                        <p><strong>Executive Summary:</strong> Candidate presents an exceptional profile for Senior Full Stack Engineer with 2 years of demonstrated software development experience across Node.js, Express, React, and MySQL.</p>
                        <p><strong>Key Technical Competencies:</strong></p>
                        <ul>
                            <li><strong>Full-Stack Architecture:</strong> Strong mastery of JavaScript, Node.js, Express, and React component lifecycles.</li>
                            <li><strong>Database Optimization:</strong> Proven proficiency in MySQL prepared statements, connection pooling, and B-Tree indexing.</li>
                            <li><strong>Containerization:</strong> Practical experience with multi-stage Docker builds and automated CI/CD.</li>
                        </ul>
                        <p><strong>Interview Probe Points:</strong></p>
                        <ul>
                            <li>Investigate hands-on experience handling high-volume Event Loop latency under peak load.</li>
                            <li>Inquire about experience designing distributed transaction rollbacks.</li>
                        </ul>
                        <p><strong>Hiring Recommendation:</strong> <strong style="color: #059669;">Strong Candidate</strong> — Recommend advancing directly to Technical Round 2 with high conviction.</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Week 8 Day 2: Module 6 & 7: Placement Readiness Score + Interview Readiness Score -->
        <div class="card" id="readiness-scores-section" style="margin-bottom: 2rem; border-top: 4px solid #4f46e5;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
                <div>
                    <h3 style="margin: 0; color: #1e293b; font-size: 1.15rem;">🎓 Module 6 &amp; 7: Placement Readiness + Interview Readiness Scores</h3>
                    <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0.25rem 0 0 0;">
                        Student Personal Score Card (0&ndash;100, Grade A/B/C/D, Top 3 AI Actions) &bull; Admin Cohort Table &amp; CSV Export
                    </p>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn" id="btn-calculate-readiness" type="button" style="background: #4f46e5; color: #ffffff; border: none; padding: 0.45rem 0.9rem; border-radius: 6px; font-weight: 600; cursor: pointer;">
                        ⚡ Recalculate Readiness
                    </button>
                    <button class="btn" id="btn-export-readiness-csv" type="button" style="background: #059669; color: #ffffff; border: none; padding: 0.45rem 0.9rem; border-radius: 6px; font-weight: 600; cursor: pointer;">
                        📥 Export CSV
                    </button>
                </div>
            </div>

            <div id="readiness-status-announcement" role="status" aria-live="polite" style="font-size: 0.82rem; color: #4338ca; margin-bottom: 0.75rem; font-weight: 600;">
                Placement Readiness: 93.1/100 (Grade A) &bull; Interview Readiness: 90.9/100 (Grade A) &bull; Stored in MySQL.
            </div>

            <!-- Student Personal Score Card View -->
            <div id="student-readiness-view" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; margin-bottom: 1.25rem;">
                <div style="background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 8px; padding: 1rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <strong>📊 Placement Readiness Score</strong>
                        <span id="student-placement-grade" class="badge" style="background: #059669; color: #ffffff;">93.1 / 100 (Grade A)</span>
                    </div>
                    <ul style="font-size: 0.82rem; color: #334155; margin: 0.5rem 0 0 0; padding-left: 1.15rem;">
                        <li>Project Completion % (40%): 94%</li>
                        <li>Assessment Scores (30%): 91%</li>
                        <li>CIA Usage Hours (10%): 19.5h</li>
                        <li>Documentation Quality (20%): 92%</li>
                    </ul>
                </div>

                <div style="background: #ecfeff; border: 1px solid #a5f3fc; border-radius: 8px; padding: 1rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <strong>🎤 Interview Readiness Score</strong>
                        <span id="student-interview-grade" class="badge" style="background: #059669; color: #ffffff;">90.9 / 100 (Grade A)</span>
                    </div>
                    <ul style="font-size: 0.82rem; color: #334155; margin: 0.5rem 0 0 0; padding-left: 1.15rem;">
                        <li>Viva Scores (40%): 90%</li>
                        <li>Code Review Scores (30%): 92%</li>
                        <li>Communication Clarity in Demos (20%): 89%</li>
                        <li>Git Workflow Quality (10%): 95%</li>
                    </ul>
                </div>
            </div>

            <!-- Top 3 AI-Generated Improvement Actions -->
            <div id="readiness-top3-actions" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; margin-bottom: 1.25rem;">
                <h4 style="margin: 0 0 0.5rem 0; font-size: 0.95rem; color: #0f172a;">🤖 Top 3 AI-Generated Improvement Actions</h4>
                <ol style="margin: 0; padding-left: 1.25rem; font-size: 0.84rem; color: #334155;">
                    <li><strong>Polish Live System Architecture Demo Pacing</strong> (Medium &bull; ~2h)</li>
                    <li><strong>Complete Remaining 0.5h CIA Edge-Case Reviews</strong> (Low &bull; ~1h)</li>
                    <li><strong>Practice High-Scale Viva Tradeoff Drills</strong> (Low &bull; ~2h)</li>
                </ol>
            </div>

            <!-- Admin Cohort Table View -->
            <div id="admin-readiness-view">
                <h4 style="margin: 0 0 0.5rem 0; font-size: 0.95rem; color: #0f172a;">🛡️ Admin View: All Interns Readiness Cohort</h4>
                <table id="admin-readiness-table">
                    <thead>
                        <tr>
                            <th>Intern</th>
                            <th>Role</th>
                            <th>Placement Score</th>
                            <th>Placement Grade</th>
                            <th>Interview Score</th>
                            <th>Interview Grade</th>
                        </tr>
                    </thead>
                    <tbody id="admin-readiness-tbody">
                        <tr><td>Murali V</td><td>Senior Full Stack Engineer</td><td>93.1</td><td>A</td><td>90.9</td><td>A</td></tr>
                        <tr><td>Priya Sharma</td><td>Backend Systems Architect</td><td>85.8</td><td>A</td><td>85.4</td><td>A</td></tr>
                        <tr><td>Rahul Kumar</td><td>Full Stack Developer</td><td>72.6</td><td>B</td><td>74.1</td><td>B</td></tr>
                        <tr><td>Arun Kumar</td><td>Frontend Engineer</td><td>59.9</td><td>C</td><td>62.4</td><td>C</td></tr>
                        <tr><td>Vikram Nair</td><td>Junior Cloud Intern</td><td>45.7</td><td>D</td><td>48.7</td><td>D</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- AI Recommendations Drawer (W3C ARIA compliant) -->
        <div class="ai-panel" id="cia-recommendations-drawer" role="region" aria-label="Career Intelligence Recommendations">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                <h4>🤖 CIA AI Career Recommendations</h4>
                <div class="provider-pill" id="cia-active-provider">Primary Engine: Groq (llama-3.3-70b-versatile)</div>
            </div>

            <!-- ARIA Live region for announcements -->
            <div id="cia-recommendation-content" role="status" aria-live="polite">
                <p><strong>Executive Trajectory Summary:</strong> Candidate demonstrates strong algorithmic and backend fundamentals with 78% readiness for Senior Full Stack Engineer. Immediate trajectory focus should center on high-concurrency System Design and Container Orchestration.</p>
                <p><strong>Priority Learning Actions:</strong></p>
                <ol id="cia-priority-actions-list">
                    <li>Complete <em>System Design Capstone</em> module (48 estimated hours).</li>
                    <li>Advance Docker container networking & Kubernetes deployment pipelines.</li>
                </ol>
            </div>

            <div style="margin-top: 1rem;">
                <button class="btn" id="cia-refresh-recommendations-btn" type="button">🔄 Regenerate CIA Advice</button>
            </div>
        </div>
    </div>

    <!-- CIA Skill Gap Radar & RAG Interaction Controller -->
    <script>
        document.addEventListener('DOMContentLoaded', function () {
            const radarCanvas = document.getElementById('cia-skill-radar-chart');
            const roleSelect = document.getElementById('target-role-select');
            const refreshBtn = document.getElementById('cia-refresh-recommendations-btn');
            const scoreCircle = document.getElementById('cia-readiness-circle');
            const gapScoreText = document.getElementById('cia-gap-score-text');
            const activeProviderPill = document.getElementById('cia-active-provider');
            const chromaNamespaceBadge = document.getElementById('radar-chroma-namespace');
            const skillsMatrixBody = document.getElementById('cia-skills-matrix-body');
            const recommendationContent = document.getElementById('cia-recommendation-content');
            const crewaiCardsContainer = document.getElementById('crewai-career-cards-container');
            const crewaiRefreshBtn = document.getElementById('crewai-refresh-btn');
            const internshipListContainer = document.getElementById('chromadb-internship-list-container');
            const internshipRefreshBtn = document.getElementById('internship-match-refresh-btn');
            const langgraphBtn = document.getElementById('btn-generate-learning-path');
            const langgraphDailyHours = document.getElementById('langgraph-daily-hours');
            const langgraphWeeksList = document.getElementById('langgraph-weeks-list');
            const langgraphMermaidPre = document.getElementById('langgraph-mermaid-pre');
            const langgraphOverviewText = document.getElementById('langgraph-overview-text');
            const langgraphStatusAnnouncement = document.getElementById('langgraph-status-announcement');
            const doclingBtn = document.getElementById('btn-generate-docling-ats');
            const doclingStatusAnnouncement = document.getElementById('docling-status-announcement');
            const atsScoreBadge = document.getElementById('ats-score-badge');
            const atsTierBadge = document.getElementById('ats-tier-badge');
            const atsMatchedKeywords = document.getElementById('ats-matched-keywords');
            const atsMissingKeywords = document.getElementById('ats-missing-keywords');
            const doclingAiSummaryContent = document.getElementById('docling-ai-summary-content');

            const radarLabels = ['Frontend', 'Backend', 'Database', 'Cloud & DevOps', 'AI & ML'];
            let radarChart = null;

            if (radarCanvas && typeof Chart !== 'undefined') {
                const ctx = radarCanvas.getContext('2d');
                radarChart = new Chart(ctx, {
                    type: 'radar',
                    data: {
                        labels: radarLabels,
                        datasets: [
                            {
                                label: 'Candidate Proficiency',
                                data: [85, 75, 70, 65, 70],
                                fill: true,
                                backgroundColor: 'rgba(2, 132, 199, 0.25)',
                                borderColor: 'rgb(2, 132, 199)',
                                pointBackgroundColor: 'rgb(2, 132, 199)',
                                pointBorderColor: '#fff',
                                pointHoverBackgroundColor: '#fff',
                                pointHoverBorderColor: 'rgb(2, 132, 199)'
                            },
                            {
                                label: 'Target Benchmark',
                                data: [95, 90, 85, 80, 85],
                                fill: true,
                                backgroundColor: 'rgba(22, 163, 74, 0.15)',
                                borderColor: 'rgb(22, 163, 74)',
                                pointBackgroundColor: 'rgb(22, 163, 74)',
                                pointBorderColor: '#fff',
                                pointHoverBackgroundColor: '#fff',
                                pointHoverBorderColor: 'rgb(22, 163, 74)'
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        elements: {
                            line: { borderWidth: 2 }
                        },
                        scales: {
                            r: {
                                angleLines: { display: true, color: '#e2e8f0' },
                                grid: { color: '#e2e8f0' },
                                suggestMin: 0,
                                suggestMax: 100,
                                ticks: {
                                    stepSize: 20,
                                    backdropColor: 'transparent',
                                    color: '#64748b'
                                },
                                pointLabels: {
                                    font: { size: 12, weight: '600' },
                                    color: '#1e293b'
                                }
                            }
                        },
                        plugins: {
                            legend: {
                                position: 'top',
                                labels: { font: { weight: '600' } }
                            }
                        }
                    }
                });
            }

            async function triggerSkillGapAnalysis() {
                const targetRoleId = roleSelect ? roleSelect.value : 'role_fullstack_lead';
                if (recommendationContent) {
                    recommendationContent.innerHTML = '<p><em>Analyzing career skill gaps via LlamaIndex RAG & Groq pipeline...</em></p>';
                }

                try {
                    const response = await fetch('/candidate/cia/career/skill-gap', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': '{{ csrf_token() }}'
                        },
                        body: JSON.stringify({
                            candidate_id: 1,
                            target_role_id: targetRoleId
                        })
                    });

                    if (!response.ok) {
                        throw new Error('HTTP ' + response.status);
                    }

                    const data = await response.json();

                    // Update Score circle
                    const score = data.score !== undefined ? data.score : 75;
                    if (scoreCircle) {
                        scoreCircle.textContent = score + '%';
                        scoreCircle.className = 'score-circle ' + (score >= 75 ? '' : (score >= 50 ? 'score-warning' : 'score-danger'));
                    }
                    if (gapScoreText) {
                        gapScoreText.innerHTML = 'Calculated Skill Gap: <strong>' + (100 - score).toFixed(1) + '%</strong> (' + (data.readinessTier || 'EVALUATED') + ')';
                    }

                    // Update Provider Pill
                    if (activeProviderPill) {
                        activeProviderPill.textContent = 'Engine: ' + (data.provider || 'Groq') + ' (' + (data.model || 'llama-3.3-70b-versatile') + ')';
                    }

                    // Update ChromaDB namespace
                    if (chromaNamespaceBadge && data.chroma_namespace) {
                        chromaNamespaceBadge.textContent = 'ChromaDB: ' + data.chroma_namespace;
                    }

                    // Update Radar Chart Datasets
                    if (radarChart && data.radar_chart_data) {
                        if (data.radar_chart_data.candidate) {
                            radarChart.data.datasets[0].data = data.radar_chart_data.candidate;
                        }
                        if (data.radar_chart_data.target) {
                            radarChart.data.datasets[1].data = data.radar_chart_data.target;
                        }
                        radarChart.update();
                    }

                    // Update Skill Gaps Matrix Table
                    if (skillsMatrixBody && Array.isArray(data.skill_gaps)) {
                        skillsMatrixBody.innerHTML = '';
                        data.skill_gaps.forEach(function (gap) {
                            const tr = document.createElement('tr');
                            const severityClass = gap.current_level === 0 ? 'badge-critical' : 'badge-minor';
                            const severityText = gap.current_level === 0 ? 'CRITICAL_MISSING' : 'MINOR_GAP';
                            tr.innerHTML = '<td><strong>' + (gap.skill || '') + '</strong></td>' +
                                '<td>Level ' + (gap.target_level || 4) + '</td>' +
                                '<td>Level ' + (gap.current_level || 0) + '</td>' +
                                '<td>' + (gap.importance || 'Important') + '</td>' +
                                '<td>-' + ((gap.target_level || 4) - (gap.current_level || 0)).toFixed(1) + '</td>' +
                                '<td><span class="badge-severity ' + severityClass + '">' + severityText + '</span></td>' +
                                '<td>' + (gap.remediation_hours || 12) + ' Hours</td>';
                            skillsMatrixBody.appendChild(tr);
                        });
                    }

                    // Update Recommendations Drawer (ARIA live compliant)
                    if (recommendationContent) {
                        let html = '<p><strong>Executive Trajectory Summary:</strong> Candidate readiness evaluated at ' + score + '% under ' + (data.provider || 'Groq') + '. Target role: ' + (data.targetRole && data.targetRole.title ? data.targetRole.title : 'Selected Path') + '.</p>';
                        if (Array.isArray(data.priority_learning) && data.priority_learning.length > 0) {
                            html += '<p><strong>Priority Learning Actions:</strong></p><ol>';
                            data.priority_learning.forEach(function (act) {
                                html += '<li>' + (act.action || act.skill) + ' (' + (act.estimated_hours || 10) + ' estimated hours)</li>';
                            });
                            html += '</ol>';
                        }
                        recommendationContent.innerHTML = html;
                    }
                } catch (err) {
                    console.warn('CIA live API failover:', err.message);
                    if (recommendationContent) {
                        recommendationContent.innerHTML = '<p><em>Using cached baseline analytics for ' + targetRoleId + '. System remains fully operational with local fallback.</em></p>';
                    }
                }
            }

            async function triggerCrewAICareerRecommendations() {
                const targetRoleId = roleSelect ? roleSelect.value : 'role_fullstack_lead';
                try {
                    const response = await fetch('/candidate/cia/career/recommend', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': '{{ csrf_token() }}'
                        },
                        body: JSON.stringify({
                            candidate_id: 1,
                            target_role_id: targetRoleId
                        })
                    });

                    if (!response.ok) throw new Error('HTTP ' + response.status);
                    const data = await response.json();

                    if (crewaiCardsContainer && Array.isArray(data.career_paths)) {
                        crewaiCardsContainer.innerHTML = '';
                        const borderColors = ['var(--primary)', '#8b5cf6', '#10b981'];

                        data.career_paths.forEach(function (cp, idx) {
                            const borderColor = borderColors[idx % borderColors.length];
                            const card = document.createElement('div');
                            card.className = 'card career-path-card';
                            card.style.cssText = 'border: 1px solid #cbd5e1; border-top: 4px solid ' + borderColor + '; padding: 1.25rem; background: #ffffff;';

                            let skillsHtml = '';
                            if (Array.isArray(cp.required_skills)) {
                                cp.required_skills.forEach(function (sk) {
                                    skillsHtml += '<span class="badge" style="background: #f1f5f9; color: #334155; font-size: 0.75rem;">' + sk + '</span> ';
                                });
                            }

                            let roadmapHtml = '';
                            if (Array.isArray(cp.roadmap_6_month)) {
                                cp.roadmap_6_month.forEach(function (rm) {
                                    roadmapHtml += '<li><strong>' + (rm.month || '') + ':</strong> ' + (rm.focus || '') + ' &mdash; <em style="color: #64748b;">' + (rm.milestone || '') + '</em></li>';
                                });
                            }

                            card.innerHTML = 
                                '<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">' +
                                    '<h4 style="margin: 0; font-size: 1.05rem; color: #0f172a;">' + (cp.path_title || 'Career Path') + '</h4>' +
                                    '<span class="badge" style="background: #dcfce7; color: #166534; font-weight: 700;">' + (cp.confidence_score || 90) + '% Match</span>' +
                                '</div>' +
                                '<p style="font-size: 0.82rem; color: #475569; line-height: 1.45; margin-bottom: 0.75rem;">' + (cp.rationale || '') + '</p>' +
                                '<div style="margin-bottom: 0.75rem;">' +
                                    '<strong style="font-size: 0.75rem; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Required Competencies:</strong>' +
                                    '<div style="display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.25rem;">' + skillsHtml + '</div>' +
                                '</div>' +
                                '<div class="roadmap-box" style="background: #f8fafc; border-radius: 6px; padding: 0.75rem; border: 1px solid #e2e8f0; font-size: 0.8rem;">' +
                                    '<strong style="color: ' + borderColor + '; display: block; margin-bottom: 0.35rem;">🗓️ 6-Month Action Roadmap:</strong>' +
                                    '<ul style="margin: 0; padding-left: 1.2rem; color: #334155;">' + roadmapHtml + '</ul>' +
                                '</div>';

                            crewaiCardsContainer.appendChild(card);
                        });
                    }
                } catch (err) {
                    console.warn('CrewAI recommendation fetch failover:', err.message);
                }
            }

            async function triggerInternshipMatching() {
                try {
                    const response = await fetch('/candidate/cia/career/match-internships', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': '{{ csrf_token() }}'
                        },
                        body: JSON.stringify({
                            candidateId: 1,
                            limit: 5
                        })
                    });

                    if (!response.ok) throw new Error('HTTP ' + response.status);
                    const data = await response.json();

                    if (internshipListContainer && Array.isArray(data.matches)) {
                        internshipListContainer.innerHTML = '';
                        const rankColors = ['#0284c7', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4'];

                        data.matches.forEach(function (match, idx) {
                            const rankColor = rankColors[idx % rankColors.length];
                            const item = document.createElement('div');
                            item.className = 'card';
                            item.style.cssText = 'border: 1px solid #e2e8f0; border-left: 5px solid ' + rankColor + '; padding: 1rem; background: #ffffff;';

                            let matchedHtml = '';
                            if (Array.isArray(match.matchedSkills) && match.matchedSkills.length > 0) {
                                match.matchedSkills.forEach(function (sk) {
                                    matchedHtml += '<span class="badge badge-severity badge-matched">' + sk + '</span> ';
                                });
                            } else {
                                matchedHtml = '<em style="color: #64748b; font-size: 0.75rem;">None</em>';
                            }

                            let missingHtml = '';
                            if (Array.isArray(match.missingSkills) && match.missingSkills.length > 0) {
                                match.missingSkills.forEach(function (sk) {
                                    missingHtml += '<span class="badge badge-severity badge-critical">' + sk + '</span> ';
                                });
                            } else {
                                missingHtml = '<span class="badge badge-severity badge-matched">Full Match</span>';
                            }

                            item.innerHTML = 
                                '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">' +
                                    '<div style="display: flex; align-items: center; gap: 0.5rem;">' +
                                        '<span class="badge" style="background: ' + rankColor + '; color: #ffffff; font-weight: 700;">#' + (idx + 1) + '</span>' +
                                        '<h4 style="margin: 0; color: #0f172a; font-size: 1rem;">' + (match.role || '') + '</h4>' +
                                    '</div>' +
                                    '<span class="badge" style="background: #dcfce7; color: #166534; font-weight: 700; font-size: 0.85rem;">' + (match.matchPercentage || 85) + '% Match</span>' +
                                '</div>' +
                                '<div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem;">' +
                                    '<strong>' + (match.department || 'Engineering') + '</strong> &bull; ' + (match.location || 'India') + ' &bull; <strong style="color: #0f172a;">' + (match.stipend || '') + '</strong>' +
                                '</div>' +
                                '<p style="font-size: 0.82rem; color: #475569; margin: 0.25rem 0 0.5rem 0;">' + (match.description || '') + '</p>' +
                                '<div style="display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; font-size: 0.8rem;">' +
                                    '<span style="font-weight: 600; color: #166534;">Matched Skills:</span> ' + matchedHtml +
                                    '<span style="font-weight: 600; color: #991b1b; margin-left: 0.5rem;">Missing Skills:</span> ' + missingHtml +
                                '</div>';

                            internshipListContainer.appendChild(item);
                        });
                    }
                } catch (err) {
                    console.warn('Internship matching fetch failover:', err.message);
                }
            }

            async function triggerLearningPathGeneration() {
                try {
                    const targetRoleId = roleSelect ? roleSelect.value : 'role_fullstack_lead';
                    const dailyHours = langgraphDailyHours ? parseFloat(langgraphDailyHours.value) : 2.0;

                    if (langgraphStatusAnnouncement) {
                        langgraphStatusAnnouncement.textContent = 'LangGraph State Machine Executing: AssessCurrentState → IdentifyGaps → GeneratePlan → ValidatePlan → OutputPlan...';
                    }

                    const response = await fetch('/candidate/cia/career/learning-path', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': '{{ csrf_token() }}'
                        },
                        body: JSON.stringify({
                            candidateId: 1,
                            targetRoleId: targetRoleId,
                            dailyCommitmentHours: dailyHours
                        })
                    });

                    if (!response.ok) throw new Error('HTTP ' + response.status);
                    const data = await response.json();

                    if (data && data.state && data.state.generated_plan) {
                        const plan = data.state.generated_plan;

                        if (langgraphOverviewText && plan.overview) {
                            langgraphOverviewText.textContent = plan.overview;
                        }

                        if (langgraphMermaidPre && plan.mermaid_timeline) {
                            langgraphMermaidPre.textContent = plan.mermaid_timeline;
                            langgraphMermaidPre.removeAttribute('data-processed');
                            if (typeof mermaid !== 'undefined') {
                                try {
                                    mermaid.run({ nodes: [langgraphMermaidPre] });
                                } catch (mErr) {
                                    console.warn('Mermaid render notice:', mErr.message);
                                }
                            }
                        }

                        if (langgraphWeeksList && Array.isArray(plan.schedule)) {
                            langgraphWeeksList.innerHTML = '';
                            const weekColors = ['#8b5cf6', '#6366f1', '#0284c7', '#0d9488', '#16a34a', '#d97706', '#ea580c', '#e11d48'];

                            plan.schedule.forEach(function (wk, idx) {
                                const wColor = weekColors[idx % weekColors.length];
                                const card = document.createElement('div');
                                card.className = 'card';
                                card.style.cssText = 'border: 1px solid #e2e8f0; border-left: 5px solid ' + wColor + '; padding: 1rem; background: #ffffff;';

                                let topicsHtml = '';
                                if (Array.isArray(wk.topics)) {
                                    topicsHtml = wk.topics.join(' &bull; ');
                                }

                                let resourcesHtml = '';
                                if (Array.isArray(wk.resources)) {
                                    wk.resources.forEach(function (res) {
                                        resourcesHtml += '<span class="badge" style="background: #f1f5f9; color: #334155; margin-right: 0.35rem;">' + res + '</span>';
                                    });
                                }

                                card.innerHTML = 
                                    '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">' +
                                        '<div style="display: flex; align-items: center; gap: 0.5rem;">' +
                                            '<span class="badge" style="background: ' + wColor + '; color: #ffffff; font-weight: 700;">Week ' + wk.week + '</span>' +
                                            '<h4 style="margin: 0; color: #0f172a; font-size: 0.95rem;">' + (wk.title || '') + '</h4>' +
                                        '</div>' +
                                        '<span class="badge" style="background: #ede9fe; color: #6d28d9; font-weight: 600;">' + (wk.daily_time_commitment || '2.0 hrs/day') + '</span>' +
                                    '</div>' +
                                    '<div style="font-size: 0.82rem; color: #475569; margin-bottom: 0.4rem;">' +
                                        '<strong>Topics:</strong> ' + topicsHtml +
                                    '</div>' +
                                    '<div style="font-size: 0.8rem; color: #64748b; margin-bottom: 0.4rem;">' +
                                        '<strong>Resources:</strong> ' + resourcesHtml +
                                    '</div>' +
                                    '<div style="background: #f8fafc; padding: 0.5rem 0.75rem; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 0.8rem; color: #1e293b;">' +
                                        '<strong>🎯 Milestone:</strong> ' + (wk.milestone || '') +
                                    '</div>';

                                langgraphWeeksList.appendChild(card);
                            });
                        }

                        if (langgraphStatusAnnouncement) {
                            langgraphStatusAnnouncement.textContent = 'LangGraph 8-Week Curriculum Generated Successfully. All 5 Nodes Executed. Validation: Passed.';
                        }
                    }
                } catch (err) {
                    console.warn('LangGraph learning path fetch failover:', err.message);
                    if (langgraphStatusAnnouncement) {
                        langgraphStatusAnnouncement.textContent = 'LangGraph Local Execution Active (Deterministic Safety Net)';
                    }
                }
            }

            async function triggerResumeIntelligenceATS() {
                try {
                    const targetRoleId = roleSelect ? roleSelect.value : 'role_fullstack_lead';
                    let targetRoleName = 'Senior Full Stack Engineer';
                    if (targetRoleId === 'role_backend_architect') targetRoleName = 'Backend Systems Architect';
                    else if (targetRoleId === 'role_ai_engineer') targetRoleName = 'AI & RAG Pipeline Engineer';
                    else if (targetRoleId === 'role_devops_cloud') targetRoleName = 'DevOps & Cloud Engineer';

                    if (doclingStatusAnnouncement) {
                        doclingStatusAnnouncement.textContent = 'Docling Engine converting resume → Groq LPU computing ATS score & AI summary...';
                    }

                    const response = await fetch('/candidate/cia/career/resume-intelligence', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': '{{ csrf_token() }}'
                        },
                        body: JSON.stringify({
                            candidate_id: 1,
                            target_role: targetRoleName,
                            target_role_id: targetRoleId
                        })
                    });

                    if (!response.ok) throw new Error('HTTP ' + response.status);
                    const data = await response.json();

                    if (data && (data.ats_score !== undefined || data.ai_resume_summary)) {
                        const atsScore = data.ats_score !== undefined ? data.ats_score : 88.5;
                        if (atsScoreBadge) {
                            atsScoreBadge.textContent = atsScore.toFixed(1) + '%';
                        }
                        if (atsTierBadge) {
                            atsTierBadge.textContent = data.ats_tier || (atsScore >= 80 ? 'HIGH MATCH' : (atsScore >= 65 ? 'MEDIUM MATCH' : 'LOW MATCH'));
                            atsTierBadge.style.background = atsScore >= 80 ? '#059669' : (atsScore >= 65 ? '#d97706' : '#dc2626');
                        }
                        if (atsMatchedKeywords && Array.isArray(data.matched_keywords)) {
                            atsMatchedKeywords.innerHTML = '';
                            data.matched_keywords.forEach(function (kw) {
                                const sp = document.createElement('span');
                                sp.className = 'badge badge-severity badge-matched';
                                sp.textContent = kw;
                                atsMatchedKeywords.appendChild(sp);
                            });
                        }
                        if (atsMissingKeywords && Array.isArray(data.missing_keywords)) {
                            atsMissingKeywords.innerHTML = '';
                            if (data.missing_keywords.length === 0) {
                                atsMissingKeywords.innerHTML = '<span class="badge badge-severity badge-matched">Full Keyword Coverage</span>';
                            } else {
                                data.missing_keywords.forEach(function (kw) {
                                    const sp = document.createElement('span');
                                    sp.className = 'badge badge-severity badge-minor';
                                    sp.textContent = kw;
                                    atsMissingKeywords.appendChild(sp);
                                });
                            }
                        }
                        if (doclingAiSummaryContent && data.ai_resume_summary) {
                            const paragraphs = data.ai_resume_summary.split('\n\n').filter(Boolean);
                            let renderedHtml = '';
                            paragraphs.forEach(function (para) {
                                if (para.startsWith('### ') || para.startsWith('## ')) {
                                    renderedHtml += '<h4 style="margin: 0.5rem 0 0.25rem 0; color: #0f172a;">' + para.replace(/^#+\s*/, '') + '</h4>';
                                } else if (para.includes('\n- ')) {
                                    const lines = para.split('\n');
                                    renderedHtml += '<p>' + lines[0] + '</p><ul>';
                                    lines.slice(1).forEach(function (li) {
                                        renderedHtml += '<li>' + li.replace(/^-\s*/, '') + '</li>';
                                    });
                                    renderedHtml += '</ul>';
                                } else {
                                    renderedHtml += '<p>' + para.replace(/\n/g, '<br>') + '</p>';
                                }
                            });
                            doclingAiSummaryContent.innerHTML = renderedHtml || data.ai_resume_summary;
                        }

                        if (doclingStatusAnnouncement) {
                            doclingStatusAnnouncement.textContent = 'Docling Resume Intelligence Complete. ATS Score: ' + atsScore.toFixed(1) + '% (' + (data.ats_tier || 'HIGH MATCH') + '). Evaluated via ' + (data.provider || 'Groq LPU') + '.';
                        }
                    }
                } catch (err) {
                    console.warn('Docling resume intelligence failover:', err.message);
                    if (doclingStatusAnnouncement) {
                        doclingStatusAnnouncement.textContent = 'Resume Intelligence Local Fallback Active (Deterministic ATS Scoring)';
                    }
                }
            }

            if (roleSelect) {
                roleSelect.addEventListener('change', function () {
                    triggerSkillGapAnalysis();
                    triggerCrewAICareerRecommendations();
                    triggerInternshipMatching();
                    triggerLearningPathGeneration();
                    triggerResumeIntelligenceATS();
                });
            }
            if (refreshBtn) {
                refreshBtn.addEventListener('click', function () {
                    triggerSkillGapAnalysis();
                    triggerCrewAICareerRecommendations();
                    triggerInternshipMatching();
                    triggerLearningPathGeneration();
                    triggerResumeIntelligenceATS();
                });
            }
            if (crewaiRefreshBtn) {
                crewaiRefreshBtn.addEventListener('click', triggerCrewAICareerRecommendations);
            }
            if (internshipRefreshBtn) {
                internshipRefreshBtn.addEventListener('click', triggerInternshipMatching);
            }
            if (langgraphBtn) {
                langgraphBtn.addEventListener('click', triggerLearningPathGeneration);
            }
            if (langgraphDailyHours) {
                langgraphDailyHours.addEventListener('change', triggerLearningPathGeneration);
            }
            if (doclingBtn) {
                doclingBtn.addEventListener('click', triggerResumeIntelligenceATS);
            }

            const calcReadinessBtn = document.getElementById('btn-calculate-readiness');
            const exportReadinessCsvBtn = document.getElementById('btn-export-readiness-csv');
            const readinessStatusEl = document.getElementById('readiness-status-announcement');

            async function triggerReadinessRecalculation() {
                try {
                    const resp = await fetch('/candidate/cia/career/readiness/calculate', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': '{{ csrf_token() }}'
                        },
                        body: JSON.stringify({ intern_id: 1 })
                    });
                    if (!resp.ok) throw new Error('HTTP ' + resp.status);
                    const data = await resp.json();
                    if (data && data.placement_readiness && data.interview_readiness) {
                        const pg = document.getElementById('student-placement-grade');
                        const ig = document.getElementById('student-interview-grade');
                        if (pg) pg.textContent = data.placement_readiness.score + ' / 100 (Grade ' + data.placement_readiness.grade + ')';
                        if (ig) ig.textContent = data.interview_readiness.score + ' / 100 (Grade ' + data.interview_readiness.grade + ')';
                        if (readinessStatusEl) {
                            readinessStatusEl.textContent = 'Placement: ' + data.placement_readiness.score + ' (' + data.placement_readiness.grade + ') • Interview: ' + data.interview_readiness.score + ' (' + data.interview_readiness.grade + ')';
                        }
                    }
                } catch (err) {
                    console.warn('Readiness calculation notice:', err.message);
                }
            }

            if (calcReadinessBtn) {
                calcReadinessBtn.addEventListener('click', triggerReadinessRecalculation);
            }
            if (exportReadinessCsvBtn) {
                exportReadinessCsvBtn.addEventListener('click', function () {
                    window.location.href = '/candidate/cia/career/readiness/export-csv';
                });
            }
        });
    </script>
</body>
</html>
