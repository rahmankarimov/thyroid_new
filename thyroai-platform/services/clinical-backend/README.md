# ThyroAI Backend

Spring Boot 3.2 REST API for the AI-Thyroid Diagnostic Portal.

## Tech Stack

- Java 17, Spring Boot 3.2.5
- Spring Security + JWT (jjwt 0.12.3)
- Spring Data JPA + H2 (dev) / PostgreSQL (prod)
- Springdoc OpenAPI (Swagger UI)
- Lombok, MapStruct

## Setup & Run

### Prerequisites
- Java 17+
- Maven 3.8+

### Development (H2 in-memory)

```bash
cd thyroai-backend
mvn spring-boot:run
```

The application starts on **http://localhost:8080**

### Production (PostgreSQL)

Set environment variables or update `application.properties`:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/thyroaidb
spring.datasource.username=your_user
spring.datasource.password=your_password
spring.jpa.hibernate.ddl-auto=update
spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect
```

## Default Credentials

| Role   | Email               | Password   |
|--------|---------------------|------------|
| Doctor | doctor@clinic.az    | Demo1234   |
| Admin  | admin@clinic.az     | Demo1234   |

## API Endpoints

Base path: `http://localhost:8080/api/v1`

| Method | Path                                    | Access        | Description                  |
|--------|-----------------------------------------|---------------|------------------------------|
| POST   | /auth/login                             | Public        | Login, get JWT token         |
| POST   | /auth/refresh                           | Public        | Refresh access token         |
| POST   | /auth/logout                            | Authenticated | Blacklist token              |
| GET    | /patients                               | Doctor/Admin  | Paginated patient list       |
| GET    | /patients/{id}                          | Doctor/Admin  | Patient with examinations    |
| GET    | /examinations/patient/{patientId}       | Doctor/Admin  | Examinations for patient     |
| GET    | /examinations/{id}                      | Doctor/Admin  | Examination detail           |
| GET    | /image-series/examination/{id}          | Doctor/Admin  | Image series for examination |
| GET    | /annotations/image/{imageSeriesId}      | Doctor/Admin  | Annotations for image        |
| POST   | /annotations                            | Doctor/Admin  | Create annotation            |
| DELETE | /annotations/{id}                       | Admin         | Soft delete annotation       |
| GET    | /pathology/examination/{id}             | Doctor/Admin  | Get pathology result         |
| POST   | /pathology                              | Doctor/Admin  | Submit pathology             |
| GET    | /ai-scores/examination/{id}             | Doctor/Admin  | Get AI score                 |
| GET    | /audit-logs                             | Admin         | Search audit logs            |
| GET    | /audit-logs/export/csv                  | Admin         | Export logs as CSV           |
| GET    | /widget-settings                        | Authenticated | Get widget settings          |
| PUT    | /widget-settings                        | Admin         | Update widget settings       |
| GET    | /retraining/confirmed-cases             | Admin         | Confirmed pathology cases    |
| GET    | /retraining/batch-status                | Admin         | Retraining queue status      |
| POST   | /retraining/approve                     | Admin         | Approve retraining batch     |
| GET    | /retraining/batches                     | Admin         | List approved batches        |

## Swagger UI

Available at: **http://localhost:8080/swagger-ui.html**

## H2 Console (dev only)

Available at: **http://localhost:8080/h2-console**  
JDBC URL: `jdbc:h2:mem:thyroaidb`  
Username: `sa` | Password: *(empty)*

## Authentication

All protected endpoints require a Bearer token:

```
Authorization: Bearer <your-jwt-token>
```

Get a token by POSTing to `/api/v1/auth/login`:

```json
{
  "email": "doctor@clinic.az",
  "password": "Demo1234"
}
```
