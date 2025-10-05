// Global application state
let appState = {
    products: [],
    locations: [],
    movements: [],
    currentPage: 'dashboard',
    isEditing: {
        product: null,
        location: null
    }
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    loadFromLocalStorage();
    updateDashboardStats();
    generateReport();
});

// Initialize application functionality
function initializeApp() {
    setupNavigation();
    setupFormHandlers();
    setupSearchFunctionality();
    showPage('dashboard');
}

// Navigation functionality
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');

    // Handle navigation clicks
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.dataset.page;
            
            // Update active nav link
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding page
            showPage(page);
        });
    });

    // Mobile menu toggle
    if (navToggle) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
        });
    }
}

// Show specific page
function showPage(pageName) {
    // Hide all pages
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.classList.remove('active');
    });

    // Show target page
    const targetPage = document.getElementById(pageName + '-page');
    if (targetPage) {
        targetPage.classList.add('active');
        appState.currentPage = pageName;
        
        // Update navigation
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.dataset.page === pageName) {
                link.classList.add('active');
            }
        });

        // Refresh data for specific pages
        if (pageName === 'reports') {
            generateReport();
        } else if (pageName === 'movements') {
            updateMovementDropdowns();
        }
    }
}

// Form handling setup
function setupFormHandlers() {
    // Product form
    const productForm = document.getElementById('product-form');
    if (productForm) {
        productForm.addEventListener('submit', handleProductSubmit);
    }

    // Location form
    const locationForm = document.getElementById('location-form');
    if (locationForm) {
        locationForm.addEventListener('submit', handleLocationSubmit);
    }

    // Movement form
    const movementForm = document.getElementById('movement-form');
    if (movementForm) {
        movementForm.addEventListener('submit', handleMovementSubmit);
    }
}

// Search functionality
function setupSearchFunctionality() {
    // Product search
    const productSearch = document.getElementById('product-search');
    if (productSearch) {
        productSearch.addEventListener('input', function() {
            filterTable('products-tbody', this.value, ['product-id', 'product-name']);
        });
    }

    // Movement search
    const movementSearch = document.getElementById('movement-search');
    if (movementSearch) {
        movementSearch.addEventListener('input', function() {
            filterTable('movements-tbody', this.value, ['product', 'from', 'to']);
        });
    }

    // Report search
    const reportSearch = document.getElementById('report-search');
    if (reportSearch) {
        reportSearch.addEventListener('input', function() {
            filterTable('report-tbody', this.value, ['product', 'location']);
        });
    }
}

// Filter table rows based on search
function filterTable(tbodyId, searchTerm, searchFields) {
    const tbody = document.getElementById(tbodyId);
    const rows = tbody.querySelectorAll('tr:not(.empty-state)');
    
    if (!searchTerm) {
        rows.forEach(row => row.style.display = '');
        return;
    }
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        let matchFound = false;
        
        cells.forEach(cell => {
            if (cell.textContent.toLowerCase().includes(searchTerm.toLowerCase())) {
                matchFound = true;
            }
        });
        
        row.style.display = matchFound ? '' : 'none';
    });
}

// Product Management Functions
function showAddProductForm() {
    appState.isEditing.product = null;
    const form = document.getElementById('add-product-form');
    form.style.display = 'flex';
    document.getElementById('product-form').reset();
    document.querySelector('#add-product-form .form-header h3').textContent = 'Add New Product';
    
    // Add animation class
    setTimeout(() => {
        form.querySelector('.form-card').classList.add('fade-enter-active');
    }, 10);
}

function hideAddProductForm() {
    const form = document.getElementById('add-product-form');
    const card = form.querySelector('.form-card');
    appState.isEditing.product = null;
    
    card.classList.remove('fade-enter-active');
    setTimeout(() => {
        form.style.display = 'none';
    }, 300);
}

function handleProductSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const productData = {
        id: formData.get('product-id').trim(),
        name: formData.get('product-name').trim(),
        description: formData.get('product-description').trim()
    };

    // Validation
    if (!productData.id || !productData.name) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    if (appState.isEditing.product) {
        // Edit existing product
        const existingProduct = appState.products.find(p => p.id === appState.isEditing.product);
        if (existingProduct) {
            // Check for duplicate ID only if ID changed
            if (productData.id !== appState.isEditing.product && 
                appState.products.find(p => p.id === productData.id)) {
                showNotification('Product ID already exists', 'error');
                return;
            }
            
            // If product ID changed, update all movement references
            if (productData.id !== appState.isEditing.product) {
                appState.movements.forEach(movement => {
                    if (movement.productId === appState.isEditing.product) {
                        movement.productId = productData.id;
                    }
                });
            }
            
            // Update existing product
            existingProduct.id = productData.id;
            existingProduct.name = productData.name;
            existingProduct.description = productData.description;
            
            showNotification('Product updated successfully!', 'success');
            addToActivityFeed(`Updated product: ${productData.name}`);
        }
    } else {
        // Add new product
        // Check for duplicate ID
        if (appState.products.find(p => p.id === productData.id)) {
            showNotification('Product ID already exists', 'error');
            return;
        }
        
        const newProduct = {
            ...productData,
            createdAt: new Date().toISOString()
        };
        
        appState.products.push(newProduct);
        showNotification('Product added successfully!', 'success');
        addToActivityFeed(`Added new product: ${productData.name}`);
    }

    saveToLocalStorage();
    updateProductsTable();
    updateDashboardStats();
    hideAddProductForm();
}

function updateProductsTable() {
    const tbody = document.getElementById('products-tbody');
    
    if (appState.products.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-state">
                <td colspan="5">
                    <div class="empty-message">
                        <i class="fas fa-box"></i>
                        <p>No products found. Add your first product to get started!</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = appState.products.map(product => {
        const totalStock = calculateProductStock(product.id);
        return `
            <tr>
                <td>${product.id}</td>
                <td>${product.name}</td>
                <td>${product.description || '-'}</td>
                <td>${totalStock}</td>
                <td>
                    <button class="edit-btn" onclick="editProduct('${product.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn" onclick="deleteProduct('${product.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function calculateProductStock(productId) {
    let totalStock = 0;
    const productMovements = appState.movements.filter(m => m.productId === productId);
    
    productMovements.forEach(movement => {
        if (movement.to && !movement.from) {
            // Inbound movement
            totalStock += movement.qty;
        } else if (movement.from && !movement.to) {
            // Outbound movement
            totalStock -= movement.qty;
        }
        // Transfer movements don't change total stock
    });
    
    return Math.max(0, totalStock);
}

function editProduct(productId) {
    const product = appState.products.find(p => p.id === productId);
    if (product) {
        appState.isEditing.product = productId;
        
        document.getElementById('product-id').value = product.id;
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-description').value = product.description || '';
        
        const form = document.getElementById('add-product-form');
        form.style.display = 'flex';
        
        // Update form header
        document.querySelector('#add-product-form .form-header h3').textContent = 'Edit Product';
        
        // Add animation class
        setTimeout(() => {
            form.querySelector('.form-card').classList.add('fade-enter-active');
        }, 10);
    }
}

function deleteProduct(productId) {
    if (confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
        appState.products = appState.products.filter(p => p.id !== productId);
        saveToLocalStorage();
        updateProductsTable();
        updateDashboardStats();
        showNotification('Product deleted successfully!', 'success');
    }
}

// Location Management Functions
function showAddLocationForm() {
    appState.isEditing.location = null;
    const form = document.getElementById('add-location-form');
    form.style.display = 'flex';
    document.getElementById('location-form').reset();
    document.querySelector('#add-location-form .form-header h3').textContent = 'Add New Location';
}

function hideAddLocationForm() {
    const form = document.getElementById('add-location-form');
    form.style.display = 'none';
    appState.isEditing.location = null;
}

function handleLocationSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const locationData = {
        id: formData.get('location-id').trim(),
        name: formData.get('location-name').trim(),
        address: formData.get('location-address').trim()
    };

    // Validation
    if (!locationData.id || !locationData.name) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    if (appState.isEditing.location) {
        // Edit existing location
        const existingLocation = appState.locations.find(l => l.id === appState.isEditing.location);
        if (existingLocation) {
            // Check for duplicate ID only if ID changed
            if (locationData.id !== appState.isEditing.location && 
                appState.locations.find(l => l.id === locationData.id)) {
                showNotification('Location ID already exists', 'error');
                return;
            }
            
            // If location ID changed, update all movement references
            if (locationData.id !== appState.isEditing.location) {
                appState.movements.forEach(movement => {
                    if (movement.from === appState.isEditing.location) {
                        movement.from = locationData.id;
                    }
                    if (movement.to === appState.isEditing.location) {
                        movement.to = locationData.id;
                    }
                });
            }
            
            // Update existing location
            existingLocation.id = locationData.id;
            existingLocation.name = locationData.name;
            existingLocation.address = locationData.address;
            
            showNotification('Location updated successfully!', 'success');
            addToActivityFeed(`Updated location: ${locationData.name}`);
        }
    } else {
        // Add new location
        // Check for duplicate ID
        if (appState.locations.find(l => l.id === locationData.id)) {
            showNotification('Location ID already exists', 'error');
            return;
        }
        
        const newLocation = {
            ...locationData,
            createdAt: new Date().toISOString()
        };
        
        appState.locations.push(newLocation);
        showNotification('Location added successfully!', 'success');
        addToActivityFeed(`Added new location: ${locationData.name}`);
    }

    saveToLocalStorage();
    updateLocationsGrid();
    updateDashboardStats();
    hideAddLocationForm();
}

function updateLocationsGrid() {
    const grid = document.getElementById('locations-grid');
    
    if (appState.locations.length === 0) {
        grid.innerHTML = `
            <div class="empty-state-large">
                <img src="https://images.unsplash.com/photo-1553062407-98eeb64c6a62?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1073&q=80" alt="Empty warehouse">
                <h3>No Locations Yet</h3>
                <p>Add your first warehouse location to start tracking inventory</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = appState.locations.map(location => {
        const stockItems = calculateLocationStock(location.id);
        return `
            <div class="location-card">
                <div class="location-header">
                    <h3>${location.name}</h3>
                    <p>ID: ${location.id}</p>
                </div>
                <div class="location-body">
                    <div class="location-details">
                        <p><strong>Address:</strong> ${location.address || 'Not specified'}</p>
                        <p><strong>Stock Items:</strong> ${stockItems} different products</p>
                    </div>
                    <div class="location-actions">
                        <button class="edit-btn" onclick="editLocation('${location.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="delete-btn" onclick="deleteLocation('${location.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function calculateLocationStock(locationId) {
    const locationMovements = appState.movements.filter(m => 
        m.to === locationId || m.from === locationId
    );
    
    const productStocks = {};
    
    locationMovements.forEach(movement => {
        if (movement.to === locationId) {
            productStocks[movement.productId] = (productStocks[movement.productId] || 0) + movement.qty;
        }
        if (movement.from === locationId) {
            productStocks[movement.productId] = (productStocks[movement.productId] || 0) - movement.qty;
        }
    });
    
    return Object.keys(productStocks).filter(productId => productStocks[productId] > 0).length;
}

function editLocation(locationId) {
    const location = appState.locations.find(l => l.id === locationId);
    if (location) {
        appState.isEditing.location = locationId;
        
        document.getElementById('location-id').value = location.id;
        document.getElementById('location-name').value = location.name;
        document.getElementById('location-address').value = location.address || '';
        
        const form = document.getElementById('add-location-form');
        form.style.display = 'flex';
        
        // Update form header
        document.querySelector('#add-location-form .form-header h3').textContent = 'Edit Location';
    }
}

function deleteLocation(locationId) {
    if (confirm('Are you sure you want to delete this location? This action cannot be undone.')) {
        appState.locations = appState.locations.filter(l => l.id !== locationId);
        saveToLocalStorage();
        updateLocationsGrid();
        updateDashboardStats();
        showNotification('Location deleted successfully!', 'success');
    }
}

// Movement Management Functions
function showAddMovementForm() {
    updateMovementDropdowns();
    const form = document.getElementById('add-movement-form');
    form.style.display = 'flex';
    document.getElementById('movement-form').reset();
}

function hideAddMovementForm() {
    const form = document.getElementById('add-movement-form');
    form.style.display = 'none';
}

function updateMovementDropdowns() {
    const productSelect = document.getElementById('movement-product');
    const fromSelect = document.getElementById('movement-from');
    const toSelect = document.getElementById('movement-to');

    // Update product dropdown
    productSelect.innerHTML = '<option value="">Select a product...</option>';
    appState.products.forEach(product => {
        productSelect.innerHTML += `<option value="${product.id}">${product.name}</option>`;
    });

    // Update location dropdowns
    const locationOptions = '<option value="">Select location...</option>' + 
        appState.locations.map(location => 
            `<option value="${location.id}">${location.name}</option>`
        ).join('');
    
    fromSelect.innerHTML = '<option value="">Select source location (or leave blank for new stock)</option>' + 
        appState.locations.map(location => 
            `<option value="${location.id}">${location.name}</option>`
        ).join('');
    
    toSelect.innerHTML = '<option value="">Select destination location (or leave blank for removal)</option>' + 
        appState.locations.map(location => 
            `<option value="${location.id}">${location.name}</option>`
        ).join('');
}

function handleMovementSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const movement = {
        id: Date.now(),
        productId: formData.get('movement-product'),
        from: formData.get('movement-from') || null,
        to: formData.get('movement-to') || null,
        qty: parseInt(formData.get('movement-qty')),
        timestamp: new Date().toISOString()
    };

    // Validation
    if (!movement.productId || !movement.qty || movement.qty <= 0) {
        showNotification('Please fill in all required fields with valid values', 'error');
        return;
    }

    if (!movement.from && !movement.to) {
        showNotification('Please specify either a source or destination location', 'error');
        return;
    }

    // Add movement
    appState.movements.push(movement);
    saveToLocalStorage();
    updateMovementsTable();
    updateDashboardStats();
    generateReport();
    hideAddMovementForm();
    
    const product = appState.products.find(p => p.id === movement.productId);
    const movementType = getMovementType(movement);
    
    showNotification('Movement recorded successfully!', 'success');
    addToActivityFeed(`${movementType}: ${movement.qty} units of ${product?.name || 'Unknown Product'}`);
}

function getMovementType(movement) {
    if (movement.to && !movement.from) return 'Stock In';
    if (movement.from && !movement.to) return 'Stock Out';
    return 'Transfer';
}

function updateMovementsTable() {
    const tbody = document.getElementById('movements-tbody');
    
    if (appState.movements.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-state">
                <td colspan="7">
                    <div class="empty-message">
                        <i class="fas fa-exchange-alt"></i>
                        <p>No movements recorded yet. Record your first product movement!</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    // Sort movements by timestamp (newest first)
    const sortedMovements = [...appState.movements].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
    );

    tbody.innerHTML = sortedMovements.map(movement => {
        const product = appState.products.find(p => p.id === movement.productId);
        const fromLocation = movement.from ? appState.locations.find(l => l.id === movement.from) : null;
        const toLocation = movement.to ? appState.locations.find(l => l.id === movement.to) : null;
        const movementType = getMovementType(movement);
        const movementClass = movementType.toLowerCase().replace(' ', '-');
        
        return `
            <tr>
                <td>${movement.id}</td>
                <td>${formatDateTime(movement.timestamp)}</td>
                <td>${product ? product.name : 'Unknown Product'}</td>
                <td>${fromLocation ? fromLocation.name : '-'}</td>
                <td>${toLocation ? toLocation.name : '-'}</td>
                <td>${movement.qty}</td>
                <td><span class="movement-type ${movementClass}">${movementType}</span></td>
            </tr>
        `;
    }).join('');
}

// Report Generation
function generateReport() {
    const reportTbody = document.getElementById('report-tbody');
    const stockData = calculateCurrentStock();
    
    if (Object.keys(stockData).length === 0) {
        reportTbody.innerHTML = `
            <tr class="empty-state">
                <td colspan="4">
                    <div class="empty-message">
                        <i class="fas fa-chart-bar"></i>
                        <p>No inventory data available. Add products and record movements to generate reports!</p>
                    </div>
                </td>
            </tr>
        `;
        
        // Update summary cards
        document.getElementById('report-total-items').textContent = '0';
        document.getElementById('report-low-stock').textContent = '0';
        document.getElementById('report-locations-active').textContent = '0';
        return;
    }

    let totalItems = 0;
    let lowStockCount = 0;
    const activeLocations = new Set();
    
    const reportRows = [];
    
    Object.keys(stockData).forEach(productId => {
        const product = appState.products.find(p => p.id === productId);
        if (!product) return;
        
        Object.keys(stockData[productId]).forEach(locationId => {
            const qty = stockData[productId][locationId];
            if (qty > 0) {
                const location = appState.locations.find(l => l.id === locationId);
                if (!location) return;
                
                totalItems += qty;
                activeLocations.add(locationId);
                
                let status = 'in-stock';
                let statusText = 'In Stock';
                
                if (qty < 5) {
                    status = 'low-stock';
                    statusText = 'Low Stock';
                    lowStockCount++;
                } else if (qty === 0) {
                    status = 'out-of-stock';
                    statusText = 'Out of Stock';
                }
                
                reportRows.push({
                    product: product.name,
                    location: location.name,
                    qty: qty,
                    status: status,
                    statusText: statusText
                });
            }
        });
    });
    
    // Sort by product name, then location name
    reportRows.sort((a, b) => {
        if (a.product !== b.product) return a.product.localeCompare(b.product);
        return a.location.localeCompare(b.location);
    });
    
    reportTbody.innerHTML = reportRows.map(row => `
        <tr>
            <td>${row.product}</td>
            <td>${row.location}</td>
            <td>${row.qty}</td>
            <td><span class="status-badge ${row.status}">${row.statusText}</span></td>
        </tr>
    `).join('');
    
    // Update summary cards
    document.getElementById('report-total-items').textContent = totalItems.toLocaleString();
    document.getElementById('report-low-stock').textContent = lowStockCount;
    document.getElementById('report-locations-active').textContent = activeLocations.size;
}

function calculateCurrentStock() {
    const stockData = {};
    
    appState.movements.forEach(movement => {
        const { productId, from, to, qty } = movement;
        
        // Initialize product in stock data
        if (!stockData[productId]) {
            stockData[productId] = {};
        }
        
        // Handle inbound movement (to location)
        if (to) {
            if (!stockData[productId][to]) {
                stockData[productId][to] = 0;
            }
            stockData[productId][to] += qty;
        }
        
        // Handle outbound movement (from location)
        if (from) {
            if (!stockData[productId][from]) {
                stockData[productId][from] = 0;
            }
            stockData[productId][from] -= qty;
        }
    });
    
    return stockData;
}

// Dashboard Functions
function updateDashboardStats() {
    document.getElementById('total-products').textContent = appState.products.length;
    document.getElementById('total-locations').textContent = appState.locations.length;
    document.getElementById('total-movements').textContent = appState.movements.length;
    
    // Calculate total inventory value (mock calculation)
    const totalValue = appState.products.length * 1000 + appState.movements.length * 50;
    document.getElementById('total-value').textContent = '$' + totalValue.toLocaleString();
}

function addToActivityFeed(message) {
    const activityList = document.getElementById('recent-activity');
    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item fade-enter';
    
    const timestamp = new Date().toLocaleTimeString();
    
    activityItem.innerHTML = `
        <div class="activity-icon">
            <i class="fas fa-plus"></i>
        </div>
        <div class="activity-details">
            <p>${message}</p>
            <span>${timestamp}</span>
        </div>
    `;
    
    // Add to beginning of list
    activityList.insertBefore(activityItem, activityList.firstChild);
    
    // Add animation
    setTimeout(() => {
        activityItem.classList.add('fade-enter-active');
    }, 10);
    
    // Keep only last 10 activities
    const items = activityList.querySelectorAll('.activity-item');
    if (items.length > 10) {
        items[items.length - 1].remove();
    }
}

// Utility Functions
function formatDateTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Add to body
    document.body.appendChild(notification);
    
    // Show with animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Local Storage Functions
function saveToLocalStorage() {
    localStorage.setItem('inventoryPro', JSON.stringify(appState));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('inventoryPro');
    if (saved) {
        try {
            appState = { ...appState, ...JSON.parse(saved) };
            updateProductsTable();
            updateLocationsGrid();
            updateMovementsTable();
        } catch (error) {
            console.error('Error loading from localStorage:', error);
        }
    }
}

// Add notification styles dynamically
const notificationStyles = `
.notification {
    position: fixed;
    top: 100px;
    right: 20px;
    background: white;
    padding: 16px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border-left: 4px solid #667eea;
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 3000;
    transform: translateX(400px);
    opacity: 0;
    transition: all 0.3s ease-out;
    max-width: 400px;
}

.notification.show {
    transform: translateX(0);
    opacity: 1;
}

.notification-success {
    border-left-color: #10b981;
    color: #059669;
}

.notification-error {
    border-left-color: #ef4444;
    color: #dc2626;
}

.notification-info {
    border-left-color: #3b82f6;
    color: #2563eb;
}

.notification i {
    font-size: 1.2rem;
}
`;

// Add notification styles to head
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);

// Export functions for global access (for onclick handlers)
window.showPage = showPage;
window.showAddProductForm = showAddProductForm;
window.hideAddProductForm = hideAddProductForm;
window.showAddLocationForm = showAddLocationForm;
window.hideAddLocationForm = hideAddLocationForm;
window.showAddMovementForm = showAddMovementForm;
window.hideAddMovementForm = hideAddMovementForm;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.editLocation = editLocation;
window.deleteLocation = deleteLocation;
window.generateReport = generateReport;