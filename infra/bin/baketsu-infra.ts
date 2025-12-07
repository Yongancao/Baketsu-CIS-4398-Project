#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { BaketsuStorageStack } from '../lib/baketsu-storage-stack';

const app = new App();

new BaketsuStorageStack(app, 'BaketsuStorageStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
  },
});
