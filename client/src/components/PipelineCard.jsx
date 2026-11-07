/**
 * PipelineCard Component
 * 
 * Demonstrates:
 * - JSX syntax and component composition
 * - Props destructuring with defaults
 * - Event handling via synthetic events
 * - Conditional styling and dynamic class rendering
 */

export function PipelineCard({
  applicant = {},
  onSelect = () => {},
  onAdvanceStage = () => {},
  isActive = false,
}) {
  const { id, name = 'Unnamed Candidate', email = '', pipeline_stage = 'Screening', experience_years = 0 } = applicant;

  const stageClassMap = {
    'Screening': 'stage-screening',
    'Technical Round 1': 'stage-tech1',
    'Technical Round 2': 'stage-tech2',
    'HR Round': 'stage-hr',
    'Offered': 'stage-offered',
    'Rejected': 'stage-rejected',
  };

  const badgeClass = stageClassMap[pipeline_stage] || 'stage-default';

  return (
    <div
      className={`pipeline-card ${isActive ? 'active' : ''}`}
      onClick={() => onSelect(applicant)}
      data-testid={`applicant-card-${id}`}
    >
      <div className="card-header">
        <h4 className="candidate-name">{name}</h4>
        <span className={`status-badge ${badgeClass}`}>{pipeline_stage}</span>
      </div>

      <div className="card-body">
        <p className="candidate-email">
          <strong>Email:</strong> {email}
        </p>
        <p className="candidate-exp">
          <strong>Experience:</strong> {experience_years} {experience_years === 1 ? 'year' : 'years'}
        </p>
      </div>

      <div className="card-actions">
        <button
          className="btn-advance"
          onClick={(e) => {
            e.stopPropagation(); // Stop synthetic event bubbling
            onAdvanceStage(id);
          }}
        >
          Advance Stage &rarr;
        </button>
      </div>
    </div>
  );
}

export default PipelineCard;
