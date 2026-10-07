# serverless-portfolio

A fully serverless personal portfolio site on AWS — animated static frontend,
a contact form backed by a real API, and one-push deploys via GitHub Actions.
No server to patch, no idle cost.

## Architecture

```
Browser
   │  HTTPS
   ▼
CloudFront  ──edge cache──►  S3 (frontend/ static site)
   │
   │  contact form submit
   ▼
API Gateway  ───►  Lambda (backend/lambda_function.py)  ───►  DynamoDB
```

1. **S3** hosts the static frontend (`index.html`, `style.css`, `script.js`).
2. **CloudFront** sits in front of the bucket as a CDN — HTTPS, edge caching, custom domain.
3. **API Gateway** exposes a REST endpoint for the contact form.
4. **Lambda** (`lambda_function.py`) validates the submission and writes it to DynamoDB.
5. **GitHub Actions** (`.github/workflows/deploy.yml`) deploys the frontend and Lambda on every push to `main`.

## Project structure

```
serverless-portfolio/
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── backend/
│   └── lambda_function.py
├── .github/workflows/deploy.yml
└── README.md
```

## Setting it up on AWS

You'll need these resources created once (console, CLI, or IaC — your choice):

1. **S3 bucket** — static website hosting enabled, or used as a CloudFront origin (recommended, keeps the bucket private).
2. **CloudFront distribution** — origin pointed at the S3 bucket.
3. **DynamoDB table** — name it `ContactMessages` (or set `TABLE_NAME` in the Lambda's environment variables), partition key `id` (String).
4. **Lambda function** — Python 3.12 runtime, deploy `backend/lambda_function.py` as `lambda_function.lambda_handler`. Attach an execution role with `dynamodb:PutItem` on your table.
5. **API Gateway** — REST or HTTP API, `POST /contact` route integrated with the Lambda, CORS enabled for your CloudFront domain.
6. Update **`API_ENDPOINT`** in `frontend/script.js` with your real API Gateway invoke URL.

## Setting up GitHub Actions deploys

The workflow authenticates to AWS via **OIDC** (no long-lived access keys). In your AWS account:

1. Create an IAM role trusted by GitHub's OIDC provider, scoped to this repo, with permissions for `s3:PutObject`/`s3:DeleteObject` on your bucket, `cloudfront:CreateInvalidation`, and `lambda:UpdateFunctionCode`.
2. In the GitHub repo → **Settings → Secrets and variables → Actions**, add:
   - `AWS_ROLE_ARN` — the role's ARN
   - `S3_BUCKET_NAME`
   - `CLOUDFRONT_DISTRIBUTION_ID`
   - `LAMBDA_FUNCTION_NAME`
3. Push to `main` — the workflow syncs `frontend/` to S3, invalidates the CloudFront cache, and updates the Lambda code.

## Local development

Just open `frontend/index.html` in a browser, or serve it locally:

```bash
cd frontend
python -m http.server 5500
```

The contact form will fail locally until `API_ENDPOINT` points at a deployed API Gateway URL — that's expected.

## If something breaks

Common places to check, in order:

1. **Form fails to send** → confirm `API_ENDPOINT` in `script.js` matches your API Gateway invoke URL exactly, and that CORS is enabled on that route.
2. **403/500 from Lambda** → check CloudWatch Logs for the function; usually a missing DynamoDB permission on the execution role, or `TABLE_NAME` not set.
3. **Site not updating after push** → check the Actions tab for the workflow run; a failed step usually means a missing/incorrect GitHub secret.
4. **CloudFront still serving old content** → the invalidation step can take a minute or two to propagate; hard-refresh after that.

If you get stuck on any of these, describe the exact error message and which step of the architecture it's coming from — that's usually enough to debug from.
