# Medical Schedule - Documentación Técnica

## Descripción General
Sistema de gestión de citas médicas basado en arquitectura serverless con AWS, utilizando arquitectura hexagonal y patrón de comunicación asíncrona para manejar la programación y procesamiento de citas en múltiples países.


### Componentes Principales

- **API Gateway**: Punto de entrada para solicitudes HTTP.
- **Lambda Functions**: Funciones serverless para procesamiento de lógica de negocio.
- **DynamoDB**: Base de datos NoSQL para almacenar información de citas.
- **RDS MySQL**: Base de datos relacional para almacenamiento persistente específico por país.
- **SNS**: Sistema de notificaciones para enrutamiento basado en país.
- **SQS**: Colas para procesamiento asíncrono de citas.
- **EventBridge**: Bus de eventos para gestionar flujos de trabajo y comunicación entre servicios.

## Flujo de Datos

1. **Creación de Cita**:
   - Cliente realiza solicitud POST a `/appointments`.
   - `createAppointment` Lambda procesa la solicitud.
   - La cita se almacena en DynamoDB con estado inicial.
   - Se publica mensaje en SNS con atributo de país.

2. **Enrutamiento por País**:
   - SNS enruta el mensaje a la cola SQS específica del país (PE o CL).
   - Filtrado basado en el atributo `country` del mensaje.

3. **Procesamiento por País**:
   - `processAppointmentPE` o `processAppointmentCL` Lambda se activa.
   - La Lambda accede a la base de datos RDS MySQL, específica por país.
   - Inserta los datos en la tabla `appointment_pe` o `appointment_cl`.
   - Envía evento de confirmación a EventBridge.
, 
4. **Confirmación de Cita**:
   - EventBridge recibe el evento de confirmación.
   - La regla `AppointmentConfirmationRule` enruta el evento a `appointment-confirmation-queue`.
   - `processConfirmation` Lambda procesa el mensaje de la cola.
   - Actualiza el estado de la cita en DynamoDB a "COMPLETED".

5. **Consulta de Citas**:
   - Cliente realiza solicitud GET a `/appointments/{insuredId}`.
   - `getAppointment` Lambda consulta el índice secundario global en DynamoDB.
   - Retorna las citas asociadas al asegurado.

## Componentes Técnicos

### Lambda Functions

1. **createAppointment**:
   - **Ruta**: `POST /appointments`
   - **Responsabilidad**: Crear nuevas citas y almacenarlas en DynamoDB.

2. **getAppointment**:
   - **Ruta**: `GET /appointments/{insuredId}`
   - **Responsabilidad**: Consultar citas existentes por ID de asegurado.

3. **processAppointmentPE**:
   - **Trigger**: Cola SQS `appointment-queue-pe`
   - **Responsabilidad**: Procesar citas para Perú e insertar en RDS.

4. **processAppointmentCL**:
   - **Trigger**: Cola SQS `appointment-queue-cl`
   - **Responsabilidad**: Procesar citas para Chile e insertar en RDS.

5. **processConfirmation**:
   - **Trigger**: Cola SQS `appointment-confirmation-queue`
   - **Responsabilidad**: Actualizar estado de citas en DynamoDB.

### Almacenamiento de Datos

1. **DynamoDB** (`appointments`):
   - **Clave primaria**: `appointmentId`
   - **GSI**: `InsuredIdIndex` (HASH: `insuredId`, RANGE: `dateSchedule`)
   - **Atributos principales**: `appointmentId`, `insuredId`, `dateSchedule`, `status`

2. **RDS MySQL**:
   - **Host**: `appointment-db.c3oi8oiu8nil.us-east-1.rds.amazonaws.com`
   - **Tablas**: `appointment_pe`, `appointment_cl`

### Mensajería

1. **SNS Topic** (`appointment-notifications-topic`):
   - **Suscriptores**: Colas SQS específicas por país
   - **Filtrado**: Atributo `country` (PE/CL)

2. **SQS Queues**:
   - `appointment-queue-pe`: Citas para Perú
   - `appointment-queue-cl`: Citas para Chile
   - `appointment-confirmation-queue`: Confirmaciones de citas

3. **EventBridge**:
   - **Bus**: `appointment-events-bus`
   - **Regla**: `appointment-confirmation-rule`
   - **Patrón**: `source: ["appointment.service"], detail-type: ["AppointmentConfirmation"]`

## Arquitectura Hexagonal

El proyecto sigue la arquitectura hexagonal (puertos y adaptadores) con la siguiente estructura:

```
src/
├── application/          # Casos de uso y handlers de Lambda
│   └── handlers/
├── domain/               # Lógica de negocio y entidades
│   └── entities/
│   └── ports/
└── infrastructure/       # Adaptadores externos (repos, clientes)
    ├── messaging/        # Clientes de SNS, SQS y EventBridge
    └── repositories/     # Acceso a DynamoDB y RDS
```

### Clientes de Infraestructura

1. **DynamoDB Client** (`dynamodb_repository.ts`):
   - Implementa patrón Singleton para reutilización de conexiones
   - Métodos registro, consulta y actualización en DynamoDB: `create_appointment`,`getAppointmentById`, `updateAppointmentStatus` 

2. **EventBridge Client** (`eventbridge_client.ts`):
   - Implementa patrón Singleton
   - Métodos: `sendAppointmentConfirmation`

3. **SQS Client** (`sqs_client.ts`):
   - Implementa patrón Singleton
   - Utilizado para comunicación con colas SQS

4. **SNS Client** (`sns_client.ts`):
   - Implementa patrón Singleton
   - Utilizado para comunicación con notificaciones SNS   

## Configuración

El proyecto utiliza serverless.ts para definir todos los recursos de CloudFormation, incluyendo:

- Funciones Lambda
- Tabla DynamoDB
- Colas SQS
- Temas SNS
- Bus de eventos EventBridge
- Reglas y destinos
- Políticas IAM
- Interface vpc endpoint para comunicacion entre lambdas dentro de VPC e EventBridge

Otros recursos externos:
- VPC que la base de datos RDS mysql
- Security group


## Infraestructura VPC

Las funciones lambda `processAppointmentPE` y `processAppointmentCL` están configuradas con acceso VPC para conectarse a RDS:

- Cuentan con acceso a la base de datos RDS MySQL dentro de la VPC
- Configuradas con timeout de 30 segundos para permitir operaciones de base de datos
- Equipadas con permisos para gestionar interfaces de red en VPC


## Despliegue

El proyecto se despliega usando el framework Serverless:

```bash
serverless deploy --stage dev
```
