<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Career Intelligence Report #{{ $report['id'] ?? 1 }}</title>
    <style>
        body { font-family: DejaVu Sans, Arial, sans-serif; color: #0f172a; font-size: 12px; line-height: 1.5; margin: 24px; }
        .header { border-bottom: 2px solid #0284c7; padding-bottom: 10px; margin-bottom: 16px; }
        h1 { margin: 0; color: #0284c7; font-size: 20px; }
        .meta { color: #475569; font-size: 11px; margin-top: 4px; }
        .kpi-row { width: 100%; border-collapse: collapse; margin: 14px 0; }
        .kpi-row td { border: 1px solid #cbd5e1; padding: 10px; text-align: center; background: #f8fafc; }
        .kpi-val { font-size: 18px; font-weight: bold; color: #0369a1; }
        .section { margin-top: 16px; }
        .section h2 { font-size: 14px; color: #1e293b; border-left: 4px solid #4f46e5; padding-left: 8px; }
        ul { padding-left: 18px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Cynaris Career Intelligence Report</h1>
        <div class="meta">
            Candidate: <strong>{{ $report['candidate_name'] ?? 'Murali V' }}</strong> &bull;
            Target Role: <strong>{{ $report['target_role'] ?? 'Senior Full Stack Engineer' }}</strong>
        </div>
    </div>

    <div class="section">
        <h2>Career Archetype Map</h2>
        <p>
            <strong>Primary Archetype:</strong> {{ $report['primary_archetype'] ?? 'Builder' }} &bull;
            <strong>Secondary Archetype:</strong> {{ $report['secondary_archetype'] ?? 'Innovator' }}
        </p>
    </div>

    <table class="kpi-row">
        <tr>
            <td>
                <div>Employability Score</div>
                <div class="kpi-val">{{ $report['employability_score'] ?? 91.6 }} / 100</div>
            </td>
            <td>
                <div>AI Readiness Score</div>
                <div class="kpi-val">{{ $report['ai_readiness_score'] ?? 94.0 }} / 100</div>
            </td>
            <td>
                <div>Placement Readiness Score</div>
                <div class="kpi-val">{{ $report['placement_readiness_score'] ?? 93.1 }} / 100</div>
            </td>
        </tr>
    </table>

    <div class="section">
        <h2>Executive AI Narrative</h2>
        <p>{{ $report['report_narrative'] ?? '' }}</p>
    </div>

    <div class="section">
        <h2>Strategic Recommendations</h2>
        <ul>
            @foreach(($report['recommendations'] ?? []) as $rec)
                <li>{{ $rec }}</li>
            @endforeach
        </ul>
    </div>
</body>
</html>
