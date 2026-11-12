require("dotenv").config({ path: ".env.local" });

const express = require("express");
const { Pool } = require("pg");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(express.static(__dirname, { dotfiles: "ignore" }));

// Basic order rate limit: 10 orders per IP per 15 minutes
const requests = new Map();

app.use("/api/orders", (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    const record = requests.get(ip);

    if (record && now - record.start < 15 * 60 * 1000 && record.count >= 10) {
        return res.status(429).json({ error: "Too many orders. Try again later." });
    }

    if (!record || now - record.start >= 15 * 60 * 1000) {
        requests.set(ip, { start: now, count: 1 });
    } else {
        record.count++;
    }

    next();
});

// Create tables and insert starter products
// ===== ADMIN LOGIN AND MANAGEMENT =====

function requireAdmin(req, res, next) {
    const token = req.headers["x-admin-token"];

    if (!process.env.ADMIN_PASSWORD || token !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: "Unauthorized. Admin login required." });
    }

    next();
}

// Admin login
app.post("/api/admin/login", (req, res) => {
    const { password } = req.body;

    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: "Incorrect password." });
    }

    res.json({ message: "Admin login successful.", token: password });
});

// View all orders
app.get("/api/admin/orders", requireAdmin, async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM orders ORDER BY created_at DESC");
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: "Could not load orders." });
    }
});

// Update order status
app.patch("/api/admin/orders/:id/status", requireAdmin, async (req, res) => {
    const { status } = req.body;
    const allowed = ["new", "confirmed", "delivered", "cancelled"];

    if (!allowed.includes(status)) {
        return res.status(400).json({ error: "Invalid order status." });
    }

    try {
        const result = await pool.query(
            "UPDATE orders SET status = $1 WHERE id = $2 RETURNING *",
            [status, req.params.id]
        );

        if (!result.rows.length) {
            return res.status(404).json({ error: "Order not found." });
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: "Could not update order." });
    }
});

// Add product
app.post("/api/admin/products", requireAdmin, async (req, res) => {
    const { name, price, category, image } = req.body;

    if (!name || !category || !Number.isFinite(Number(price)) || Number(price) <= 0) {
        return res.status(400).json({ error: "Valid name, price and category required." });
    }

    try {
        const result = await pool.query(
            "INSERT INTO products (name, price, category, image) VALUES ($1, $2, $3, $4) RETURNING *",
            [name, Number(price), category, image || ""]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: "Could not add product." });
    }
});

// Edit product
app.patch("/api/admin/products/:id", requireAdmin, async (req, res) => {
    const { name, price, category, image, sold_out } = req.body;

    try {
        const result = await pool.query(
            `UPDATE products
             SET name = COALESCE($1, name),
                 price = COALESCE($2, price),
                 category = COALESCE($3, category),
                 image = COALESCE($4, image),
                 sold_out = COALESCE($5, sold_out)
             WHERE id = $6 RETURNING *`,
            [name ?? null, price ?? null, category ?? null, image ?? null, sold_out ?? null, req.params.id]
        );

        if (!result.rows.length) {
            return res.status(404).json({ error: "Product not found." });
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: "Could not update product." });
    }
});

async function initializeDatabase() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            price NUMERIC(10,2) NOT NULL,
            category VARCHAR(50),
            image TEXT,
            sold_out BOOLEAN DEFAULT FALSE
        );

        CREATE TABLE IF NOT EXISTS orders (
            id SERIAL PRIMARY KEY,
            customer_name VARCHAR(100) NOT NULL,
            phone VARCHAR(20) NOT NULL,
            address TEXT NOT NULL,
            total NUMERIC(10,2) NOT NULL,
            status VARCHAR(20) DEFAULT 'new',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS order_items (
            id SERIAL PRIMARY KEY,
            order_id INTEGER REFERENCES orders(id),
            product_id INTEGER REFERENCES products(id),
            quantity INTEGER NOT NULL,
            price NUMERIC(10,2) NOT NULL
        );
    `);

    const count = await pool.query("SELECT COUNT(*) FROM products");

    if (Number(count.rows[0].count) === 0) {
        await pool.query(`
            INSERT INTO products (name, price, category, image) VALUES
            ('Chocolate Cake', 1200, 'cakes', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587'),
            ('Vanilla Cupcakes', 500, 'cupcakes', 'https://images.unsplash.com/photo-1486427944299-d1955d23e34d'),
            ('Chocolate Brownies', 350, 'brownies', 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c'),
            ('Sweet Donuts', 300, 'donuts', 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e'),
            ('Chocolate Cookies', 250, 'cookies', 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e'),
            ('Birthday Cake', 1500, 'cakes', 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3')
        `);
    }

    console.log("Database initialized successfully!");
}

// Get products
app.get("/api/products", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM products ORDER BY id"
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Could not load products" });
    }
});

// Create order
app.post("/api/orders", async (req, res) => {
    const { customer_name, phone, address, items } = req.body;

    if (!customer_name || !phone || !address ||
        !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "All order fields are required." });
    }

    if (customer_name.length > 100 || address.length > 2000 ||
        !/^[+0-9\s()-]{7,20}$/.test(phone)) {
        return res.status(400).json({ error: "Invalid customer details." });
    }

    if (items.some(item =>
        !Number.isInteger(Number(item.product_id)) ||
        !Number.isInteger(Number(item.quantity)) ||
        Number(item.quantity) < 1 || Number(item.quantity) > 20
    )) {
        return res.status(400).json({ error: "Invalid product or quantity." });
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        let total = 0;
        const orderProducts = [];

        for (const item of items) {
            const result = await client.query(
                "SELECT id, price, sold_out FROM products WHERE id = $1 FOR UPDATE",
                [item.product_id]
            );

            if (!result.rows.length || result.rows[0].sold_out) {
                throw new Error("A product is unavailable.");
            }

            const product = result.rows[0];
            const quantity = Number(item.quantity);
            const price = Number(product.price);

            total += price * quantity;
            orderProducts.push({ id: product.id, quantity, price });
        }

        const order = await client.query(
            `INSERT INTO orders (customer_name, phone, address, total)
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [customer_name, phone, address, total]
        );

        const orderId = order.rows[0].id;

        for (const item of orderProducts) {
            await client.query(
                `INSERT INTO order_items (order_id, product_id, quantity, price)
                 VALUES ($1, $2, $3, $4)`,
                [orderId, item.id, item.quantity, item.price]
            );
        }

        await client.query("COMMIT");

        res.status(201).json({
            message: "Order placed successfully!",
            order_id: orderId,
            total
        });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error(error);
        res.status(400).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Get order details
app.get("/api/orders/:id", async (req, res) => {
    try {
        const order = await pool.query(
            "SELECT * FROM orders WHERE id = $1",
            [req.params.id]
        );

        if (!order.rows.length) {
            return res.status(404).json({ error: "Order not found." });
        }

        const items = await pool.query(
            `SELECT oi.*, p.name
             FROM order_items oi
             JOIN products p ON p.id = oi.product_id
             WHERE oi.order_id = $1`,
            [req.params.id]
        );

        res.json({ order: order.rows[0], items: items.rows });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Could not retrieve order." });
    }
});

initializeDatabase()
    .then(() => {
        app.listen(PORT, () => console.log(`Bakery server running on port ${PORT}`));
    })
    .catch(error => {
        console.error("Database connection failed:", error);
        process.exit(1);
    });




