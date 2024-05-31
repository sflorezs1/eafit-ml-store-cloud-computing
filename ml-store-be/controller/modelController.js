import { fromEnv } from "@aws-sdk/credential-providers";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const MODELS_TABLE = process.env.MODELS_TABLE;

const getModels = async (req, res) => {
  
  if (process.env.NODE_ENV == 'production'){
    var client = new DynamoDBClient({ 
      region: process.env.AWS_REGION, 
    });
  }else{
    var client = new DynamoDBClient({ 
      region: process.env.AWS_REGION, 
      credentials: fromEnv() 
    });
  }

  const docClient = DynamoDBDocumentClient.from(client);
  const command = new ScanCommand({
    TableName: MODELS_TABLE,
  });

  const response = await docClient.send(command);

  const models = [];
  for (var i in response.Items) {
    models.push(response.Items[i]);
  }

  res.contentType = 'application/json';
  console.log(models);
  res.json(models);

  return res;

};

const getModelsById = async (req, res) => {

  if (process.env.NODE_ENV == 'production'){
    var client = new DynamoDBClient({ 
      region: process.env.AWS_REGION, 
    });
  }else{
    var client = new DynamoDBClient({ 
      region: process.env.AWS_REGION, 
      credentials: fromEnv() 
    });
  }

  const docClient = DynamoDBDocumentClient.from(client);

  const command = new GetCommand({
    TableName: MODELS_TABLE,
    Key: {
      id: req.params.id,
    },
  });

  const response = await docClient.send(command);
  console.log(response.Item);
  res.json(response.Item)
  return res;
};

const getS3PutUrl = async (req, res) => {
  const s3 = new S3Client({ region: process.env.AWS_REGION });

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: req.query.executionId,
    ContentType: 'application/octet-stream',
  });

  const url = await getSignedUrl(s3, command, { expiresIn: 3600 * 24 });
  res.json({ url });
  return res;
}

const createModelTest = async (req, res) => {
  const sqs = new SQSClient({ region: process.env.AWS_REGION });

  const messageParams = {
    QueueUrl: process.env.SQS_EXECUTION_QUEUE_URL,
    MessageBody: JSON.stringify({
      modelId: req.params.id,
      executionId: req.params.executionId,
      text: req.body.text
    })
  };

  const sendMessageResponse = await sqs.send(new SendMessageCommand(messageParams));
  console.log(sendMessageResponse);
  res.json({ message: "OK" });
  return res;
};

const getModelTest = async (req, res) => {
  if (process.env.NODE_ENV == 'production'){
    var client = new DynamoDBClient({ 
      region: process.env.AWS_REGION, 
    });
  }else{
    var client = new DynamoDBClient({ 
      region: process.env.AWS_REGION, 
      credentials: fromEnv() 
    });
  }

  const docClient = DynamoDBDocumentClient.from(client);

  const command = new GetCommand({
    TableName: process.env.EXECUTIONS_TABLE,
    Key: {
      executionId: req.params.executionId,
    },
  });

  const response = await docClient.send(command);
  res.json({ result: response?.Item?.result })
  return res;
};


export { getModelsById, getModels, getS3PutUrl, createModelTest, getModelTest };
