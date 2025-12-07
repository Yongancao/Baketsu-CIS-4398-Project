# Baketsu Infrastructure (AWS CDK)

TypeScript CDK app that currently provisions the S3 bucket used for storing user uploads.

## Prerequisites

- Node.js 18+
- AWS CDK CLI (`npm install -g aws-cdk`) or run via `npx aws-cdk`
- Configured AWS credentials for the target account

## Setup

```bash
cd infra
npm install
```

## Useful commands

- `npm run build` — compile TypeScript to `dist/`
- `npm run synth` — emit the CloudFormation template
- `npm run deploy` — deploy `BaketsuStorageStack` to your default AWS account/region
- `npm run destroy` — remove the deployed stack (bucket is retained by default)

The bucket name is printed as a CloudFormation output (`UploadsBucketName`) after deployment.
