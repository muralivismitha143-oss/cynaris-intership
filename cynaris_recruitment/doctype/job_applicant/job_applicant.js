// Job Applicant Form Client Script
// Adds "Generate AI Summary" button calling the backend python method via frappe.call

frappe.ui.form.on('Job Applicant', {
  refresh(frm) {
    if (!frm.is_new()) {
      // Add custom button to Job Applicant form
      frm.add_custom_button(__('Generate AI Summary'), function () {
        frappe.confirm(
          __('Analyze this applicant\'s resume using Groq (llama-3.3-70b-versatile) with OpenRouter fallback?'),
          function () {
            // User confirmed
            frappe.show_alert({
              message: __('Dispatching resume to AI analysis engine...'),
              indicator: 'blue'
            }, 5);

            frappe.call({
              method: 'cynaris_recruitment.doctype.job_applicant.job_applicant.generate_resume_summary',
              args: {
                applicant_id: frm.doc.name
              },
              freeze: true,
              freeze_message: __('Analyzing resume with AI (Groq primary / OpenRouter fallback)...'),
              callback: function (r) {
                if (r.message && r.message.success) {
                  frappe.msgprint({
                    title: __('AI Resume Analysis Complete'),
                    indicator: 'green',
                    message: __(
                      '<p><strong>Resume summary successfully generated!</strong></p>' +
                      '<p><strong>Provider:</strong> <span class="badge badge-success">' + r.message.provider + '</span></p>' +
                      '<p><strong>Model:</strong> <code>' + r.message.model + '</code></p>' +
                      '<hr><div style="max-height: 250px; overflow-y: auto; background: #f8fafc; padding: 10px; border-radius: 6px;">' +
                      r.message.summary.replace(/\n/g, '<br>') +
                      '</div>'
                    )
                  });
                  // Refresh form to show the newly stored ai_resume_summary field value
                  frm.reload_doc();
                } else {
                  const errorMsg = (r.message && r.message.error) || __('Failed to generate AI summary from both Groq and OpenRouter.');
                  frappe.msgprint({
                    title: __('AI Generation Failed'),
                    indicator: 'red',
                    message: __('<p class="text-danger">' + errorMsg + '</p><p>Please ensure API keys or internet connectivity are available.</p>')
                  });
                }
              },
              error: function (err) {
                frappe.msgprint({
                  title: __('Network / Server Error'),
                  indicator: 'red',
                  message: __('An unexpected error occurred while communicating with the AI service.')
                });
              }
            });
          }
        );
      }, __('AI Actions')).addClass('btn-primary');
    }
  }
});
