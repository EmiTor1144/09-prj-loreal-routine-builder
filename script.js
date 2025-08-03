/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const chatEndpoint = "https://loreal-chatbot.emit1144.workers.dev/";
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineBtn = document.getElementById("generateRoutine");
const favoritesContainer = document.getElementById("favoritesContainer");
const clearFavoritesBtn = document.getElementById("clearFavorites");

/* Track selected products and favorites */
let selectedProducts = [];
let favoriteProducts = [];

/* projec 8 code */
let conversationHistory = [
  {
    role: "system",
    content:
      "You are a helpful assistant for L'Oréal customers. You can only answer questions about L'Oréal products, skincare, haircare, makeup, beauty tips, and cosmetics. If someone asks about topics unrelated to L'Oréal or beauty (like sports, politics, etc.) politely decline and redirect to asking about L'Oréal-related queries. Remember the user's name if they tell you, and refer to previous conversations naturally. Be personable and build rapport. When mentioning specific L'Oréal product names, wrap them in ** symbols like **True Match Foundation** to highlight them.",
  },
];

chatWindow.innerHTML = `<div class="initial-message">👋 Hello Gorgeous! How can I help you today?</div>`;

async function getAIResponse(userMessage) {
  try {
    // Add user message to conversation history
    conversationHistory.push({
      role: "user",
      content: userMessage,
    });

    const response = await fetch(chatEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // No Authorization header needed - the Worker handles the API key
      },
      body: JSON.stringify({
        // Send entire conversation history to maintain context
        messages: conversationHistory,
      }),
    });
    const data = await response.json();
    const botMessage = data.choices[0].message.content;

    // Add bot response to conversation history
    conversationHistory.push({
      role: "assistant",
      content: botMessage,
    });

    // Return the bot message so it can be displayed properly
    return botMessage;
  } catch (error) {
    console.error("Error fetching AI response:", error);
    return "Sorry, I'm having trouble connecting right now. Please try again!";
  }
}
function highlightLorealProducts(text) {
  // Use regex to find text between ** symbols and replace with highlighted version
  const highlightedText = text.replace(
    /\*\*(.*?)\*\*/g,
    '<span class="product-highlight">$1</span>'
  );
  return highlightedText;
}

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card" data-product-id="${product.id}" onclick="toggleProductSelection('${product.id}', '${product.name}', '${product.brand}', '${product.category}')">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
        <button class="details-btn" onclick="event.stopPropagation(); showProductDetails('${product.id}', '${product.name}', '${product.brand}', '${product.category}', '${product.image}', \`${product.description}\`)">
          <i class="fa-solid fa-info-circle"></i> Details
        </button>
      </div>
      <div class="product-actions">
        <div class="favorite-btn" onclick="event.stopPropagation(); toggleFavorite('${product.id}', '${product.name}', '${product.brand}', '${product.category}', '${product.image}')">
          <i class="fa-regular fa-heart" data-product-id="${product.id}"></i>
        </div>
        <div class="selection-indicator">
          <i class="fa-regular fa-circle"></i>
        </div>
      </div>
    </div>
  `
    )
    .join("");

  // Update heart icons for already favorited products
  updateFavoriteIcons();
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});

/* Function to toggle product selection */
function toggleProductSelection(
  productId,
  productName,
  productBrand,
  productCategory
) {
  // Check if product is already selected
  const existingIndex = selectedProducts.findIndex(
    (product) => product.id === productId
  );

  if (existingIndex > -1) {
    // Remove product from selection
    selectedProducts.splice(existingIndex, 1);
    // Update visual indicator
    const productCard = document.querySelector(
      `[data-product-id="${productId}"]`
    );
    const indicator = productCard.querySelector(".selection-indicator i");
    indicator.className = "fa-regular fa-circle";
  } else {
    // Add product to selection
    selectedProducts.push({
      id: productId,
      name: productName,
      brand: productBrand,
      category: productCategory,
    });
    // Update visual indicator
    const productCard = document.querySelector(
      `[data-product-id="${productId}"]`
    );
    const indicator = productCard.querySelector(".selection-indicator i");
    indicator.className = "fa-solid fa-check-circle";
  }

  // Update the selected products display
  updateSelectedProductsDisplay();
}

/* Function to display selected products */
function updateSelectedProductsDisplay() {
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML =
      '<p class="no-products">No products selected yet</p>';
    generateRoutineBtn.disabled = true;
    generateRoutineBtn.style.opacity = "0.5";
  } else {
    selectedProductsList.innerHTML = selectedProducts
      .map(
        (product) => `
        <div class="selected-product">
          <span>${product.name} - ${product.brand}</span>
          <button onclick="toggleProductSelection('${product.id}', '${product.name}', '${product.brand}', '${product.category}')" class="remove-btn">
            <i class="fa-solid fa-times"></i>
          </button>
        </div>
      `
      )
      .join("");

    generateRoutineBtn.disabled = false;
    generateRoutineBtn.style.opacity = "1";
  }
}

/* Generate routine button functionality */
generateRoutineBtn.addEventListener("click", async () => {
  if (selectedProducts.length === 0) {
    return;
  }

  // Create a message for the AI to generate a routine
  const productNames = selectedProducts
    .map((product) => `**${product.name}** by ${product.brand}`)
    .join(", ");
  const routinePrompt = `I have selected these L'Oréal products: ${productNames}. Can you create a personalized beauty routine for me using these products? Please include the order of application, timing (morning/evening), and any tips for best results.`;

  // Show the routine request in chat
  chatWindow.innerHTML += `<div class="msg user"><strong>You:</strong> Generate a routine with my selected products: ${productNames}</div>`;

  // Show loading message
  chatWindow.innerHTML += `<div class="msg bot"><strong>L'OREAL Advisor:</strong> <em>Creating your personalized routine...</em></div>`;

  // Get AI response for routine
  const routineResponse = await getAIResponse(routinePrompt);

  // Highlight L'Oréal products in response
  const highlightedResponse = highlightLorealProducts(routineResponse);

  // Replace loading message with actual response
  const messages = chatWindow.children;
  messages[
    messages.length - 1
  ].innerHTML = `<strong>L'OREAL Advisor:</strong> ${highlightedResponse}`;

  // Scroll to bottom
  chatWindow.scrollTo({
    top: chatWindow.scrollHeight,
    behavior: "smooth",
  });
});

// Initialize the selected products display
updateSelectedProductsDisplay();

/* ============ FAVORITES FUNCTIONALITY ============ */

/* Load favorites from localStorage on page load */
function loadFavorites() {
  const savedFavorites = localStorage.getItem("lorealFavorites");
  if (savedFavorites) {
    favoriteProducts = JSON.parse(savedFavorites);
  }
  updateFavoritesDisplay();
}

/* Save favorites to localStorage */
function saveFavorites() {
  localStorage.setItem("lorealFavorites", JSON.stringify(favoriteProducts));
}

/* Toggle favorite status of a product */
function toggleFavorite(
  productId,
  productName,
  productBrand,
  productCategory,
  productImage
) {
  const existingIndex = favoriteProducts.findIndex(
    (product) => product.id === productId
  );

  if (existingIndex > -1) {
    // Remove from favorites
    favoriteProducts.splice(existingIndex, 1);
  } else {
    // Add to favorites
    favoriteProducts.push({
      id: productId,
      name: productName,
      brand: productBrand,
      category: productCategory,
      image: productImage,
    });
  }

  // Save to localStorage and update displays
  saveFavorites();
  updateFavoritesDisplay();
  updateFavoriteIcons();
}

/* Update the heart icons in product cards based on favorite status */
function updateFavoriteIcons() {
  favoriteProducts.forEach((favorite) => {
    const heartIcon = document.querySelector(
      `[data-product-id="${favorite.id}"].fa-heart`
    );
    if (heartIcon) {
      heartIcon.className = "fa-solid fa-heart favorited";
    }
  });
}

/* Display favorites section */
function updateFavoritesDisplay() {
  if (favoriteProducts.length === 0) {
    favoritesContainer.innerHTML =
      '<p class="no-favorites">No favorite products yet. Click the heart icon on products to save them!</p>';
    clearFavoritesBtn.style.display = "none";
  } else {
    favoritesContainer.innerHTML = favoriteProducts
      .map(
        (product) => `
        <div class="favorite-card" onclick="selectFavoriteProduct('${product.id}', '${product.name}', '${product.brand}', '${product.category}')">
          <img src="${product.image}" alt="${product.name}">
          <div class="favorite-info">
            <h4>${product.name}</h4>
            <p>${product.brand}</p>
          </div>
          <button class="remove-favorite-btn" onclick="event.stopPropagation(); toggleFavorite('${product.id}', '${product.name}', '${product.brand}', '${product.category}', '${product.image}')">
            <i class="fa-solid fa-times"></i>
          </button>
        </div>
      `
      )
      .join("");

    clearFavoritesBtn.style.display = "block";
  }
}

/* Select a favorite product (add to selected products) */
function selectFavoriteProduct(
  productId,
  productName,
  productBrand,
  productCategory
) {
  // Check if already selected
  const existingIndex = selectedProducts.findIndex(
    (product) => product.id === productId
  );

  if (existingIndex === -1) {
    // Add to selected products
    selectedProducts.push({
      id: productId,
      name: productName,
      brand: productBrand,
      category: productCategory,
    });

    updateSelectedProductsDisplay();

    // Show feedback message
    chatWindow.innerHTML += `<div class="msg system"><em>Added <strong>${productName}</strong> to your selected products!</em></div>`;
    chatWindow.scrollTo({
      top: chatWindow.scrollHeight,
      behavior: "smooth",
    });
  }
}

/* Clear all favorites */
clearFavoritesBtn.addEventListener("click", () => {
  if (confirm("Are you sure you want to clear all your favorite products?")) {
    favoriteProducts = [];
    saveFavorites();
    updateFavoritesDisplay();
    updateFavoriteIcons();

    // Show feedback message
    chatWindow.innerHTML += `<div class="msg system"><em>All favorite products have been cleared.</em></div>`;
    chatWindow.scrollTo({
      top: chatWindow.scrollHeight,
      behavior: "smooth",
    });
  }
});

// Load favorites when page loads
loadFavorites();

/* ============ PRODUCT DETAILS MODAL ============ */

let currentModalProduct = null;

/* Show product details in modal */
function showProductDetails(
  productId,
  productName,
  productBrand,
  productCategory,
  productImage,
  productDescription
) {
  // Store current product data
  currentModalProduct = {
    id: productId,
    name: productName,
    brand: productBrand,
    category: productCategory,
    image: productImage,
    description: productDescription,
  };

  // Populate modal with product information
  document.getElementById("modalProductName").textContent = productName;
  document.getElementById("modalProductBrand").textContent = productBrand;
  document.getElementById("modalProductCategory").textContent = `Category: ${
    productCategory.charAt(0).toUpperCase() + productCategory.slice(1)
  }`;
  document.getElementById("modalProductImage").src = productImage;
  document.getElementById("modalProductImage").alt = productName;
  document.getElementById("modalProductDescription").textContent =
    productDescription;

  // Update button states
  updateModalButtonStates();

  // Show modal
  document.getElementById("productModal").style.display = "block";
  document.body.style.overflow = "hidden"; // Prevent background scrolling
}

/* Close product details modal */
function closeProductModal() {
  document.getElementById("productModal").style.display = "none";
  document.body.style.overflow = "auto"; // Restore scrolling
  currentModalProduct = null;
}

/* Update modal button states based on current product */
function updateModalButtonStates() {
  if (!currentModalProduct) return;

  const favoriteBtn = document.getElementById("modalFavoriteBtn");
  const selectBtn = document.getElementById("modalSelectBtn");

  // Check if product is favorited
  const isFavorited = favoriteProducts.some(
    (fav) => fav.id === currentModalProduct.id
  );
  if (isFavorited) {
    favoriteBtn.innerHTML =
      '<i class="fa-solid fa-heart"></i> Remove from Favorites';
    favoriteBtn.classList.add("favorited");
  } else {
    favoriteBtn.innerHTML =
      '<i class="fa-regular fa-heart"></i> Add to Favorites';
    favoriteBtn.classList.remove("favorited");
  }

  // Check if product is selected
  const isSelected = selectedProducts.some(
    (sel) => sel.id === currentModalProduct.id
  );
  if (isSelected) {
    selectBtn.innerHTML =
      '<i class="fa-solid fa-check-circle"></i> Remove from Selection';
    selectBtn.classList.add("selected");
  } else {
    selectBtn.innerHTML = '<i class="fa-solid fa-check"></i> Select Product';
    selectBtn.classList.remove("selected");
  }
}

/* Toggle favorite from modal */
function toggleFavoriteFromModal() {
  if (!currentModalProduct) return;

  toggleFavorite(
    currentModalProduct.id,
    currentModalProduct.name,
    currentModalProduct.brand,
    currentModalProduct.category,
    currentModalProduct.image
  );

  // Update modal button states
  updateModalButtonStates();
}

/* Select/deselect product from modal */
function selectProductFromModal() {
  if (!currentModalProduct) return;

  toggleProductSelection(
    currentModalProduct.id,
    currentModalProduct.name,
    currentModalProduct.brand,
    currentModalProduct.category
  );

  // Update modal button states
  updateModalButtonStates();
}

/* Close modal when clicking outside of it */
window.onclick = function (event) {
  const modal = document.getElementById("productModal");
  if (event.target === modal) {
    closeProductModal();
  }
};

/* Close modal with Escape key */
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    closeProductModal();
  }
});
/* Chat form submission handler - calls OpenAI and displays response */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  // Get the input field by its name or id
  const userInput = chatForm.querySelector("[name='userInput']");
  const userMessage = userInput ? userInput.value.trim() : "";
  if (!userMessage) {
    // Don't send empty messages
    return;
  }

  const highlightedUserMessage = highlightLorealProducts(userMessage);
  chatWindow.innerHTML += `<div class="msg user"><strong>You:</strong> ${highlightedUserMessage}</div>`;

  // Clear input field
  userInput.value = "";

  // Show loading message with bot styling class
  chatWindow.innerHTML += `<div class="msg bot"><strong>L'OREAL Advisor:</strong> <em>Typing...</em></div>`;

  // Get AI response
  const botReply = await getAIResponse(userMessage);

  // Highlight L'Oréal products in bot reply
  const highlightedBotReply = highlightLorealProducts(botReply);

  // Remove loading message and add actual response with product highlighting
  const messages = chatWindow.children;
  messages[
    messages.length - 1
  ].innerHTML = `<strong>L'OREAL Advisor:</strong> ${highlightedBotReply}`;

  // Scroll chat window to bottom
  chatWindow.scrollTo({
    top: chatWindow.scrollHeight,
    behavior: "smooth",
  });

  // Clear input field for next message
  if (userInput) {
    userInput.value = "";
  }
});
