const products = [
    {
        id: 1,
        name: "Chocolate Cake",
        price: 1200,
        category: "cakes",
        image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&h=400&q=75"
    },
    {
        id: 2,
        name: "Vanilla Cupcakes",
        price: 500,
        category: "cupcakes",
        image: "https://images.unsplash.com/photo-1486427944299-d1955d23e34d?auto=format&fit=crop&w=600&h=400&q=75"
    },
    {
        id: 3,
        name: "Chocolate Brownies",
        price: 350,
        category: "brownies",
        image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&h=400&q=75"
    },
    {
        id: 4,
        name: "Sweet Donuts",
        price: 300,
        category: "donuts",
        image: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=600&h=400&q=75"
    },
    {
        id: 5,
        name: "Chocolate Cookies",
        price: 250,
        category: "cookies",
        image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=600&h=400&q=75"
    },
    {
        id: 6,
        name: "Birthday Cake",
        price: 1500,
        category: "cakes",
        image: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=600&h=400&q=75"
    }
];
const menuContainer = document.getElementById("menu-container");

function displayProducts(productList) {
    menuContainer.innerHTML = "";

    productList.forEach(function(product) {
        const card = document.createElement("article");

        card.className = "item";

        card.innerHTML = `
            <img src="${product.image}" alt="${product.name}" loading="lazy">
            <h3>${product.name}</h3>
            <p>Rs. ${product.price}</p>
            <button type="button" onclick="addToCart(${product.id})">
                Add to Cart
            </button>
        `;

        menuContainer.appendChild(card);
    });
}

displayProducts(products);
const searchInput = document.getElementById("search-input");
const categoryFilter = document.getElementById("category-filter");

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
searchInput.addEventListener("input",filterProducts);
categoryFilter.addEventListener("change",filterProducts);
let cart = JSON.parse(localStorage.getItem("cart")) || [];

function addToCart(productId) {
    const product = products.find(function(item) {
        return item.id === productId;
    });

    const existingItem = cart.find(function(item) {
        return item.id === productId;
    });

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            ...product,
            quantity: 1
        });
    }

    displayCart();
}
function addToCart(productId) {
    const product = products.find(function(item) {
        return item.id === productId;
    });

    const existingItem = cart.find(function(item) {
        return item.id === productId;
    });

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            ...product,
            quantity: 1
        });
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
        const itemTotal = item.price * item.quantity;
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
    localStorage.setItem("cart",JSON.stringify(cart));
}
function changeQuantity(productId, change) {
    const item = cart.find(function(product) {
        return product.id === productId;
    });

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
    cart = cart.filter(function(item) {
        return item.id !== productId;
    });

    displayCart();
}
displayCart();