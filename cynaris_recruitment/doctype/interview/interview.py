"""
Interview Controller for Cynaris Recruitment Pipeline.
Handles validation and stage transition for interview candidates.
"""

try:
    import frappe
    from frappe.model.document import Document
    from frappe.utils import now_datetime
except ImportError:
    frappe = None
    Document = object

VALID_STAGES = [
    "Screening",
    "Technical Round 1",
    "Technical Round 2",
    "HR Round",
    "Offered",
    "Rejected",
]


class Interview(Document):
    def validate(self):
        """Validate interview document before saving."""
        self.validate_pipeline_stage()

    def validate_pipeline_stage(self):
        """Ensure pipeline_stage matches one of the approved workflow stages."""
        if self.pipeline_stage and self.pipeline_stage not in VALID_STAGES:
            msg = f"Invalid pipeline stage: '{self.pipeline_stage}'. Allowed stages: {', '.join(VALID_STAGES)}"
            if frappe:
                frappe.throw(msg)
            else:
                raise ValueError(msg)


def _frappe_whitelist(fn):
    """Decorator fallback if running outside Frappe runtime."""
    if frappe and hasattr(frappe, "whitelist"):
        return frappe.whitelist()(fn)
    return fn


@_frappe_whitelist
def update_pipeline_stage(applicant_id, stage):
    """
    Update applicant's interview pipeline stage with validation.

    Args:
        applicant_id (str|int): Unique identifier of the applicant / Job Applicant document name.
        stage (str): Target pipeline stage to move applicant to.

    Returns:
        dict: Standardized API response containing updated record or error information.
    """
    if not applicant_id:
        msg = "Missing required parameter: applicant_id"
        if frappe:
            frappe.throw(msg, frappe.ValidationError)
        else:
            raise ValueError(msg)

    if not stage or not isinstance(stage, str):
        msg = "Missing or invalid parameter: stage must be a non-empty string"
        if frappe:
            frappe.throw(msg, frappe.ValidationError)
        else:
            raise ValueError(msg)

    stage_clean = stage.strip()
    if stage_clean not in VALID_STAGES:
        msg = f"Invalid pipeline stage: '{stage}'. Allowed values: {', '.join(VALID_STAGES)}"
        if frappe:
            frappe.throw(msg, frappe.ValidationError)
        else:
            raise ValueError(msg)

    if frappe:
        if not frappe.db.exists("Job Applicant", applicant_id):
            frappe.throw(f"Applicant #{applicant_id} not found in database", frappe.DoesNotExistError)

        doc = frappe.get_doc("Job Applicant", applicant_id)
        previous_stage = getattr(doc, "pipeline_stage", "Screening")
        doc.pipeline_stage = stage_clean
        doc.save(ignore_permissions=True)
        frappe.db.commit()

        # Add comment/activity log
        doc.add_comment(
            "Workflow",
            f"Pipeline stage updated from '{previous_stage}' to '{stage_clean}'"
        )

        return {
            "success": True,
            "message": f"Pipeline stage updated to {stage_clean}",
            "applicant_id": applicant_id,
            "previous_stage": previous_stage,
            "new_stage": stage_clean,
            "updated_at": frappe.utils.now_datetime().isoformat()
        }

    # Fallback for standalone/mock unit testing environment
    return {
        "success": True,
        "message": f"Pipeline stage updated to {stage_clean}",
        "applicant_id": applicant_id,
        "new_stage": stage_clean,
        "allowed_stages": VALID_STAGES
    }
