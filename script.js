let products = [];
let cart = JSON.parse(localStorage.getItem("cart")) || [];

const menuContainer = document.getElementById("menu-container");
const searchInput = document.getElementById("search-input");
const categoryFilter = document.getElementById("category-filter");

async function loadProducts() {
    menuContainer.textContent = "Loading products...";

    try {
        const response = await fetch("/api/products");

        if (!response.ok) {
            throw new Error("Could not load products");
        }

        products = await response.json();

        displayProducts(products);
    } catch (error) {
        console.error(error);
        menuContainer.textContent = "Unable to load products. Please refresh.";
    }
}

function displayProducts(productList) {
    menuContainer.innerHTML = "";

    productList.forEach(function(product) {
        const card = document.createElement("article");
        card.className = "item";

        card.innerHTML = `
            <img src="${product.image}" alt="${product.name}" loading="lazy">
            <h3>${product.name}</h3>
            <p>Rs. ${product.price}</p>
            ${
                product.sold_out
                ? "<p>Sold Out</p>"
                : `<button type="button" onclick="addToCart(${product.id})">Add to Cart</button>`
            }
        `;

        menuContainer.appendChild(card);
    });
}

function filterProducts() {
    const searchText = searchInput.value.toLowerCase();
    const selectedCategory = categoryFilter.value;

    const filteredProducts = products.filter(function(product) {
        const matchesSearch = product.name.toLowerCase().includes(searchText);
        const matchesCategory =
            selectedCategory === "all" ||
            product.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    displayProducts(filteredProducts);
}

searchInput.addEventListener("input", filterProducts);
categoryFilter.addEventListener("change", filterProducts);

function addToCart(productId) {
    const product = products.find(item => item.id === productId);

    if (!product || product.sold_out) return;

    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    displayCart();
}

function displayCart() {
    const cartItems = document.getElementById("cart-items");
    const cartTotal = document.getElementById("cart-total");

    cartItems.innerHTML = "";
    let total = 0;

    if (cart.length === 0) {
        cartItems.textContent = "Your cart is empty.";
    }

    cart.forEach(function(item) {
        const itemTotal = Number(item.price) * item.quantity;
        total += itemTotal;

        const div = document.createElement("div");

        div.innerHTML = `
            <h3>${item.name}</h3>
            <p>Price: Rs. ${item.price}</p>
            <button onclick="changeQuantity(${item.id}, -1)">-</button>
            <span>${item.quantity}</span>
            <button onclick="changeQuantity(${item.id}, 1)">+</button>
            <button onclick="removeFromCart(${item.id})">Remove</button>
        `;

        cartItems.appendChild(div);
    });

    cartTotal.textContent = total;
    localStorage.setItem("cart", JSON.stringify(cart));
}

function changeQuantity(productId, change) {
    const item = cart.find(product => product.id === productId);

    if (item) {
        item.quantity += change;

        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            displayCart();
        }
    }
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    displayCart();
}

displayCart();
loadProducts();

// Submit customer order to the database
document.getElementById("checkout-form").addEventListener("submit", async function(event) {
    event.preventDefault();

    const message = document.getElementById("checkout-message");

    if (cart.length === 0) {
        message.textContent = "Your cart is empty!";
        return;
    }

    const orderData = {
        customer_name: document.getElementById("customer-name").value.trim(),
        phone: document.getElementById("customer-phone").value.trim(),
        address: document.getElementById("customer-address").value.trim(),
        items: cart.map(item => ({
            product_id: item.id,
            quantity: item.quantity
        }))
    };

    message.textContent = "Placing your order...";

    try {
        const response = await fetch("/api/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(orderData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Order failed.");
        }

        message.textContent = "Order successful! Your order number is #" + result.order_id;

        cart = [];
        displayCart();
        document.getElementById("checkout-form").reset();

    } catch (error) {
        message.textContent = error.message;
    }
});
