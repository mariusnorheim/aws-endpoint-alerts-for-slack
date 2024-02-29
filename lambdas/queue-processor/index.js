const axios = require("axios");
const AWS = require("aws-sdk");
const sts = new AWS.STS();

const serviceRole = process.env.EMAIL_SERVICE_ROLE;
const recipients = process.env.EMAIL_RECIPIENTS.split(",");

async function sendEmailWithCrossAccountSES(endpoint) {
    const assumedRole = await sts
        .assumeRole({
            RoleArn: serviceRole,
            RoleSessionName: "sesSession",
        })
        .promise();

    const ses = new AWS.SES({
        accessKeyId: assumedRole.Credentials.AccessKeyId,
        secretAccessKey: assumedRole.Credentials.SecretAccessKey,
        sessionToken: assumedRole.Credentials.SessionToken,
        region: "eu-north-1", // region of the SES in the other account
    });

    console.log(recipients);
    const params = {
        Destination: {
            ToAddresses: recipients,
        },
        Message: {
            Body: {
                Text: { Data: `Application is unresponsive at the following endpoint: ${endpoint}` },
            },
            Subject: { Data: "Application alert" },
        },
        Source: "noreply@mydomain.com",
    };

    return ses.sendEmail(params).promise();
}

exports.handler = async (event) => {
    const slackBotToken = process.env.SLACK_BOT_TOKEN;
    const slackChannelId = process.env.SLACK_CHANNEL_ID;

    // iterate queue messages
    for (const record of event.Records) {
        const message = JSON.parse(record.body);
        const { endpoint, status } = message;

        // send slack notifications
        const slackOutput = `ALERT: Endpoint <${endpoint}> has returned status code: ${status}`;

        try {
            await sendSlackNotification(slackBotToken, slackChannelId, slackOutput);
            console.log("Slack notification sent for endpoint: ", endpoint);
        } catch (error) {
            console.error("Error sending slack notification: ", error);
        }

        // send ses email notifications outside of working horus
        const currentTime = new Date();
        const hour = currentTime.getHours();

        if (hour < 8 || hour >= 17) {
            try {
                await sendEmailWithCrossAccountSES(endpoint);
                console.log("Email notification sent for endpoint: ", endpoint);
            } catch (error) {
                console.error("Error sending email notification: ", error);
            }
        }
    }

    return {
        statusCode: 200,
        body: `Slack notifications sent.`,
    };
};

// send payload to slackbot
async function sendSlackNotification(token, channel, messageText) {
    const postMessageUrl = "https://slack.com/api/chat.postMessage";
    try {
        const response = await axios.post(
            postMessageUrl,
            {
                blocks: [
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: messageText,
                        },
                    },
                ],
                channel: channel,
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            }
        );

        if (response.data && !response.data.ok) {
            console.error(`Failed to send Slack notification: ${response.data.error}`);
        }
    } catch (error) {
        console.error(`Error sending message to Slack: ${error.message}`);
    }
}
