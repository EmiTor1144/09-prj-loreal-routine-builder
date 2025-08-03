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
const productSearch = document.getElementById("productSearch");
const clearSearchBtn = document.getElementById("clearSearch");
const searchResults = document.getElementById("searchResults");
const resultsCount = document.getElementById("resultsCount");
const clearAllFiltersBtn = document.getElementById("clearAllFilters");

/* Track selected products and favorites */
let selectedProducts = [];
let favoriteProducts = [];
let allProducts = []; // Store all products for filtering
let currentFilters = {
  category: "",
  search: "",
};

/* projec 8 code */
let conversationHistory = [
  {
    role: "system",
    content:
      "You are a helpful L'Oréal beauty advisor with access to real-time web search capabilities. You can search for the latest information about L'Oréal products, beauty trends, ingredient research, product reviews, and skincare/makeup routines. When users ask about L'Oréal products or beauty topics, always search for the most current information available online. Include relevant links, citations, and recent product launches or updates in your responses. You can answer questions about all beauty brands in the L'Oréal family including CeraVe, Maybelline, La Roche-Posay, Lancôme, Urban Decay, Kiehl's, Garnier, Vichy, Kérastase, SkinCeuticals, Redken, and YSL Beauty. When mentioning specific product names, wrap them in ** symbols like **True Match Foundation** to highlight them. If someone asks about topics unrelated to beauty or cosmetics, politely redirect them to beauty-related queries. Always provide up-to-date information and include sources when possible.",
  },
];

chatWindow.innerHTML = `<div class="initial-message">👋 Hello Gorgeous! How can I help you today?</div>`;

/* ============ SNAP SCROLLING FUNCTIONALITY ============ */

// Enhanced scroll function that snaps to individual messages
function snapToMessage(messageElement, delay = 0) {
  setTimeout(() => {
    if (messageElement && chatWindow.contains(messageElement)) {
      messageElement.scrollIntoView({
        behavior: "smooth",
        block: "end",
        inline: "nearest",
      });
    }
  }, delay);
}

// Function to add message with smooth snap scrolling
function addMessageToChat(messageHTML, messageClass = "", snapDelay = 100) {
  // Create a new message element
  const messageDiv = document.createElement("div");
  messageDiv.innerHTML = messageHTML;

  // Add any additional classes
  if (messageClass) {
    messageDiv.classList.add(messageClass);
  }

  // Add the message to chat window
  chatWindow.appendChild(messageDiv);

  // Snap to the new message
  snapToMessage(messageDiv, snapDelay);

  return messageDiv;
}

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
        // Note: Web search capabilities depend on your Cloudflare Worker setup
        // The following options may need to be configured in your Worker:
        web_search: true,
        model: "gpt-4o", // Use the latest model available
        include_citations: true,
        max_tokens: 1200, // Allow for longer responses with web search results
      }),
    });

    const data = await response.json();
    let botMessage = data.choices[0].message.content;

    // Check if there are web search results or citations in the response
    if (data.web_search_results || data.citations) {
      // Format citations and links if available
      botMessage = formatResponseWithCitations(
        botMessage,
        data.web_search_results,
        data.citations
      );
    } else if (data.search_results) {
      // Alternative format for search results
      botMessage = formatResponseWithCitations(botMessage, data.search_results);
    }

    // Add bot response to conversation history
    conversationHistory.push({
      role: "assistant",
      content: botMessage,
    });

    // Return the bot message so it can be displayed properly
    return botMessage;
  } catch (error) {
    console.error("Error fetching AI response:", error);
    // Enhanced error message for web search issues
    return "Sorry, I'm having trouble connecting to get the latest information right now. Please try again, and I'll do my best to help with current L'Oréal product information!";
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

/* Format AI response with web search citations and links */
function formatResponseWithCitations(message, webSearchResults, citations) {
  let formattedMessage = message;

  // Add web search results section if available
  if (webSearchResults && webSearchResults.length > 0) {
    formattedMessage += "\n\n**Recent Information:**\n";
    webSearchResults.slice(0, 3).forEach((result, index) => {
      formattedMessage += `\n${index + 1}. [${result.title}](${
        result.url
      })\n   ${result.snippet || result.description || ""}\n`;
    });
  }

  // Add citations section if available
  if (citations && citations.length > 0) {
    formattedMessage += "\n\n**Sources:**\n";
    citations.forEach((citation, index) => {
      if (citation.url) {
        formattedMessage += `\n[${index + 1}] [${
          citation.title || citation.source || "Source"
        }](${citation.url})\n`;
      }
    });
  }

  return formattedMessage;
}

/* Enhanced function to make links clickable in chat messages */
function formatLinksInMessage(text) {
  // Convert markdown links [text](url) to HTML links
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  return text.replace(
    linkRegex,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="chat-link">$1 <i class="fa-solid fa-external-link-alt"></i></a>'
  );
}

/* Show initial placeholder until user selects a category or searches */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category or search for products
  </div>
`;

/* Initialize the application */
async function initializeApp() {
  // Load all products into memory
  await loadProducts();
  // Load favorites from localStorage
  loadFavorites();
  // Initialize selected products display
  updateSelectedProductsDisplay();
}

/* Load product data from JSON file */
async function loadProducts() {
  if (allProducts.length === 0) {
    const response = await fetch("products.json");
    const data = await response.json();
    allProducts = data.products;
  }
  return allProducts;
}

/* Filter products based on current filters */
function getFilteredProducts() {
  let filteredProducts = [...allProducts];

  // Apply category filter
  if (currentFilters.category) {
    filteredProducts = filteredProducts.filter(
      (product) => product.category === currentFilters.category
    );
  }

  // Apply search filter
  if (currentFilters.search) {
    const searchTerm = currentFilters.search.toLowerCase();
    filteredProducts = filteredProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.brand.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm) ||
        product.category.toLowerCase().includes(searchTerm)
    );
  }

  return filteredProducts;
}

/* Update products display and search results info */
function updateProductsDisplay() {
  const filteredProducts = getFilteredProducts();

  if (filteredProducts.length === 0) {
    // Show no results message
    productsContainer.innerHTML = `
      <div class="no-results-message">
        <i class="fa-solid fa-search"></i>
        <h3>No products found</h3>
        <p>Try adjusting your search terms or category filter</p>
      </div>
    `;
  } else {
    displayProducts(filteredProducts);
  }

  // Update search results info
  updateSearchResultsInfo(filteredProducts.length);
}

/* Update search results information */
function updateSearchResultsInfo(count) {
  const hasFilters = currentFilters.category || currentFilters.search;

  if (hasFilters && allProducts.length > 0) {
    searchResults.style.display = "flex";
    resultsCount.textContent = `${count} of ${allProducts.length} products found`;
  } else {
    searchResults.style.display = "none";
  }

  // Show/hide clear search button
  if (currentFilters.search) {
    clearSearchBtn.style.display = "block";
  } else {
    clearSearchBtn.style.display = "none";
  }
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
  await loadProducts(); // Ensure products are loaded
  currentFilters.category = e.target.value;
  updateProductsDisplay();
});

/* Search functionality */
productSearch.addEventListener("input", async (e) => {
  await loadProducts(); // Ensure products are loaded
  currentFilters.search = e.target.value.trim();
  updateProductsDisplay();
});

/* Clear search button */
clearSearchBtn.addEventListener("click", () => {
  productSearch.value = "";
  currentFilters.search = "";
  updateProductsDisplay();
  productSearch.focus();
});

/* Clear all filters button */
clearAllFiltersBtn.addEventListener("click", () => {
  // Reset category filter
  categoryFilter.selectedIndex = 0;
  currentFilters.category = "";

  // Reset search
  productSearch.value = "";
  currentFilters.search = "";

  // Show initial placeholder
  productsContainer.innerHTML = `
    <div class="placeholder-message">
      Select a category or search for products
    </div>
  `;

  updateSearchResultsInfo(0);
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
  const userMessage = addMessageToChat(
    `<div class="msg user"><strong>You:</strong> Generate a routine with my selected products: ${productNames}</div>`
  );

  // Show loading message with web search indication
  const loadingMessage = addMessageToChat(
    `<div class="msg bot"><strong>L'OREAL Advisor:</strong> <em>Creating your personalized routine with latest product information... <i class="fa-solid fa-search"></i></em></div>`,
    "",
    200
  );

  // Get AI response for routine
  const routineResponse = await getAIResponse(routinePrompt);

  // Format links and highlight L'Oréal products in response
  let formattedResponse = formatLinksInMessage(routineResponse);
  formattedResponse = highlightLorealProducts(formattedResponse);

  // Replace loading message with actual response
  loadingMessage.innerHTML = `<div class="msg bot"><strong>L'OREAL Advisor:</strong> ${formattedResponse}</div>`;

  // Snap to the completed response
  snapToMessage(loadingMessage, 300);
});

// Initialize the application
initializeApp();

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
  const userMessageElement = addMessageToChat(
    `<div class="msg user"><strong>You:</strong> ${highlightedUserMessage}</div>`
  );

  // Clear input field
  userInput.value = "";

  // Show loading message with web search indication
  const loadingMessage = addMessageToChat(
    `<div class="msg bot"><strong>L'OREAL Advisor:</strong> <em>Searching for the latest information... <i class="fa-solid fa-search"></i></em></div>`,
    "",
    200
  );

  // Get AI response
  const botReply = await getAIResponse(userMessage);

  // Format links and highlight L'Oréal products in bot reply
  let formattedBotReply = formatLinksInMessage(botReply);
  formattedBotReply = highlightLorealProducts(formattedBotReply);

  // Replace loading message with actual response
  loadingMessage.innerHTML = `<div class="msg bot"><strong>L'OREAL Advisor:</strong> ${formattedBotReply}</div>`;

  // Snap to the completed bot response
  snapToMessage(loadingMessage, 300);

  // Clear input field for next message
  if (userInput) {
    userInput.value = "";
  }
});

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
    addMessageToChat(
      `<div class="msg system"><em>Added <strong>${productName}</strong> to your selected products!</em></div>`,
      "",
      100
    );
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
