// GlowCart Main Application Logic

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  let cart = JSON.parse(localStorage.getItem('glowcart_cart')) || [];
  let wishlist = (JSON.parse(localStorage.getItem('glowcart_wishlist')) || []).map(id => parseInt(id, 10));
  let activeCategory = 'all';
  let searchQuery = '';

  // DOM Elements
  const productGrid = document.getElementById('product-grid');
  const cartDrawer = document.getElementById('cart-drawer');
  const cartOverlay = document.getElementById('cart-overlay');
  const cartToggleBtn = document.getElementById('cart-toggle-btn');
  const closeCartBtn = document.getElementById('close-cart-btn');
  const cartItemsContainer = document.getElementById('cart-items-container');
  const cartSubtotalEl = document.getElementById('cart-subtotal');
  const cartBadge = document.getElementById('cart-badge');
  const wishlistBadge = document.getElementById('wishlist-badge');
  const wishlistNavBtn = document.getElementById('wishlist-btn');
  const searchInput = document.getElementById('search-input');
  const categoryTabs = document.querySelectorAll('.tab-btn');
  const checkoutBtn = document.getElementById('checkout-btn');

  // Modals
  const quickViewModal = document.getElementById('quick-view-modal');
  const quickViewClose = document.getElementById('quick-view-close');
  const checkoutModal = document.getElementById('checkout-modal');
  const checkoutClose = document.getElementById('checkout-close');
  const checkoutForm = document.getElementById('checkout-form');

  // Initialize Render
  renderProducts();
  updateCartUI();
  updateWishlistUI();

  // Category Tab Filtering
  categoryTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      categoryTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeCategory = tab.dataset.category;
      renderProducts();
    });
  });

  // Search Filtering
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderProducts();
    });
  }

  // Document-level event delegation for Add to Cart & Wishlist Toggle
  document.addEventListener('click', (e) => {
    // Add to Cart Delegation
    const cartBtn = e.target.closest('.add-cart-btn');
    if (cartBtn && cartBtn.dataset.addId) {
      const id = parseInt(cartBtn.dataset.addId, 10);
      if (!isNaN(id)) {
        window.addToCart(id);
      }
      return;
    }

    // Wishlist Toggle Delegation
    const wishlistBtn = e.target.closest('.wishlist-btn');
    if (wishlistBtn && wishlistBtn.dataset.wishlistId) {
      e.preventDefault();
      e.stopPropagation();
      const id = parseInt(wishlistBtn.dataset.wishlistId, 10);
      if (!isNaN(id)) {
        window.toggleWishlist(id, e);
      }
      return;
    }
  });

  // Top Navbar Wishlist Button Handler
  if (wishlistNavBtn) {
    wishlistNavBtn.addEventListener('click', () => {
      let wishlistedProducts = products.filter(p => wishlist.includes(p.id));
      if (wishlistedProducts.length === 0) {
        showToast('Your Wishlist is empty! Click ❤️ on any product to save it.', 'info');
      } else {
        renderCustomProductList(wishlistedProducts, '❤️ Your Saved Wishlist');
      }
    });
  }

  // Render Product Catalog
  function renderProducts() {
    let filtered = products.filter(p => {
      const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery) || 
                            p.description.toLowerCase().includes(searchQuery);
      return matchesCategory && matchesSearch;
    });

    if (filtered.length === 0) {
      productGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);">
          <i class="fa-solid fa-sparkles" style="font-size: 3rem; margin-bottom: 1rem;"></i>
          <h3>No radiant products found</h3>
          <p>Try searching for another keyword or selecting a different category.</p>
        </div>
      `;
      return;
    }

    productGrid.innerHTML = filtered.map(product => {
      const isWishlisted = wishlist.includes(product.id);
      return `
        <div class="product-card" data-id="${product.id}">
          <div class="product-img-container">
            ${product.badge ? `<span class="badge-tag">${product.badge}</span>` : ''}
            <button class="wishlist-btn ${isWishlisted ? 'active' : ''}" data-wishlist-id="${product.id}" title="${isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}">
              <i class="${isWishlisted ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
            </button>
            <img src="${product.image}" alt="${product.name}" class="product-img" onclick="openQuickView(${product.id})">
          </div>
          <div class="product-details">
            <span class="product-category">${product.category}</span>
            <h3 class="product-title" onclick="openQuickView(${product.id})" style="cursor:pointer;">${product.name}</h3>
            <div class="rating-bar">
              <i class="fa-solid fa-star"></i>
              <span>${product.rating}</span>
              <span class="rating-count">(${product.reviewsCount})</span>
            </div>
            <div class="product-footer">
              <div class="price-box">
                <span class="current-price">$${product.price.toFixed(2)}</span>
                ${product.originalPrice ? `<span class="original-price">$${product.originalPrice.toFixed(2)}</span>` : ''}
              </div>
              <button class="add-cart-btn" data-add-id="${product.id}">
                <i class="fa-solid fa-bag-shopping"></i> Add
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Wishlist Toggle Logic
  window.toggleWishlist = (id, event) => {
    if (event) event.stopPropagation();
    const numId = parseInt(id, 10);
    const product = products.find(p => p.id === numId);
    const index = wishlist.indexOf(numId);

    if (index > -1) {
      wishlist.splice(index, 1);
      showToast(`Removed "${product ? product.name : 'item'}" from Wishlist`, 'info');
    } else {
      wishlist.push(numId);
      showToast(`❤️ Added "${product ? product.name : 'item'}" to your Wishlist!`, 'success');
    }

    localStorage.setItem('glowcart_wishlist', JSON.stringify(wishlist));
    updateWishlistUI();
    renderProducts();
  };

  function updateWishlistUI() {
    wishlistBadge.textContent = wishlist.length;
    wishlistBadge.classList.toggle('active', wishlist.length > 0);
  }

  // Cart Logic
  window.addToCart = (id, quantity = 1) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    const existing = cart.find(item => item.id === id);

    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.push({ ...product, quantity });
    }

    saveCart();
    updateCartUI();
    openCartDrawer();
    showToast(`Added "${product.name}" to cart!`, 'success');
  };

  window.updateQuantity = (id, change) => {
    const item = cart.find(i => i.id === id);
    if (!item) return;

    item.quantity += change;
    if (item.quantity <= 0) {
      cart = cart.filter(i => i.id !== id);
    }

    saveCart();
    updateCartUI();
  };

  window.removeFromCart = (id) => {
    cart = cart.filter(i => i.id !== id);
    saveCart();
    updateCartUI();
    showToast('Item removed from cart', 'info');
  };

  function saveCart() {
    localStorage.setItem('glowcart_cart', JSON.stringify(cart));
  }

  function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    cartBadge.textContent = totalItems;
    cartBadge.classList.toggle('active', totalItems > 0);
    cartSubtotalEl.textContent = `$${subtotal.toFixed(2)}`;

    if (cart.length === 0) {
      cartItemsContainer.innerHTML = `
        <div class="cart-empty-state">
          <i class="fa-solid fa-basket-shopping"></i>
          <p style="font-weight: 700;">Your cart is empty</p>
          <span style="font-size: 0.85rem;">Discover our glow products to get started!</span>
        </div>
      `;
    } else {
      cartItemsContainer.innerHTML = cart.map(item => `
        <div class="cart-item">
          <img src="${item.image}" alt="${item.name}" class="cart-item-img">
          <div class="cart-item-info">
            <h4 class="cart-item-name">${item.name}</h4>
            <div class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
            <div class="qty-control">
              <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
              <span class="qty-count">${item.quantity}</span>
              <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
            </div>
          </div>
          <button class="cart-item-remove" onclick="removeFromCart(${item.id})">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      `).join('');
    }
  }

  // Cart Drawer Control
  cartToggleBtn.addEventListener('click', toggleCartDrawer);
  closeCartBtn.addEventListener('click', toggleCartDrawer);
  cartOverlay.addEventListener('click', toggleCartDrawer);

  function toggleCartDrawer() {
    cartDrawer.classList.toggle('active');
    cartOverlay.classList.toggle('active');
  }

  function openCartDrawer() {
    cartDrawer.classList.add('active');
    cartOverlay.classList.add('active');
  }

  // Quick View Modal
  window.openQuickView = (id) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    document.getElementById('modal-img').src = product.image;
    document.getElementById('modal-title').textContent = product.name;
    document.getElementById('modal-price').textContent = `$${product.price.toFixed(2)}`;
    document.getElementById('modal-desc').textContent = product.description;
    document.getElementById('modal-rating').textContent = `${product.rating} (${product.reviewsCount} reviews)`;
    
    const featuresList = document.getElementById('modal-features');
    featuresList.innerHTML = product.features.map(f => `<li><i class="fa-solid fa-circle-check"></i> ${f}</li>`).join('');

    const addBtn = document.getElementById('modal-add-btn');
    addBtn.onclick = () => {
      addToCart(product.id);
      quickViewModal.classList.remove('active');
    };

    quickViewModal.classList.add('active');
  };

  quickViewClose.addEventListener('click', () => quickViewModal.classList.remove('active'));
  quickViewModal.addEventListener('click', (e) => {
    if (e.target === quickViewModal) quickViewModal.classList.remove('active');
  });

  // Checkout Flow
  checkoutBtn.addEventListener('click', () => {
    if (cart.length === 0) {
      showToast('Your cart is empty!', 'warning');
      return;
    }
    toggleCartDrawer();
    checkoutModal.classList.add('active');
  });

  checkoutClose.addEventListener('click', () => checkoutModal.classList.remove('active'));
  
  checkoutForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const submitBtn = checkoutForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

    setTimeout(() => {
      cart = [];
      saveCart();
      updateCartUI();
      checkoutModal.classList.remove('active');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-lock"></i> Place Order & Pay';
      
      showToast('🎉 Order placed successfully! Check your email.', 'success');
    }, 1500);
  });

  // Global Navigation Helpers
  window.filterByCategory = (category) => {
    activeCategory = category;
    // Update main tab active states
    categoryTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.category === category);
    });
    renderProducts();
    const shopEl = document.getElementById('shop');
    if (shopEl) shopEl.scrollIntoView({ behavior: 'smooth' });
  };

  const navBestsellers = document.getElementById('nav-bestsellers');
  if (navBestsellers) {
    navBestsellers.addEventListener('click', () => {
      searchQuery = '';
      if (searchInput) searchInput.value = '';
      activeCategory = 'all';
      let filtered = products.filter(p => p.badge === 'Bestseller' || p.rating >= 4.8);
      renderCustomProductList(filtered, '🔥 Best Sellers');
    });
  }

  const navOffers = document.getElementById('nav-offers');
  if (navOffers) {
    navOffers.addEventListener('click', () => {
      searchQuery = '';
      if (searchInput) searchInput.value = '';
      activeCategory = 'all';
      let filtered = products.filter(p => p.badge === 'Sale' || p.originalPrice > p.price);
      renderCustomProductList(filtered, '🏷️ Exclusive Offers & Sales');
    });
  }

  function renderCustomProductList(customProducts, title) {
    productGrid.innerHTML = customProducts.map(product => {
      const isWishlisted = wishlist.includes(product.id);
      return `
        <div class="product-card" data-id="${product.id}">
          <div class="product-img-container">
            ${product.badge ? `<span class="badge-tag">${product.badge}</span>` : ''}
            <button class="wishlist-btn ${isWishlisted ? 'active' : ''}" data-wishlist-id="${product.id}" title="${isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}">
              <i class="${isWishlisted ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
            </button>
            <img src="${product.image}" alt="${product.name}" class="product-img" onclick="openQuickView(${product.id})">
          </div>
          <div class="product-details">
            <span class="product-category">${product.category}</span>
            <h3 class="product-title" onclick="openQuickView(${product.id})" style="cursor:pointer;">${product.name}</h3>
            <div class="rating-bar">
              <i class="fa-solid fa-star"></i>
              <span>${product.rating}</span>
              <span class="rating-count">(${product.reviewsCount})</span>
            </div>
            <div class="product-footer">
              <div class="price-box">
                <span class="current-price">$${product.price.toFixed(2)}</span>
                ${product.originalPrice ? `<span class="original-price">$${product.originalPrice.toFixed(2)}</span>` : ''}
              </div>
              <button class="add-cart-btn" data-add-id="${product.id}">
                <i class="fa-solid fa-bag-shopping"></i> Add
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    showToast(`Showing ${title}`, 'info');
    const shopEl = document.getElementById('shop');
    if (shopEl) shopEl.scrollIntoView({ behavior: 'smooth' });
  }

  // Auth / Login & Profile Modal Handling
  const authModal = document.getElementById('auth-modal');
  const authBtn = document.getElementById('auth-btn');
  const authClose = document.getElementById('auth-close');
  const authBtnText = document.getElementById('auth-btn-text');
  const loginForm = document.getElementById('login-form');
  const logoutBtn = document.getElementById('logout-btn');
  const authLoginView = document.getElementById('auth-login-view');
  const authProfileView = document.getElementById('auth-profile-view');

  let currentUser = JSON.parse(localStorage.getItem('glowcart_user')) || null;

  updateAuthUI();

  if (authBtn) {
    authBtn.addEventListener('click', () => {
      authModal.classList.add('active');
    });
  }

  if (authClose) {
    authClose.addEventListener('click', () => authModal.classList.remove('active'));
  }

  if (authModal) {
    authModal.addEventListener('click', (e) => {
      if (e.target === authModal) authModal.classList.remove('active');
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const name = email.split('@')[0];
      currentUser = { email, name: name.charAt(0).toUpperCase() + name.slice(1) };
      localStorage.setItem('glowcart_user', JSON.stringify(currentUser));
      updateAuthUI();
      authModal.classList.remove('active');
      showToast(`Welcome back, ${currentUser.name}! ✨`, 'success');
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      currentUser = null;
      localStorage.removeItem('glowcart_user');
      updateAuthUI();
      authModal.classList.remove('active');
      showToast('Logged out successfully', 'info');
    });
  }

  function updateAuthUI() {
    if (currentUser) {
      authBtnText.textContent = currentUser.name;
      authLoginView.style.display = 'none';
      authProfileView.style.display = 'block';
      document.getElementById('profile-name').textContent = currentUser.name;
      document.getElementById('profile-email').textContent = currentUser.email;
    } else {
      authBtnText.textContent = 'Login';
      authLoginView.style.display = 'block';
      authProfileView.style.display = 'none';
    }
  }

  // Toast Notification System
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'warning') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) reverse';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
});
