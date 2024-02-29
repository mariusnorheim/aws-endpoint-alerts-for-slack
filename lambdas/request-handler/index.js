const axios = require("axios");
const AWS = require("aws-sdk");
const dynamo = new AWS.DynamoDB.DocumentClient();
const sqs = new AWS.SQS();
const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL;
const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async(event) => {
    const endpoints = process.env.ENDPOINTS.split(",");

    // iterate endpoints in environment variable
    for(let endpoint of endpoints) {
        endpoint = endpoint.trim();
        const lastKnownStatus = await getLastKnownStatus(endpoint);

        try {
            const response = await axios.get(endpoint);

            if(response.status !== lastKnownStatus) {
                // update dynamodb if response code has changed
                await updateLastKnownStatus(endpoint, response.status);

                if(response.status !== 200) {
                    // send to sqs queue for slack notification if response is not 200 (ok)
                    const message = {
                        endpoint: endpoint,
                        status: Number(response.status)
                    };
                    await sendToSQS(message);
                }
            }
        } catch(error) {
            console.error(`Error checking endpoint ${endpoint}: ${error.message}`);
            
            // send to sqs queue for slack notification if its a new error
            if(lastKnownStatus !== 404) {
                const message = {
                    endpoint: endpoint,
                    status: Number(404)
                };
                await updateLastKnownStatus(message.endpoint, message.status);
                await sendToSQS(message);
            }
        }
    }

    return {
        statusCode: 200,
        body: `Endpoint checks completed.`
    };
};

// get last status code response for endpoint
async function getLastKnownStatus(endpoint) {
    const params = {
        TableName: TABLE_NAME,
        Key: { endpoint }
    };
    
    const result = await dynamo.get(params).promise();
    return result.Item ? result.Item.last_known_status : null;
}

// update last status code response for endpoint
async function updateLastKnownStatus(endpoint, status) {
    const params = {
        TableName: TABLE_NAME,
        Key: { endpoint },
        UpdateExpression: "set last_known_status = :s",
        ExpressionAttributeValues: {
            ":s": status
        }
    };

    await dynamo.update(params).promise();
}

// send payload to sqs queue
async function sendToSQS(message) {
    const params = {
        QueueUrl: SQS_QUEUE_URL,
        MessageBody: JSON.stringify(message)
    };

    return sqs.sendMessage(params).promise();
}