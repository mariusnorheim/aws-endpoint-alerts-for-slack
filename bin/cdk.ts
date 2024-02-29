#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { AlertLambdaStack } from "../lib/endpoint-alerts-stack";

const app = new cdk.App();

// deploy stack
new AlertLambdaStack(app, "infra-cdk-application-endpoint-alerts", {
  env: {
    region: process.env.CDK_DEFAULT_REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
  description: "Stack for Application endpoint alert lambdas",
  stackName: "infra-cdk-application-endpoint-alerts"
});
