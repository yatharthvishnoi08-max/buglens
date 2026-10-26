# BugLens documentation

Start with the [README](../README.md).

| Document | Question answered |
| --- | --- |
| [Demo guide](DEMO_GUIDE.md) | How do I reproduce the journey in 90 seconds and handle failures? |
| [Test report](TEST_REPORT.md) | What was actually verified and what remains unverified? |
| [Architecture](architecture.md) | What runs, where does data go, and what are the API boundaries? |
| [Flowcharts](FLOWCHARTS.md) | How does a request become a report, including failures? |
| [Scalability report](SCALABILITY_REPORT.md) | What limits capacity and how should it be measured and improved? |
| [API reference](API_REFERENCE.md) | What requests, response events and failure semantics do clients use? |
| [Security and privacy](SECURITY_AND_PRIVACY.md) | Which controls exist and which risks remain? |
| [Operations runbook](OPERATIONS_RUNBOOK.md) | How should an owner verify releases and triage failures? |
| [Complete ZIP](../submission/Complete_Documentation_Package.zip) | Where can I download all reports and evidence together? |
| [UI handoff](UI_HANDOFF.md) | How should the integration owner review and publish the redesign? |
| [Submission report](../submission/Project_Submission_Report.pdf) | What is the concise four-page project story? |
| [Upload checklist](../submission/UPLOAD_CHECKLIST.md) | What goes to Google Drive and what remains to submit? |

Architecture is the high-level map; API, security, scalability and operations answer different production-readiness questions. Current behavior and proposed improvements are explicitly separated. UI handoff covers the separate integration owner. No calculation/model-evaluation spreadsheet is justified: no numerical product or measured model-accuracy dataset exists.

## Evidence

- [Current UI screenshots](assets/ui) are actual browser captures. Partial/error cases use controlled test responses.
- [Browser journeys](../tests/e2e): repository responses come from the real static pipeline applied to controlled data; the sample flow is explicitly synthetic.
- [Historical verification](verification.md), [historical live metadata](live-check.json) and [older demo notes](submission.md) predate this redesign. Do not treat them as fresh checks.

Official problem statement, submission requirements and confirmed team contributions were not provided. No upload or hackathon submission was performed.
