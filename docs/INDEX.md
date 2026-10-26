# BugLens documentation

Start with the [README](../README.md).

| Document | Question answered |
| --- | --- |
| [Demo guide](DEMO_GUIDE.md) | How do I reproduce the journey in 90 seconds and handle failures? |
| [Test report](TEST_REPORT.md) | What was actually verified and what remains unverified? |
| [Architecture](architecture.md) | What runs, where does data go, and what are the API boundaries? |
| [UI handoff](UI_HANDOFF.md) | How should the integration owner review and publish the redesign? |
| [Submission report](../submission/Project_Submission_Report.pdf) | What is the concise four-page project story? |
| [Upload checklist](../submission/UPLOAD_CHECKLIST.md) | What goes to Google Drive and what remains to submit? |

Architecture includes API/privacy details to avoid duplicate documents. UI handoff is included because the redesign has a separate integration owner. No calculation/model-evaluation spreadsheet is justified: this is not a calculation product and no measured model-accuracy dataset exists.

## Evidence

- [Current UI screenshots](assets/ui) are actual browser captures. Partial/error cases use controlled test responses.
- [Browser journeys](../tests/e2e): repository responses come from the real static pipeline applied to controlled data; the sample flow is explicitly synthetic.
- [Historical verification](verification.md), [historical live metadata](live-check.json) and [older demo notes](submission.md) predate this redesign. Do not treat them as fresh checks.

Official problem statement, submission requirements and confirmed team contributions were not provided. No upload or hackathon submission was performed.
