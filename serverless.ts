import type { AWS } from "@serverless/typescript";

const vpcConfig = {
  securityGroupIds: ["sg-06e509750fa83bb82"],
  subnetIds: [
    "subnet-0906e513ff3678833",
    "subnet-0d7bf577283b4926e",
    "subnet-07323cc2c96062534",
    "subnet-00d4d2ad98136106d",
  ],
};

const serverlessConfiguration: AWS = {
  service: "appointment",
  frameworkVersion: "3",
  plugins: ["serverless-esbuild"],
  provider: {
    name: "aws",
    runtime: "nodejs18.x",
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true,
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      NODE_OPTIONS: "--enable-source-maps --stack-trace-limit=1000",
      DEMO_REGION: "us-east-1",
      APPOINTMENTS_TABLE: "appointments",
      SNS_TOPIC_ARN: { Ref: "AppointmentTopic" },
      EVENT_BUS_NAME: { Ref: "AppointmentEventBus" },
      CONFIRMATION_QUEUE_URL: { Ref: "AppointmentConfirmationQueue" },
      DB_HOST: "appointment-db.c3oi8oiu8nil.us-east-1.rds.amazonaws.com",
      DB_PORT: "3306",
      DB_NAME: "appointments",
      DB_USER: "admin",
      DB_PASSWORD: "testRDS2025",
      DB_CONNECTION_LIMIT: "10",
      DB_CONNECTION_TIMEOUT: "60000",
    },
    iam: {
      role: {
        statements: [
          {
            Effect: "Allow",
            Action: [
              "dynamodb:GetItem",
              "dynamodb:PutItem",
              "dynamodb:UpdateItem",
              "dynamodb:Scan",
              "dynamodb:Query",
            ],
            Resource: [
              { "Fn::GetAtt": ["AppointmentTable", "Arn"] },
              {
                "Fn::Join": [
                  "",
                  [{ "Fn::GetAtt": ["AppointmentTable", "Arn"] }, "/index/*"],
                ],
              },
            ],
          },
          {
            Effect: "Allow",
            Action: "sns:Publish",
            Resource: "arn:aws:sns:*:*:*",
          },
          {
            Effect: "Allow",
            Action: [
              "sqs:ReceiveMessage",
              "sqs:DeleteMessage",
              "sqs:GetQueueAttributes",
              "sqs:ChangeMessageVisibility",
            ],
            Resource: [
              { "Fn::GetAtt": ["AppointmentQueuePE", "Arn"] },
              { "Fn::GetAtt": ["AppointmentQueueCL", "Arn"] },
              { "Fn::GetAtt": ["AppointmentConfirmationQueue", "Arn"] },
            ],
          },
          {
            Effect: "Allow",
            Action: [
              "ec2:CreateNetworkInterface",
              "ec2:DescribeNetworkInterfaces",
              "ec2:DeleteNetworkInterface",
              "ec2:AssignPrivateIpAddresses",
              "ec2:UnassignPrivateIpAddresses",
            ],
            Resource: "*",
          },
          {
            Effect: "Allow",
            Action: ["events:PutEvents"],
            Resource: [{ "Fn::GetAtt": ["AppointmentEventBus", "Arn"] }],
          },
          {
            Effect: "Allow",
            Action: [
              "logs:CreateLogGroup",
              "logs:CreateLogStream",
              "logs:PutLogEvents"
            ],
            Resource: "arn:aws:logs:*:*:*"
          }
        ],
      },
    },
  },

  package: { individually: true },
  custom: {
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      exclude: [
        "aws-sdk",
        "@aws-sdk/client-dynamodb",
        "@aws-sdk/lib-dynamodb",
        "@aws-sdk/client-sns",
        "@aws-sdk/client-sqs",
        "@aws-sdk/client-eventbridge",
      ],
      target: "node18",
      define: { "require.resolve": undefined },
      platform: "node",
      concurrency: 10,
    },
  },

  functions: {
    createAppointment: {
      handler: "src/application/handlers/create_appointment.handler",
      events: [
        {
          http: {
            method: "post",
            path: "appointments",
            cors: true,
          },
        },
      ],
    },
    getAppointment: {
      handler: "src/application/handlers/get_appointment.handler",
      events: [
        {
          http: {
            method: "get",
            path: "appointments/{insuredId}",
            cors: true,
          },
        },
      ],
    },
    processAppointmentPE: {
      handler: "src/application/handlers/process_appointment_pe.handler",
      events: [
        {
          sqs: {
            arn: { "Fn::GetAtt": ["AppointmentQueuePE", "Arn"] },
            batchSize: 10, //nro. mensajes a procesar por invocacion
          },
        },
      ],
      vpc: vpcConfig,
      timeout: 30,
    },
    processAppointmentCL: {
      handler: "src/application/handlers/process_appointment_cl.handler",
      events: [
        {
          sqs: {
            arn: { "Fn::GetAtt": ["AppointmentQueueCL", "Arn"] },
            batchSize: 10,
          },
        },
      ],
      vpc: vpcConfig,
      timeout: 30,
    },
    processConfirmation: {
      handler: "src/application/handlers/process_confirmation.handler",
      events: [
        {
          sqs: {
            arn: { "Fn::GetAtt": ["AppointmentConfirmationQueue", "Arn"] },
            batchSize: 10,
          },
        },
      ] ,
      timeout: 30, 
    },
  },

  resources: {
    Resources: {
      AppointmentTable: {
        Type: "AWS::DynamoDB::Table",
        Properties: {
          TableName: "appointments",
          BillingMode: "PAY_PER_REQUEST",
          AttributeDefinitions: [
            { AttributeName: "insuredId", AttributeType: "S" },
            { AttributeName: "appointmentId", AttributeType: "S" },
            { AttributeName: "dateSchedule", AttributeType: "S" },
          ],
          KeySchema: [
            { AttributeName: "appointmentId", KeyType: "HASH" }, // key primaria única
          ],
          GlobalSecondaryIndexes: [
            {
              IndexName: "InsuredIdIndex",
              KeySchema: [
                { AttributeName: "insuredId", KeyType: "HASH" }, // filtra por asegurado
                { AttributeName: "dateSchedule", KeyType: "RANGE" }, // ordena por fecha
              ],
              Projection: {
                ProjectionType: "ALL",
              },
            },
          ],
        },
      },

      AppointmentQueuePE: {
        Type: "AWS::SQS::Queue",
        Properties: {
          QueueName: "appointment-queue-pe",
        },
      },

      AppointmentQueueCL: {
        Type: "AWS::SQS::Queue",
        Properties: {
          QueueName: "appointment-queue-cl",
        },
      },

      AppointmentTopic: {
        Type: "AWS::SNS::Topic",
        Properties: {
          TopicName: "appointment-notifications-topic",
        },
      },

      SubscriptionPE: {
        Type: "AWS::SNS::Subscription",
        Properties: {
          Protocol: "sqs",
          Endpoint: { "Fn::GetAtt": ["AppointmentQueuePE", "Arn"] },
          TopicArn: { Ref: "AppointmentTopic" },
          FilterPolicy: '{"country":["PE"]}',
        },
      },

      SubscriptionCL: {
        Type: "AWS::SNS::Subscription",
        Properties: {
          Protocol: "sqs",
          Endpoint: { "Fn::GetAtt": ["AppointmentQueueCL", "Arn"] },
          TopicArn: { Ref: "AppointmentTopic" },
          FilterPolicy: '{"country":["CL"]}',
        },
      },

      QueuePolicyPE: {
        Type: "AWS::SQS::QueuePolicy",
        Properties: {
          Queues: [
            {
              Ref: "AppointmentQueuePE",
            },
          ],
          PolicyDocument: {
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Principal: "*",
                Action: "sqs:SendMessage",
                Resource: {
                  "Fn::GetAtt": ["AppointmentQueuePE", "Arn"],
                },
                Condition: {
                  ArnEquals: {
                    "aws:SourceArn": { Ref: "AppointmentTopic" },
                  },
                },
              },
            ],
          },
        },
      },

      QueuePolicyCL: {
        Type: "AWS::SQS::QueuePolicy",
        Properties: {
          Queues: [
            {
              Ref: "AppointmentQueueCL",
            },
          ],
          PolicyDocument: {
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Principal: "*",
                Action: "sqs:SendMessage",
                Resource: {
                  "Fn::GetAtt": ["AppointmentQueueCL", "Arn"],
                },
                Condition: {
                  ArnEquals: {
                    "aws:SourceArn": { Ref: "AppointmentTopic" },
                  },
                },
              },
            ],
          },
        },
      },

      AppointmentEventBus: {
        Type: "AWS::Events::EventBus",
        Properties: {
          Name: "appointment-events-bus",
        },
      },

      AppointmentConfirmationRule: {
        Type: "AWS::Events::Rule",
        Properties: {
          EventBusName: { Ref: "AppointmentEventBus" },
          Name: "appointment-confirmation-rule",
          Description:
            "Captura los eventos de confirmacion de citas y los envia al SQS",
          EventPattern: {
            source: ["appointment.service"],
            "detail-type": ["AppointmentConfirmation"],
          },
          Targets: [
            {
              Arn: { "Fn::GetAtt": ["AppointmentConfirmationQueue", "Arn"] },
              Id: "AppointmentConfirmationTarget",
              RoleArn: { "Fn::GetAtt": ["EventBridgeToSQSRole", "Arn"] }
            },
          ],
        },
      },

      AppointmentConfirmationQueue: {
        Type: "AWS::SQS::Queue",
        Properties: {
          QueueName: "appointment-confirmation-queue",
          VisibilityTimeout: 60,
        },
      },

      AppointmentConfirmationQueuePolicy: {
        Type: "AWS::SQS::QueuePolicy",
        Properties: {
          Queues: [{ Ref: "AppointmentConfirmationQueue" }],
          PolicyDocument: {
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Principal: { Service: "events.amazonaws.com" },
                Action: "sqs:SendMessage",
                Resource: {
                  "Fn::GetAtt": ["AppointmentConfirmationQueue", "Arn"],
                },
                Condition: {
                  ArnEquals: {
                    "aws:SourceArn": {
                      "Fn::GetAtt": ["AppointmentConfirmationRule", "Arn"],
                    },
                  },
                },
              },
            ],
          },
        },
      },

      EventBridgeToSQSRole: {
        Type: "AWS::IAM::Role",
        Properties: {
          AssumeRolePolicyDocument: {
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Principal: {
                  Service: "events.amazonaws.com",
                },
                Action: "sts:AssumeRole",
              },
            ],
          },
          Policies: [
            {
              PolicyName: "EventBridgeToSQSPolicy",
              PolicyDocument: {
                Version: "2012-10-17",
                Statement: [
                  {
                    Effect: "Allow",
                    Action: "sqs:SendMessage",
                    Resource: {
                      "Fn::GetAtt": ["AppointmentConfirmationQueue", "Arn"],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    },
  },
};

module.exports = serverlessConfiguration;
