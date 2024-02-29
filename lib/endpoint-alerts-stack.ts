import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { Parameters } from "./utils/params";
import * as iam from "aws-cdk-lib/aws-iam";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
//import * as sm from "aws-cdk-lib/aws-secretsmanager";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";

export interface AlertLambdaStackProps extends cdk.StackProps {}

export class AlertLambdaStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: AlertLambdaStackProps) {
        super(scope, id, props);

        // tag parameters
        const params = new Parameters();
        const application = params.application;
        const description = params.description;
        const environment = params.environment;

        // tag the stack with standard tags
        cdk.Tags.of(this).add("Application", application);
        cdk.Tags.of(this).add("Description", description);
        cdk.Tags.of(this).add("Environment", environment);

        // service parameters
        const lambdaTimeout = params.lambdatimeout;
        const lambdaMemorySize = params.lambdamemorysize;
        const lambdaEnvSlackBotToken = params.lambdaenvslackbottoken;
        const lambdaEnvSlackChannelId = params.lambdaenvslackchannelid;
        const lambdaEnvEndpoints = params.lambdaenvendpoints;
        const eventruleMinutes = params.eventruleminutes;
        const sesAccount = params.emailserviceaccount;
        const sesRole = params.emailservicerole;
        const emailRecipients = params.emailrecipients;

        // create a role for the lambdas
        const role = new iam.Role(this, "lambda-role", {
            roleName: `application-alert-lambda-role-${environment.toLowerCase()}`,
            assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
            description: "Role for executing application endpoint alert lambdas",
        });
        // basic lambda execution policy
        role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"));
        // assume role policy for ses account
        role.addToPolicy(
            new iam.PolicyStatement({
                actions: ["sts:AssumeRole"],
                resources: [`${sesRole}`],
            })
        );
        // ses email policy
        role.addToPolicy(
            new iam.PolicyStatement({
                actions: ["ses:SendEmail", "ses:SendRawEmail"],
                resources: [`arn:aws:ses:eu-north-1:${sesAccount}:identity/mydomain.com`],
            })
        );

        // create a sqs queue for processing
        const processQueue = new sqs.Queue(this, "processing-queue", {
            visibilityTimeout: cdk.Duration.seconds(30),
            retentionPeriod: cdk.Duration.days(10),
        });

        // create a dynamodb table
        // needed to save latest response state, to avoid spamming repeated messages
        const table = new dynamodb.Table(this, "dynamodb-status-table", {
            tableName: `application-alert-table-${environment.toLowerCase()}`,
            partitionKey: {
                name: "endpoint",
                type: dynamodb.AttributeType.STRING,
            },
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // serverless mode, adjust as needed
        });

        // request handler lambda function - handle requests to healthcheck endpoints
        const requestHandlerFn = new lambda.Function(this, "lambda-request-handler", {
            functionName: "application-alert-lambda-request-handler",
            description: "Function for handling requests to healthcheck endpoints",
            memorySize: lambdaMemorySize,
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: "index.handler",
            code: lambda.Code.fromAsset("lambdas/request-handler/"),
            timeout: cdk.Duration.seconds(lambdaTimeout),
            role: role,
            environment: {
                AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1", // reuse aws-sdk connection towards dynamodb
                ENDPOINTS: lambdaEnvEndpoints,
                SQS_QUEUE_URL: processQueue.queueUrl,
                TABLE_NAME: table.tableName,
            },
        });
        // grant dynamodb write access to request lambda
        table.grantReadWriteData(requestHandlerFn);
        processQueue.grantSendMessages(requestHandlerFn);

        // slack notifier lambda function - send alert to slack channel if the endpoints defined
        // in environment variable does not return a 200 status code
        const queueProcessorFn = new lambda.Function(this, "lambda-queue-processor", {
            functionName: "application-alert-lambda-queue-processor",
            description: "Function for sending alert to Slack through webhooks if application healthcheck endpoint fails",
            memorySize: lambdaMemorySize,
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: "index.handler",
            code: lambda.Code.fromAsset("lambdas/queue-processor"),
            timeout: cdk.Duration.seconds(lambdaTimeout),
            role: role,
            environment: {
                SLACK_BOT_TOKEN: lambdaEnvSlackBotToken,
                SLACK_CHANNEL_ID: lambdaEnvSlackChannelId,
                EMAIL_SERVICE_ROLE: sesRole,
                EMAIL_RECIPIENTS: emailRecipients,
            },
        });
        // add the sqs queue as event source for the processor lambda
        queueProcessorFn.addEventSource(new SqsEventSource(processQueue));
        processQueue.grantConsumeMessages(queueProcessorFn);

        // create a event rules to run the lambdas on a cron schedule
        const eventRuleAlert = new events.Rule(this, "application-alert-lambda-schedule", {
            ruleName: "application-alert-lambda-schedule",
            schedule: events.Schedule.cron({ minute: `0/${eventruleMinutes}` }),
        });
        eventRuleAlert.addTarget(new targets.LambdaFunction(requestHandlerFn));
        // allow the event rule to invoke the lambda function
        targets.addLambdaPermission(eventRuleAlert, requestHandlerFn);
    }
}
