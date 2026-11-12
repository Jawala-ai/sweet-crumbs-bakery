# Sweet Crumbs Bakery

A full-stack bakery ordering website built with HTML, CSS, JavaScript, Node.js, Express and PostgreSQL (Neon).

## Features

- Dynamic product menu loaded from PostgreSQL.
- Product search and category filtering.
- Shopping cart with quantity controls and live total.
- Cart saved using localStorage.
- Customer checkout and order placement.
- Server-side price calculation and order validation.
- Orders stored in PostgreSQL.
- Admin authentication.
- Admin API to view orders and update order status.
- Admin API to add and edit products.
- Sold-out products cannot be ordered.
- Basic order rate limiting.

## Technologies

- HTML, CSS and JavaScript
- Node.js and Express
- PostgreSQL
- Neon Database
- pg and dotenv

## Run Locally

1. Install Node.js.
2. Clone this repository.
3. Open the project folder in a terminal.
4. Install dependencies:

   npm install

5. Create a `.env.local` file using `.env.example` as a guide.
6. Add your Neon PostgreSQL connection string and a private admin password.
7. Start the application:

   npm start

8. Open http://localhost:3000

## Database Tables

- products
- orders
- order_items

The server initializes the database tables and inserts starter products when the products table is empty.

## API Routes

| Method | Route | Description |
|---|---|---|
| GET | /api/products | List products |
| POST | /api/orders | Place an order |
| GET | /api/orders/:id | View order details |
| POST | /api/admin/login | Admin login |
| GET | /api/admin/orders | View all orders |
| PATCH | /api/admin/orders/:id/status | Update order status |
| POST | /api/admin/products | Add a product |
| PATCH | /api/admin/products/:id | Edit a product |

Admin routes require authentication using the x-admin-token header, except the login route.

## Security

- Environment files are excluded from Git.
- Database queries use parameterized SQL.
- Orders are processed using database transactions.
- Customer orders are validated on the server.
- Order requests have rate limiting.

## Project Status

- [x] Part 1: Website foundation
- [x] Part 2: Dynamic menu, search and shopping cart
- [x] Part 3: Express API and PostgreSQL integration
- [x] Part 4: Admin API features and product management
- [ ] Deployment and final documentation verification

## Note

This is an educational demonstration project for a fictional bakery.
