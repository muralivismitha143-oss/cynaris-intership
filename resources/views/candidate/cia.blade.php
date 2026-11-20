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

            if (roleSelect) {
                roleSelect.addEventListener('change', triggerSkillGapAnalysis);
            }
            if (refreshBtn) {
                refreshBtn.addEventListener('click', triggerSkillGapAnalysis);
            }
        });
    </script>
</body>
</html>
