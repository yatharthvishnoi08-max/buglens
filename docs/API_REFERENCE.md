# API reference

This document describes the repository-review interface; the [route implementation](../src/app/api/review-repository/route.ts) and [result schema](../src/lib/review/schema.ts) are authoritative. No authentication or persisted job API exists.

## POST /api/review-repository

Content-Type: multipart/form-data. Exactly one `options` field containing JSON, and at most one binary `image` field. Unknown/duplicate form fields are rejected.

| Option | Type / values | Behavior |
| --- | --- | --- |
| repositoryUrl | string, max 250 | HTTPS public github.com/owner/repo; no credentials, query, hash or branch path |
| mode | repository or problem | Problem mode needs text, files or screenshot |
| includeAI | boolean | Request source AI |
| checkDependencies | boolean | Request OSV npm advisory lookup |
| consent | boolean | Must be true for AI, dependency checks or screenshot |
| problem | optional object | text and attachments; attachment has name and text |
| context | optional object | Required with screenshot: expectedBehavior, actualBehavior; environment optional |

```sh
curl --no-buffer http://127.0.0.1:3000/api/review-repository \
  --form-string 'options={"repositoryUrl":"https://github.com/yatharthvishnoi08-max/buglens","mode":"repository","includeAI":false,"checkDependencies":false,"consent":false,"problem":{"text":"","attachments":[]}}'
```

This is a static-only example request, not a claim it was executed during documentation creation. It still sends the repository request to GitHub. For screenshots use supported PNG/JPEG/WebP, supply context and consent, and configure the server's model credential. Do not put server credentials in browser requests.

## Streaming contract

On stream start: `application/x-ndjson`, `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`. Records are newline-delimited JSON objects.

```json
{"type":"stage","message":"Loading a fixed GitHub commit"}
```

The terminal record is either `{"type":"result","result":...}` or `{"type":"error","error":{"code":"...","message":"..."}}`. Ellipses here describe the envelope only; they are not valid example payloads. Read the full stream, preserve buffered partial lines, and validate the result against the schema.

The result contains repository/commit, reported problem, findings, coverage, checks, visual evidence where requested, warnings, model metadata, reportMarkdown, documentationMarkdown and fixPrompt. Its validation.runtimeVerified is always false in this implementation.

A transport 200 can contain a terminal error. Pre-stream validation normally returns JSON/400; size errors can return 413; a mismatched Origin/Host returns 403. Some deeper input errors occur inside the stream. Errors do not imply a fixture or alternate repository/model was substituted.

## Other routes

- `POST /api/analyze-visual`: original screenshot-to-issue workflow; separate contract in [source](../src/app/api/analyze-visual/route.ts).
- `GET /api/sample-image?id=clipping`: built-in synthetic image; see [source](../src/app/api/sample-image/route.ts).
- `/`, `/demo`, `/how-it-works`, `/result`: browser routes. Result state is session memory, not a server record.

No batch endpoint, API key issued to clients, webhook, auto-fix endpoint or GET-by-job-ID endpoint is implemented.

[Input limits](SCALABILITY_REPORT.md) · [Failure flow](FLOWCHARTS.md) · [Privacy](SECURITY_AND_PRIVACY.md)
