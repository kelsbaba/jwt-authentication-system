# JWT Authentication System

A secure RESTful authentication and authorization API built with **Node.js, Express.js, PostgreSQL and JSON Web Tokens (JWT)**.

This project implements user registration, login, role-based access control, token verification, token revocation and automatic cleanup of expired blacklisted tokens.

It demonstrates practical backend development concepts, including password hashing, middleware-based authentication, database integration, secure token management and scheduled background tasks.

## Features

- **User Registration:** Register users with a username, email and password.
- **Secure Password Storage:** Hash passwords using bcrypt before storing them in PostgreSQL.
- **User Login:** Authenticate registered users using their email and password.
- **JWT Authentication:** Generate and verify signed JSON Web Tokens.
- **Protected Routes:** Restrict access to authenticated users.
- **Role-Based Access Control (RBAC):** Separate administrative and standard user permissions.
- **Token Revocation:** Invalidate logged-out JWTs using a database-backed token blacklist.
- **Secure Token Storage:** Store SHA-256 hashes of revoked tokens rather than their original values.
- **Automatic Token Cleanup:** Use node-cron to periodically remove expired blacklist records.
- **PostgreSQL Integration:** Store user accounts and revoked token records in PostgreSQL.
- **Environment Configuration:** Keep database credentials and JWT secrets in environment variables.

## Technology Stack

| Technology | Purpose |
|---|---|
| Node.js | JavaScript runtime |
| Express.js | REST API framework |
| PostgreSQL | Relational database |
| node-postgres (pg) | PostgreSQL connectivity |
| JSON Web Token (jsonwebtoken) | Token generation and verification |
| bcrypt | Password hashing |
| node-cron | Scheduled blacklist cleanup |
| dotenv | Environment variable management |
| Nodemon | Development server auto-restart |
| Git & GitHub | Version control and source code hosting |

## Project Structure

```text
jwt-authentication-system/
│
├── config/
│   └── database.js
│
├── controllers/
│   └── authController.js
│
├── database/
│   └── schema.sql
│
├── middleware/
│   ├── authMiddleware.js
│   └── authorizeRole.js
│
├── routes/
│   └── authRoutes.js
│
├── utils/
│   ├── cleanUpBlacklist.js
│   └── tokenUtils.js
│
├── .gitignore
├── index.js
├── package.json
├── package-lock.json
└── README.md
```

## Getting Started

Follow these instructions to run the project locally.

### Prerequisites

Make sure you have installed:

- Node.js (LTS version recommended)
- npm
- PostgreSQL
- Git
- Postman or another API testing tool

### 1. Clone the Repository

```bash
git clone https://github.com/kelsbaba/jwt-authentication-system.git
```

Navigate into the project directory:

```bash
cd jwt-authentication-system
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project's root directory.

Add the following configuration:

```env
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=jwt_authentication_system
DB_USER=your_database_username
DB_PASSWORD=your_database_password

JWT_SECRET=your_long_random_secret
JWT_EXPIRES_IN=15m
```

Replace the database username, password and JWT secret with your actual configuration.

**Security note:** Use a strong, randomly generated JWT secret. Never commit your `.env` file or expose your database credentials.

### 4. Create the Database

Create a PostgreSQL database named:

```sql
CREATE DATABASE jwt_authentication_system;
```

Connect to the database and execute the schema:

```bash
psql -U your_database_username -d jwt_authentication_system -f database/schema.sql
```

The schema creates two tables:

**Users table**

Stores registered user information, including:

- User ID
- Username
- Email
- Password hash
- Role
- Account creation timestamp

**Token blacklist table**

Stores revoked JWT information, including:

- Record ID
- SHA-256 token hash
- Token expiration timestamp
- Record creation timestamp

### 5. Start the Application

For development:

```bash
npm run dev
```

For normal execution:

```bash
npm start
```

The application runs on:

```text
http://localhost:3000
```

If the server starts successfully, the terminal displays:

```text
Server running on port 3000
```

## API Documentation

The application exposes the following endpoints.

### Authentication Endpoints

| Method | Endpoint | Description | Authentication |
|---|---|---|---|
| POST | `/api/auth/register` | Register a new user | Not required |
| POST | `/api/auth/login` | Authenticate a user | Not required |
| POST | `/api/auth/logout` | Revoke the current JWT | Required |

### General Endpoints

| Method | Endpoint | Description | Authentication |
|---|---|---|---|
| GET | `/` | Application welcome message | Not required |
| GET | `/test-db` | Test PostgreSQL connectivity | Not required |
| GET | `/api/protected` | Access a protected resource | Required |
| GET | `/api/admin` | Access an administrator-only resource | Admin |
| GET | `/api/user` | Access a standard-user resource | User |

### Registration

**Request**

```http
POST /api/auth/register
Content-Type: application/json
```

```json
{
  "username": "john",
  "email": "john@example.com",
  "password": "password123"
}
```

The password must contain at least eight characters.

**Successful response:**

HTTP `201 Created`

### Login

**Request**

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Successful response:**

HTTP `200 OK`

The response includes an access token and user information.

### Accessing Protected Routes

Include the JWT returned during login in the Authorization header.

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

Example:

```http
GET /api/protected
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### Logout and Token Revocation

**Request**

```http
POST /api/auth/logout
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Successful response:**

```json
{
  "message": "Logout successful. Token has been revoked."
}
```

After logout, attempting to reuse the revoked token returns HTTP `401 Unauthorized`.

## Authentication and Authorization Flow

The application follows this authentication process:

1. A user registers with a username, email and password.
2. The password is hashed using bcrypt before being stored in PostgreSQL.
3. The user logs in with their registered credentials.
4. The application verifies the submitted password against the stored password hash.
5. A signed JWT is generated and returned to the user.
6. The user includes the JWT in the Authorization header when accessing protected routes.
7. Authentication middleware verifies the JWT, checks the blacklist and retrieves the current user information from PostgreSQL.
8. Authorization middleware checks the user's role before granting access to restricted resources.

### Role-Based Access Control

The application supports two roles:

| Role | Permissions |
|---|---|
| Admin | Access to administrator-only resources |
| User | Access to standard-user resources |

The authorization middleware ensures that authenticated users can only access resources permitted by their assigned roles.

## Token Revocation and Automatic Cleanup

This project implements database-backed JWT revocation.

When a user logs out:

1. The authentication middleware verifies the JWT.
2. The token is hashed using SHA-256.
3. The token hash and expiration timestamp are stored in the `token_blacklist` table.
4. Subsequent requests using that token are rejected.

### Automatic Blacklist Cleanup

The project uses **node-cron** to schedule automatic removal of expired token records.

The cleanup task runs every hour.

```javascript
cron.schedule("0 * * * *", async () => {
    console.log("Running scheduled blacklist cleanup...");
    await cleanUpBlacklist();
});
```

The cleanup utility executes:

```sql
DELETE FROM token_blacklist
WHERE expires_at <= CURRENT_TIMESTAMP;
```

This prevents expired blacklist records from accumulating indefinitely.

## HTTP Status Codes

The API uses standard HTTP response codes.

| Status Code | Meaning |
|---|---|
| 200 | Request successful |
| 201 | Resource successfully created |
| 400 | Invalid or incomplete request |
| 401 | Authentication required or invalid, expired or revoked token |
| 403 | Authenticated user lacks the required permissions |
| 409 | Duplicate username or email |
| 500 | Internal server error |

## Testing

The application endpoints and authentication workflows have been manually tested using Postman.

Testing covered:

- User registration and login.
- Password verification.
- JWT generation and validation.
- Access to protected endpoints.
- Admin and standard-user authorization.
- Token revocation during logout.
- Rejection of previously revoked tokens.
- Database-backed blacklist verification.
- Automatic cleanup of expired blacklist records.
- PostgreSQL connectivity.

## Security Considerations

- Passwords are hashed using bcrypt before database storage.
- JWTs are signed using a secret stored in environment variables.
- Revoked tokens are stored as SHA-256 hashes.
- Protected endpoints require valid authentication.
- Role-based authorization prevents unauthorized access.
- Environment files containing secrets are excluded from Git.

## Future Improvements

Potential enhancements include:

- Automated integration and unit testing.
- Refresh token implementation.
- Rate limiting and login attempt protection.
- Improved request validation.
- API documentation using Swagger/OpenAPI.
- Centralized error-handling middleware.
- Production deployment and monitoring.

## Author

**Esegine Sunday Kelly**

Backend Software Engineer

GitHub: [@kelsbaba](https://github.com/kelsbaba)

## License

This project is licensed under the ISC License.