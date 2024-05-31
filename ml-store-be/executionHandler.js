import {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
} from '@google/generative-ai';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { fromEnv } from "@aws-sdk/credential-providers";

let sqsClient;
if (process.env.NODE_ENV == 'production') {
    sqsClient = new DynamoDBClient({
        region: process.env.AWS_REGION,
    });
} else {
    sqsClient = new DynamoDBClient({
        region: process.env.AWS_REGION,
        credentials: fromEnv()
    });
}

const ddbDocClient = DynamoDBDocumentClient.from(sqsClient);

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const sqs = new SQSClient({ region: process.env.AWS_REGION });

const model = genAI.getGenerativeModel({
    model: "gemini-1.5-pro",
});

const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 8192,
    responseMimeType: "text/plain",
};

const safetySettings = [
    {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
];


export const handleExecuteModel = async (event) => {
    const { executionId, modelId, text } = JSON.parse(event.Records[0].body);

    console.log(`Event ${JSON.stringify(event)}`)


    if (modelId !== "1") return;

    console.log(`Executing model ${modelId} for ${executionId} with text: ${text}`);

    const chatSession = model.startChat({
        generationConfig,
        safetySettings,
        history: [
        ],
    });

    const prompt = `Act as a sentiment text recognition system. Your input is a short text after "Sample:". Your output is the expression, example: 'Detected happy expression', if is not possible to analyze the image just say Unknown expression.\nSample: ${text}`

    const result = await chatSession.sendMessage(prompt);
    const resultText = result.response.text();

    const messageParams = {
        QueueUrl: process.env.SQS_RESULT_QUEUE_URL,
        MessageBody: JSON.stringify({
            executionId,
            result: resultText,
        })
    };

    await sqs.send(new SendMessageCommand(messageParams));
}

export const handleResultModel = async (event) => {
    const { executionId, result } = JSON.parse(event.Records[0].body);

    console.log(`Event ${JSON.stringify(event)}`)
    console.log(`Result for execution ${executionId}: ${result}`)

    const params = {
        TableName: process.env.EXECUTIONS_TABLE,
        Item: {
            executionId,
            result,
        },
    };

    try {
        const data = await ddbDocClient.send(new PutCommand(params));
        console.log("Fila almacenada con éxito:", data);
    } catch (err) {
        console.error("Error al almacenar la fila:", err);
    }
}

export const handleS3UserImage = async (event) => {
    console.log(JSON.stringify(event));

    const { s3: { object: { key: executionId } } } = event.Records[0];

    console.log(`Processing image ${executionId}`);

    const s3 = new S3Client({ region: process.env.AWS_REGION });
    const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: executionId,
        ContentType: 'application/octet-stream',
    });

    const response = await s3.send(command);

    const streamToBuffer = (stream) =>
        new Promise((resolve, reject) => {
          const chunks = [];
          stream.on("data", (chunk) => chunks.push(chunk));
          stream.on("error", reject);
          stream.on("end", () => resolve(Buffer.concat(chunks)));
        });

    const dataBuffer = await streamToBuffer(response.Body);

    const res = await model.generateContent([
        "Act as a sentiment face recognition system. Your input is an image of a person or character. Your output is the expression, example: 'Detected happy expression', if is not possible to analyze the image just say Unknown expression",
        {
            inlineData: {
                data: dataBuffer.toString('base64'),
                mimeType: response.ContentType,
            }
        }
    ]);

    const { response: { candidates: [ { content: { parts: [ { text } ]} } ] } } = res; 

    console.log(`Gemini Res ${JSON.stringify(res)}`)

    console.log(`Result for execution ${executionId}: ${text}`)

    const messageParams = {
        QueueUrl: process.env.SQS_RESULT_QUEUE_URL,
        MessageBody: JSON.stringify({
            executionId,
            result: text,
        })
    };

    await sqs.send(new SendMessageCommand(messageParams));
}