// Import required modules
import { parsePDF, groupByProduct, groupByCategory, filterByDateRange, filterByCustomer, filterByProduct, filterByCategory } from './lib/pdf-parser.js';
import { exportToExcel } from './lib/excel-export.js';

// Global variables
let uploadedFiles = [];
let processedOrders = [];
let currentScreen = 'upload';
let activeTab = 'products';

// DOM Elements
const uploadScreen = document.getElementById('uploadScreen');
const reportsScreen = document.getElementById('reportsScreen');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const fileCount = document.getElementById('fileCount');
const processBtn = document.getElementById('processBtn');
const screenToggle = document.getElementById('screenToggle');
const dateFromInput = document.getElementById('dateFrom');
const dateToInput = document.getElementById('dateTo');
const customerInput = document.getElementById('customerFilter');
const productInput = document.getElementById('productFilter');
const categoryInput = document.getElementById('categoryFilter');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingMessage = document.getElementById('loadingMessage');
const exportBtn = document.getElementById('exportButton');

// Event Listeners
dropZone?.addEventListener('dragover', handleDragOver);
dropZone?.addEventListener('dragleave', handleDragLeave);
dropZone?.addEventListener('drop', handleDrop);
fileInput?.addEventListener('change', handleFileSelect);
processBtn?.addEventListener('click', processFiles);
screenToggle?.addEventListener('click', toggleScreen);

// Make the entire drop zone clickable
dropZone?.addEventListener('click', () => {
    fileInput?.click();
});

// Filter event listeners
dateFromInput?.addEventListener('change', () => updateReportsUI(applyFilters()));
dateToInput?.addEventListener('change', () => updateReportsUI(applyFilters()));
customerInput?.addEventListener('input', () => updateReportsUI(applyFilters()));
productInput?.addEventListener('input', () => updateReportsUI(applyFilters()));
categoryInput?.addEventListener('change', () => updateReportsUI(applyFilters()));

// Tab event listeners
document.querySelectorAll('.tab-trigger').forEach(trigger => {
    trigger.addEventListener('click', () => {
        // Remove active class from all tabs
        document.querySelectorAll('.tab-trigger').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // Add active class to clicked tab
        trigger.classList.add('active');
        const tabId = trigger.dataset.tab;
        document.getElementById(`${tabId}Tab`).classList.add('active');
        activeTab = tabId;
        
        // Update the reports UI with current filters
        updateReportsUI(applyFilters());
    });
});

// File Upload Handlers
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone?.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone?.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone?.classList.remove('drag-over');
    
    const files = Array.from(e.dataTransfer.files).filter(file => file.type === 'application/pdf');
    handleFiles(files);
}

function handleFileSelect(e) {
    const files = Array.from(e.target.files).filter(file => file.type === 'application/pdf');
    handleFiles(files);
}

function handleFiles(files) {
    // Add new files
    files.forEach(file => {
        const id = Date.now() + Math.random().toString(36).substr(2, 9);
        uploadedFiles.push({ id, file });
        addFileToList(id, file.name);
    });
    
    updateFileCount();
    updateProcessButton();
    
    // Reset file input
    if (fileInput) fileInput.value = '';
}

function addFileToList(id, name) {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.innerHTML = `
        <div class="file-info">
            <svg class="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            <span>${name}</span>
        </div>
        <button class="btn btn-ghost" onclick="removeFile('${id}')">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
    `;
    fileList?.appendChild(fileItem);
}

// Make removeFile available globally
window.removeFile = function(id) {
    uploadedFiles = uploadedFiles.filter(file => file.id !== id);
    const fileItem = fileList?.querySelector(`[onclick="removeFile('${id}')"]`)?.parentNode;
    fileItem?.remove();
    updateFileCount();
    updateProcessButton();
};

function updateFileCount() {
    if (fileCount) {
        fileCount.textContent = `${uploadedFiles.length} file${uploadedFiles.length !== 1 ? 's' : ''}`;
    }
}

function updateProcessButton() {
    if (processBtn) {
        processBtn.disabled = uploadedFiles.length === 0;
    }
}

// PDF Processing
async function processFiles() {
    console.log('Starting to process files:', uploadedFiles);
    showLoading('Processing PDFs...');
    
    try {
        // Process each PDF file
        processedOrders = await Promise.all(
            uploadedFiles.map(async ({ file }) => {
                console.log('Processing file:', file.name);
                const order = await parsePDF(file);
                console.log('Processed order:', order);
                return order;
            })
        );

        console.log('All orders processed:', processedOrders);
        
        // Switch to reports screen
        uploadScreen.classList.remove('active');
        reportsScreen.classList.add('active');
        currentScreen = 'reports';
        
        // Update screen toggle button
        screenToggle.innerHTML = `
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 12H5"></path>
                <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>Back to Upload</span>
        `;
        
        // Update the UI with processed data
        updateReportsUI();
        showToast(`Successfully processed ${processedOrders.length} files`, 'success');
    } catch (error) {
        console.error('Error processing files:', error);
        showToast('Error processing files', 'error');
    } finally {
        hideLoading();
    }
}

// Reports UI
function updateReportsUI(orders = null) {
    console.log('Updating reports UI with orders:', orders || processedOrders);
    const filteredOrders = orders || applyFilters();
    console.log('Filtered orders:', filteredOrders);
    
    // Validate orders
    if (!Array.isArray(filteredOrders) || filteredOrders.length === 0) {
        console.log('No valid orders to display');
        showEmptyState();
        return;
    }

    // Hide empty state if it exists
    hideEmptyState();
    
    // Update based on active tab
    switch (activeTab) {
        case 'products':
            updateProductSummary(filteredOrders);
            break;
        case 'categories':
            updateCategorySummary(filteredOrders);
            break;
        case 'detailed':
            updateDetailedBreakdown(filteredOrders);
            break;
    }
}

function showEmptyState() {
    const productTable = document.getElementById('productTable');
    const categoryTable = document.getElementById('categoryTable');
    
    if (productTable) {
        const tbody = productTable.querySelector('tbody');
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-8">
                    <div class="text-gray-500">
                        <svg class="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
                        </svg>
                        <p>No items found</p>
                        <p class="text-sm">Try adjusting your filters or upload new files</p>
                    </div>
                </td>
            </tr>
        `;
    }
    
    if (categoryTable) {
        const tbody = categoryTable.querySelector('tbody');
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-8">
                    <div class="text-gray-500">
                        <svg class="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
                        </svg>
                        <p>No categories found</p>
                        <p class="text-sm">Try adjusting your filters or upload new files</p>
                    </div>
                </td>
            </tr>
        `;
    }
}

function hideEmptyState() {
    const productTable = document.getElementById('productTable');
    const categoryTable = document.getElementById('categoryTable');
    
    if (productTable) {
        const tbody = productTable.querySelector('tbody');
        tbody.innerHTML = '';
    }
    
    if (categoryTable) {
        const tbody = categoryTable.querySelector('tbody');
        tbody.innerHTML = '';
    }
}

function updateProductSummary(orders) {
    const productTable = document.getElementById('productTable');
    if (!productTable) return;
    
    const tbody = productTable.querySelector('tbody');
    tbody.innerHTML = '';

    // Create a map to store product details
    const productDetails = new Map();

    // Process all orders
    orders.forEach(order => {
        if (!Array.isArray(order?.items)) return;
        
        order.items.forEach(item => {
            if (!item?.name) return;
            
            const key = item.name;
            if (!productDetails.has(key)) {
                productDetails.set(key, {
                    name: item.name,
                    portionSize: item.portionSize || '',
                    totalQty: 0,
                    category: 'Uncategorized',
                    orders: []
                });
            }
            
            const details = productDetails.get(key);
            details.totalQty += item.qty || 0;
            details.portionSize = item.portionSize || details.portionSize;
            
            // Find category
            const category = order.derivedCategories?.find(c => 
                c.product === item.name
            )?.category;
            if (category) {
                details.category = category;
            }
            
            // Add order details
            details.orders.push({
                orderId: order.orderId,
                orderDate: order.orderDate,
                customer: order.customer,
                qty: item.qty,
                pdfBlobUrl: order.pdfBlobUrl
            });
        });
    });

    // Check if we have any products
    if (productDetails.size === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-8">
                    <div class="text-gray-500">
                        <svg class="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
                        </svg>
                        <p>No products found</p>
                        <p class="text-sm">Try adjusting your filters or upload new files</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    // Sort products by total quantity
    const sortedProducts = Array.from(productDetails.entries())
        .sort(([, a], [, b]) => b.totalQty - a.totalQty);

    // Render each product
    sortedProducts.forEach(([name, details]) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${details.name}</td>
            <td>${details.portionSize}</td>
            <td>${details.totalQty}</td>
            <td><span class="badge">${details.category}</span></td>
            <td>
                <button class="btn btn-ghost btn-sm expand-btn">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </button>
            </td>
        `;
        tbody.appendChild(tr);

        // Add expandable row
        const detailsRow = document.createElement('tr');
        detailsRow.className = 'expandable-row hidden';
        detailsRow.dataset.product = name;

        if (details.orders.length === 0) {
            detailsRow.innerHTML = `
                <td colspan="5">
                    <div class="expandable-content">
                        <div class="text-gray-500 text-center py-4">
                            No order details available
                        </div>
                    </div>
                </td>
            `;
        } else {
            detailsRow.innerHTML = `
                <td colspan="5">
                    <div class="expandable-content">
                        ${details.orders.map(order => `
                            <div class="order-card">
                                <div class="order-grid">
                                    <div>
                                        <strong>Order ID:</strong> ${order.orderId}
                                    </div>
                                    <div>
                                        <strong>Date:</strong> ${order.orderDate}
                                    </div>
                                    <div>
                                        <strong>Customer:</strong> ${order.customer?.name || 'Unknown'}
                                    </div>
                                    <div>
                                        <strong>Quantity:</strong> ${order.qty || 0}
                                    </div>
                                </div>
                                <div style="margin-top: 0.5rem;">
                                    <strong>Address:</strong> ${order.customer?.address || 'Unknown'}
                                </div>
                                <div style="margin-top: 0.5rem;">
                                    <a href="${order.pdfBlobUrl}" target="_blank" class="btn btn-outline btn-sm">
                                        View Slip
                                    </a>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </td>
            `;
        }
        tbody.appendChild(detailsRow);

        // Add click handler to expand button
        const expandBtn = tr.querySelector('.expand-btn');
        expandBtn.addEventListener('click', () => {
            detailsRow.classList.toggle('hidden');
            detailsRow.querySelector('.expandable-content')?.classList.toggle('expanded');
        });
    });
}

function updateCategorySummary(orders) {
    const categoryTable = document.getElementById('categoryTable');
    if (!categoryTable) return;
    
    const tbody = categoryTable.querySelector('tbody');
    tbody.innerHTML = '';

    // Get all items from all orders
    const allItems = orders.reduce((items, order) => {
        if (Array.isArray(order.items)) {
            items.push(...order.items);
        }
        return items;
    }, []);

    if (allItems.length === 0) {
        showEmptyState();
        return;
    }

    const categoryTotals = groupByCategory(orders);

    Object.entries(categoryTotals).forEach(([category, data]) => {
        if (!category || !data) return; // Skip invalid entries
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${category}</td>
            <td>${data.products?.size || 0}</td>
            <td>${data.totalQty || 0}</td>
            <td>
                <button class="btn btn-ghost btn-sm expand-btn">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </button>
            </td>
        `;
        tbody.appendChild(tr);

        // Add expandable row
        const detailsRow = document.createElement('tr');
        detailsRow.className = 'expandable-row hidden';
        detailsRow.dataset.category = category;
        
        const productDetails = Array.from(data.products || []).map(product => {
            const totalQty = orders.reduce((sum, order) => {
                const item = Array.isArray(order.items) ? order.items.find(i => i.name === product) : null;
                return sum + (item?.qty || 0);
            }, 0);
            return { product, qty: totalQty };
        });

        detailsRow.innerHTML = `
            <td colspan="4">
                <div class="expandable-content">
                    <div class="order-grid">
                        ${productDetails.map(({ product, qty }) => `
                            <div class="order-card">
                                <strong>${product}</strong>
                                <div style="margin-top: 0.5rem;">
                                    Total Quantity: ${qty}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </td>
        `;
        tbody.appendChild(detailsRow);

        // Add click handler to expand button
        const expandBtn = tr.querySelector('.expand-btn');
        expandBtn.addEventListener('click', () => {
            detailsRow.classList.toggle('hidden');
            detailsRow.querySelector('.expandable-content')?.classList.toggle('expanded');
        });
    });
}

// Filter Functions
function applyFilters() {
    let filtered = [...processedOrders];

    // Date range filter
    if (dateFromInput?.value && dateToInput?.value) {
        filtered = filterByDateRange(filtered, dateFromInput.value, dateToInput.value);
    }

    // Customer filter
    if (customerInput?.value) {
        filtered = filterByCustomer(filtered, customerInput.value);
    }

    // Product filter
    if (productInput?.value) {
        filtered = filterByProduct(filtered, productInput.value);
    }

    // Category filter
    if (categoryInput?.value) {
        filtered = filterByCategory(filtered, categoryInput.value);
    }

    return filtered;
}

// UI Helpers
function toggleScreen() {
    currentScreen = currentScreen === 'upload' ? 'reports' : 'upload';
    
    if (currentScreen === 'reports') {
        uploadScreen.classList.remove('active');
        reportsScreen.classList.add('active');
        screenToggle.innerHTML = `
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 12H5"></path>
                <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>Back to Upload</span>
        `;
        updateReportsUI(); // Refresh the reports when showing the screen
    } else {
        uploadScreen.classList.add('active');
        reportsScreen.classList.remove('active');
        screenToggle.innerHTML = `
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 3h4a2 2 0 0 1 2 2v4M9 21H5a2 2 0 0 1-2-2v-4M21 14l-5-5-5 5M3 10l5 5 5-5"/>
            </svg>
            <span>View Reports</span>
        `;
    }
}

function showLoading(message = 'Loading...') {
    if (loadingOverlay && loadingMessage) {
        loadingOverlay.classList.remove('hidden');
        loadingMessage.textContent = message;
    }
}

function hideLoading() {
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
    }
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Trigger reflow to enable transition
    toast.offsetHeight;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Export Modal Functions
function showExportModal() {
    document.getElementById('exportModal').classList.remove('hidden');
}

function closeExportModal() {
    document.getElementById('exportModal').classList.add('hidden');
}

function executeExport() {
    const filteredOrders = applyFilters();
    const exportOptions = {
        productSummary: document.getElementById('productSummaryExport').checked,
        categorySummary: document.getElementById('categorySummaryExport').checked,
        orders: document.getElementById('ordersExport').checked,
        detailedBreakdown: document.getElementById('detailedBreakdownExport').checked
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filterSuffix = getFilterSuffix();

    if (exportOptions.productSummary) {
        const productRows = getProductSummaryData(filteredOrders);
        downloadCSV(createCSV(productRows), `product_summary_${timestamp}${filterSuffix}.csv`);
    }

    if (exportOptions.categorySummary) {
        const categoryRows = getCategorySummaryData(filteredOrders);
        downloadCSV(createCSV(categoryRows), `category_summary_${timestamp}${filterSuffix}.csv`);
    }

    if (exportOptions.orders) {
        const orderRows = getOrdersData(filteredOrders);
        downloadCSV(createCSV(orderRows), `orders_${timestamp}${filterSuffix}.csv`);
    }

    if (exportOptions.detailedBreakdown) {
        const detailedRows = getDetailedBreakdownData(filteredOrders);
        downloadCSV(createCSV(detailedRows), `detailed_breakdown_${timestamp}${filterSuffix}.csv`);
    }

    closeExportModal();
    showToast('Reports exported successfully', 'success');
}

// Helper function to get filter suffix for filenames
function getFilterSuffix() {
    const filterInfo = [];
    
    if (dateFromInput?.value && dateToInput?.value) {
        filterInfo.push(`${dateFromInput.value}_to_${dateToInput.value}`);
    }
    if (customerInput?.value) filterInfo.push(`customer_${customerInput.value}`);
    if (productInput?.value) filterInfo.push(`product_${productInput.value}`);
    if (categoryInput?.value) filterInfo.push(`category_${categoryInput.value}`);
    
    return filterInfo.length > 0 ? `_${filterInfo.join('_')}` : '';
}

// Helper functions to get data for each report type
function getProductSummaryData(orders) {
    const productTotals = groupByProduct(orders);
    return [
        ['Product', 'Quantity', 'Category'],
        ...Object.entries(productTotals).map(([product, qty]) => {
            const category = orders.find(o => 
                o.items.some(i => i.name === product)
            )?.derivedCategories.find(c => 
                c.product === product
            )?.category || 'Uncategorized';
            return [product, qty, category];
        })
    ];
}

function getCategorySummaryData(orders) {
    const categoryTotals = groupByCategory(orders);
    return [
        ['Category', 'Total Products', 'Total Quantity', 'Product Details'],
        ...Object.entries(categoryTotals).map(([category, data]) => [
            category,
            data.products.size,
            data.totalQty,
            data.details.join(', ')
        ])
    ];
}

function getOrdersData(orders) {
    return [
        ['Order ID', 'Date', 'Customer', 'Address', 'Products'],
        ...orders.map(order => [
            order.orderId,
            order.orderDate,
            order.customer.name,
            order.customer.address,
            order.items.map(item => `${item.name} (${item.qty})`).join(', ')
        ])
    ];
}

// Update export button click handler
exportBtn?.addEventListener('click', showExportModal);

// Make modal functions available globally
window.closeExportModal = closeExportModal;
window.executeExport = executeExport;

// Helper function to group orders by product with customer details
function groupByProductWithCustomers(orders) {
    const productDetails = {};
    
    orders.forEach(order => {
        order.items.forEach(item => {
            if (!productDetails[item.name]) {
                productDetails[item.name] = {
                    totalQty: 0,
                    customers: {}
                };
            }
            
            productDetails[item.name].totalQty += item.qty;
            
            // Add customer details
            const customerName = order.customer.name;
            if (!productDetails[item.name].customers[customerName]) {
                productDetails[item.name].customers[customerName] = 0;
            }
            productDetails[item.name].customers[customerName] += item.qty;
        });
    });
    
    return productDetails;
}

// Function to update detailed breakdown table
function updateDetailedBreakdown(orders) {
    const tbody = document.querySelector('#detailedTable tbody');
    tbody.innerHTML = '';
    
    const productDetails = groupByProductWithCustomers(orders);
    
    // Sort products by total quantity
    const sortedProducts = Object.entries(productDetails)
        .sort(([,a], [,b]) => b.totalQty - a.totalQty);
    
    sortedProducts.forEach(([product, details]) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${product}</td>
            <td>${details.totalQty}</td>
            <td>
                <button class="btn btn-ghost btn-sm" onclick="toggleCustomerDetails(this, '${product.replace(/'/g, "\\'")}')">
                    Show Details
                </button>
            </td>
            <td></td>
        `;
        tbody.appendChild(tr);
        
        // Create hidden customer details row
        const detailsRow = document.createElement('tr');
        detailsRow.className = 'customer-details hidden';
        detailsRow.style.display = 'none';
        
        // Sort customers by quantity
        const sortedCustomers = Object.entries(details.customers)
            .sort(([,a], [,b]) => b - a);
        
        const customerList = sortedCustomers
            .map(([customer, qty]) => `${customer}: ${qty}`)
            .join('<br>');
        
        detailsRow.innerHTML = `
            <td colspan="4" class="details-cell">
                <div class="customer-list">
                    ${customerList}
                </div>
            </td>
        `;
        tbody.appendChild(detailsRow);
    });
}

// Add to window for onclick access
window.toggleCustomerDetails = function(button, product) {
    const detailsRow = button.closest('tr').nextElementSibling;
    const isHidden = detailsRow.style.display === 'none';
    
    detailsRow.style.display = isHidden ? 'table-row' : 'none';
    button.textContent = isHidden ? 'Hide Details' : 'Show Details';
};

// Update excel export to include detailed breakdown
function getDetailedBreakdownData(orders) {
    const productDetails = groupByProductWithCustomers(orders);
    const rows = [];
    
    // Add headers
    rows.push(['Product', 'Total Quantity', 'Customer Breakdown']);
    
    // Add data
    Object.entries(productDetails)
        .sort(([,a], [,b]) => b.totalQty - a.totalQty)
        .forEach(([product, details]) => {
            // Add product row
            rows.push([product, details.totalQty, '']);
            
            // Add customer breakdown
            Object.entries(details.customers)
                .sort(([,a], [,b]) => b - a)
                .forEach(([customer, qty]) => {
                    rows.push(['', '', `${customer}: ${qty}`]);
                });
            
            // Add empty row for spacing
            rows.push(['', '', '']);
        });
    
    return rows;
}

// Add CSS for the detailed view
const style = document.createElement('style');
style.textContent = `
    .customer-details td {
        background-color: #f9fafb;
        padding: 1rem;
    }
    
    .customer-list {
        font-size: 0.875rem;
        line-height: 1.5;
    }
    
    .details-cell {
        padding: 1rem !important;
    }
`;
document.head.appendChild(style);

// Helper functions for CSV export
function createCSV(rows) {
    return rows.map(row => 
        row.map(cell => {
            // Handle cells that contain commas or quotes
            if (cell === null || cell === undefined) {
                return '';
            }
            const cellStr = String(cell);
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
        }).join(',')
    ).join('\n');
}

function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (navigator.msSaveBlob) { // IE 10+
        navigator.msSaveBlob(blob, filename);
    } else {
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
} 