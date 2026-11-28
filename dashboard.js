// --- Dashboard Visibility ---


function showDashboard(isAuthorized) {

    $('dashboardLogin').hidden = isAuthorized;

    $('dashboardContent').hidden = !isAuthorized;

    if (isAuthorized) {

        switchDashboardSection('overview');

        loadDashboardRole();

    } else {

        $('totalProducts').textContent = '—';

        $('totalInquiries').textContent = '—';

        $('totalCatalogs').textContent = '—';

        $('totalOffers').textContent = '—';

        $('recentInquiries').replaceChildren();

        $('dashboardProducts').replaceChildren();

        $('dashboardInquiries').replaceChildren();

        $('dashboardCatalogs').replaceChildren();

        $('dashboardOffers').replaceChildren();

        $('dashboardLogins').replaceChildren();

        dashboardInquiryRows = [];

        dashboardCurrentAccount = null;

        $('manageLoginsNav').hidden = true;

        $('currentLoginId').textContent = '—';

        $('currentLoginRole').textContent = '—';

        $('inquirySearch').value = '';

        $('inquiryStatusFilter').replaceChildren(
            new Option('All Statuses', '')
        );

        closeProductForm();

        closeDashboardInquiry();

        closeCatalogForm();

        closeOfferForm();

        closeDashboardLoginForm();
    }
}



// --- Dashboard Login ---

async function loginDashboard(e) {
    e.preventDefault();

    const status = $('loginStatus');
    const btn = e.submitter;

    if (btn) btn.disabled = true;

    status.textContent = 'Signing in...';

    try {
        const id = $('adminId').value.trim().toLowerCase();

        if (!/^[a-z0-9._-]{3,30}$/.test(id)) {
            throw Error('Invalid login ID or password');
        }

        await query(sb.auth.signInWithPassword({
            email: idToEmail(id),
            password: $('adminPass').value
        }));

        if (!await owner()) {
            await query(sb.auth.signOut());
            throw Error('Not an authorized owner');
        }

        status.textContent = '';
        showDashboard(true);

    } catch (err) {
        showDashboard(false);
        status.textContent = err.message;

    } finally {
        $('adminPass').value = '';

        if (btn) btn.disabled = false;
    }
}

// --- Session Verification ---

async function checkDashboardSession() {
    try {
        const authorized = await owner();

        showDashboard(authorized);

    } catch (err) {
        showDashboard(false);
        $('loginStatus').textContent = err.message;
    }
}

// --- Dashboard Logout ---

async function logoutDashboard() {

    if (productOperationInProgress) {

        alert('Please wait for the current product operation to finish.');

        return;
    }

    showDashboard(false);

    try {
        await query(sb.auth.signOut());

        $('loginStatus').textContent =
            'Logged out successfully.';

    } catch (err) {
        $('loginStatus').textContent = err.message;
    }
}

// --- Dashboard Statistics ---

async function countRecords(table) {

    const { count, error } = await sb
        .from(table)
        .select('*', {
            count: 'exact',
            head: true
        });

    if (error) throw error;

    return count;
}

async function loadDashboardStats() {

    try {

        await requireOwner();

        const [products, inquiries, catalogs, offers] =
            await Promise.all([
                countRecords('products'),
                countRecords('inquiries'),
                countRecords('pdf_catalogs'),
                countRecords('offers')
            ]);

        $('totalProducts').textContent = products;
        $('totalInquiries').textContent = inquiries;
        $('totalCatalogs').textContent = catalogs;
        $('totalOffers').textContent = offers;

    } catch (err) {

        console.error('Statistics error:', err.message);

    }
}

// --- Recent Inquiries ---

async function loadRecentInquiries() {

    const tbody = $('recentInquiries');

    try {

        await requireOwner();

        const rows = await query(
            sb.from('inquiries')
                .select('company, name, created_at, status')
                .order('created_at', { ascending: false })
                .limit(5)
        );

        if ($('dashboardContent').hidden) return;

        tbody.replaceChildren();

        if (!rows.length) {
            tbody.innerHTML =
                '<tr><td colspan="4">No inquiries yet.</td></tr>';
            return;
        }

        for (const inquiry of rows) {

            const tr = document.createElement('tr');

            const values = [
                inquiry.company,
                inquiry.name,
                new Date(inquiry.created_at)
                    .toLocaleDateString('en-IN'),
                inquiry.status
            ];

            for (const value of values) {

                const td = document.createElement('td');

                td.textContent = value ?? '—';

                tr.appendChild(td);
            }

            tbody.appendChild(tr);
        }

    } catch (err) {

        if ($('dashboardContent').hidden) return;

        tbody.innerHTML =
            '<tr><td colspan="4">Unable to load inquiries.</td></tr>';

        console.error(err.message);
    }
}

// --- Dashboard Navigation ---

function switchDashboardSection(section) {

    if (productOperationInProgress) {

        alert('Please wait for the current product operation to finish.');

        return;
    }

    if (section === 'logins' &&
    $('manageLoginsNav').hidden) {
        return;
    }

    const target = $(section + 'Section');

    if (!target || $('dashboardContent').hidden) return;

    document.querySelectorAll('.dashboard-section')
        .forEach(panel => {
            panel.hidden = panel !== target;
        });

    document.querySelectorAll('.admin-nav button')
        .forEach(button => {

            const active =
                button.dataset.section === section;

            button.classList.toggle('btn-gold', active);

            button.classList.toggle('btn-outline', !active);

        });

    switch (section) {

        case 'overview':
            loadDashboardStats();
            loadRecentInquiries();
            break;

        case 'products':
            loadDashboardProducts();
            break;

        case 'inquiries':
            loadDashboardInquiries();
            break;

        case 'catalogs':
            loadDashboardCatalogs();
            break;

        case 'offers':
            loadDashboardOffers();
            break;

        case 'logins':
            loadDashboardLogins();
            break;
    }
}

// --- Products Management ---

async function loadDashboardProducts() {

    const tbody = $('dashboardProducts');

    try {

        await requireOwner();

        const rows = await query(
            sb.from('products')
                .select('*')
                .order('created_at', {
                    ascending: false
                })
        );

        if ($('dashboardContent').hidden) return;

        tbody.replaceChildren();

        if (!rows.length) {
            tbody.innerHTML =
                '<tr><td colspan="3">No products found.</td></tr>';
            return;
        }

        for (const product of rows) {

            const tr = document.createElement('tr');

            const name = document.createElement('td');
            name.textContent =
                product.name ?? product.title ?? '—';

            const category = document.createElement('td');
            category.textContent = product.category ?? '—';

            const actions = document.createElement('td');

            const editBtn = document.createElement('button');

            editBtn.type = 'button';

            editBtn.className = 'btn btn-outline';

            editBtn.textContent = 'Edit';

            editBtn.addEventListener('click', () => {

                editDashboardProduct(product.id);

            });

            const deleteBtn = document.createElement('button');

            deleteBtn.type = 'button';

            deleteBtn.className = 'btn btn-outline';

            deleteBtn.textContent = 'Delete';

            deleteBtn.addEventListener('click', () => {

                deleteDashboardProduct(
                    product.id,
                    product.name
                );

            });

            actions.append(editBtn, deleteBtn);

            tr.append(name, category, actions);

            tbody.appendChild(tr);
        }

    } catch (err) {

        if ($('dashboardContent').hidden) return;

        tbody.innerHTML =
            '<tr><td colspan="3">Unable to load products.</td></tr>';

        console.error('Products error:', err.message);
    }
}

// --- Product Form ---


let editingProductId = null;

let existingProductImage = null;

let removeExistingImage = false;

let productOperationInProgress = false;


function openProductForm() {

    if (productOperationInProgress) {

        alert('Please wait for the current product operation to finish.');

        return;
    }

    if ($('dashboardContent').hidden) return;

    closeProductForm(); // NEW LINE

    $('productFormCard').hidden = false;

    if (!$('productHighlights').children.length) {
        addProductHighlight();
    }

    if (!$('productSkus').children.length) {
        addProductSku();
    }

    $('productName').focus();
}


function closeProductForm() {

    editingProductId = null;

    existingProductImage = null;

    removeExistingImage = false;

    $('productFormTitle').textContent =
        'Add New Product';

    $('saveProductBtn').textContent =
        'Save Product';

    $('saveProductBtn').disabled = false;

    $('dashboardProductForm').reset();

    $('productFormStatus').textContent = '';

    clearProductPreview();

    $('productHighlights').replaceChildren();

    $('productSkus').replaceChildren();

    $('productFormCard').hidden = true;
}
// --- Product Image Preview ---

let productPreviewUrl = null;


function restoreExistingProductPreview() {

    if (existingProductImage && !removeExistingImage) {

        $('previewImage').src = existingProductImage;

        $('productImagePreview').hidden = false;

    }
}

function previewProductImage() {

    const file = $('productImage').files[0];

    clearProductPreview();

    $('productFormStatus').textContent = '';

    if (!file) {

        restoreExistingProductPreview();

        return;
    }

    const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/webp'
    ];

    if (!allowedTypes.includes(file.type)) {

        $('productFormStatus').textContent =
            'Please select a JPG, PNG or WebP image.';

        $('productImage').value = '';

        restoreExistingProductPreview();

        return;
    }

    if (file.size > 5 * 1024 * 1024) {

        $('productFormStatus').textContent =
            'Image must not exceed 5 MB.';

        $('productImage').value = '';

        restoreExistingProductPreview();

        return;
    }

    removeExistingImage = false;

    productPreviewUrl = URL.createObjectURL(file);

    $('previewImage').src = productPreviewUrl;

    $('productImagePreview').hidden = false;
}

function clearProductPreview() {

    if (productPreviewUrl) {

        URL.revokeObjectURL(productPreviewUrl);

        productPreviewUrl = null;
    }

    $('previewImage').removeAttribute('src');

    $('productImagePreview').hidden = true;
}

function removeProductImage() {

    $('productImage').value = '';

    $('productFormStatus').textContent = '';

    clearProductPreview();

    if (editingProductId !== null) {

        removeExistingImage = true;

    }
}

// --- Product Form Validation ---

function validateProductForm() {

    const name = $('productName').value.trim();

    const category = $('productCategory').value.trim();

    if (!name) {
        throw Error('Product name is required.');
    }

    if (!category) {
        throw Error('Product category is required.');
    }

    const skus = getProductSkus();

    const codes = new Set();

    for (const sku of skus) {

        if (!sku.code) {
            throw Error('Every entered SKU needs a code.');
        }

        const code = sku.code.toUpperCase();

        if (codes.has(code)) {
            throw Error('Duplicate SKU code: ' + sku.code);
        }

        codes.add(code);
    }

    return true;
}

// --- Product Highlights ---

function addProductHighlight(value = '') {

    const row = document.createElement('div');

    row.className = 'highlight-row';

    const input = document.createElement('input');

    input.type = 'text';
    input.className = 'highlight-input';
    input.placeholder = 'Enter product highlight';
    input.setAttribute('aria-label', 'Product highlight');
    input.value = value;

    const removeBtn = document.createElement('button');

    removeBtn.type = 'button';
    removeBtn.className = 'btn btn-outline';
    removeBtn.textContent = 'Remove';

    removeBtn.addEventListener('click', () => {

        row.remove();

    });

    row.append(input, removeBtn);

    $('productHighlights').appendChild(row);
}

function getProductHighlights() {

    return Array.from(
        document.querySelectorAll('.highlight-input')
    )
    .map(input => input.value.trim())
    .filter(value => value !== '');
}

// --- Product SKU Management ---

function addProductSku(values = {}) {

    const card = document.createElement('div');

    card.className = 'sku-card';

    card.innerHTML = `
        <div class="sku-header">

            <h4 class="sku-title">SKU Variant</h4>

            <button type="button"
                    class="btn btn-outline remove-sku">
                Remove
            </button>

        </div>

        <div class="sku-fields">

            <label class="sku-field">
                SKU Code
                <input type="text"
                       data-field="code"
                       placeholder="Enter SKU code">
            </label>

            <label class="sku-field">
                Size
                <input type="text"
                       data-field="size"
                       placeholder="Enter size">
            </label>

            <label class="sku-field">
                Material
                <input type="text"
                       data-field="mat"
                       placeholder="Enter material">
            </label>

            <label class="sku-field">
                Packing Quantity
                <input type="text"
                       data-field="qty"
                       placeholder="Enter quantity">
            </label>

            <label class="sku-field sku-field-full">
                Specification
                <input type="text"
                       data-field="spec"
                       placeholder="Enter specification">
            </label>

        </div>
    `;

    card.querySelectorAll('[data-field]')
        .forEach(input => {

            input.value =
                values[input.dataset.field] ?? '';

        });

    card.querySelector('.remove-sku')
        .addEventListener('click', () => {

            card.remove();

            updateSkuNumbers();

        });

    $('productSkus').appendChild(card);

    updateSkuNumbers();
}

function updateSkuNumbers() {

    $('productSkus')
        .querySelectorAll('.sku-title')
        .forEach((title, index) => {

            title.textContent = 'SKU #' + (index + 1);

        });
}

function getProductSkus() {

    const cards = $('productSkus')
        .querySelectorAll('.sku-card');

    return Array.from(cards)
        .map(card => {

            const sku = {};

            card.querySelectorAll('[data-field]')
                .forEach(input => {

                    sku[input.dataset.field] =
                        input.value.trim();

                });

            return sku;

        })
        .filter(sku =>
            Object.values(sku).some(Boolean)
        );
}


// --- Product Image Upload ---

async function uploadProductImage(file) {

    if (!file) return null;

    await requireOwner();

    const allowedTypes = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp'
    };

    const extension = allowedTypes[file.type];

    if (!extension) {
        throw Error('Unsupported image format.');
    }

    if (file.size > 5 * 1024 * 1024) {
        throw Error('Image must not exceed 5 MB.');
    }

    const fileName =
        'products/' +
        crypto.randomUUID() +
        '.' +
        extension;

    await query(
        sb.storage
            .from('website-media')
            .upload(fileName, file, {
                contentType: file.type,
                upsert: false
            })
    );

    const { data } = sb.storage
        .from('website-media')
        .getPublicUrl(fileName);

    return {
        url: data.publicUrl,
        path: fileName
    };
}

// --- Product Data Preparation ---

function getProductData(imageUrl = null) {

    validateProductForm();

    return {
        name: $('productName').value.trim(),

        category: $('productCategory').value.trim(),

        desc: $('productDescription').value.trim(),

        image: imageUrl,

        highlights: getProductHighlights(),

        skus: getProductSkus()
    };
}

// --- Save New Product ---


async function saveDashboardProduct(e) {

    e.preventDefault();

    const status = $('productFormStatus');
    const btn = $('saveProductBtn');

    if (btn.disabled || productOperationInProgress) return;

    const productId = editingProductId;
    const isEditing = productId !== null;

    let uploadedImage = null;
    let productSaved = false;

    btn.disabled = true;
    productOperationInProgress = true;

    try {

        const product = getProductData();

        const file = $('productImage').files[0];

        // Retain or remove the existing image.
        if (isEditing) {

            product.image = removeExistingImage
                ? null
                : existingProductImage;
        }

        await requireOwner();

        // Upload a replacement image if selected.
        if (file) {

            status.textContent = 'Uploading image...';

            uploadedImage =
                await uploadProductImage(file);

            product.image = uploadedImage.url;
        }

        status.textContent = isEditing
            ? 'Updating product...'
            : 'Saving product...';

        let request;

        if (isEditing) {

            request = sb.from('products')
                .update(product)
                .eq('id', productId);

        } else {

            request = sb.from('products')
                .insert(product);
        }

        const { data, error } = await request
            .select('id')
            .single();

        if (error) {
            throw error;
        }

        productSaved = true;

        closeProductForm();

        await loadDashboardProducts();

        await loadDashboardStats();

        alert(isEditing
            ? 'Product updated successfully.'
            : 'Product added successfully.');

    } catch (err) {

        status.textContent = productSaved
            ? 'Product saved, but refresh failed.'
            : 'Unable to confirm save: ' + err.message;

        console.error('Product save error:', err);

        if (uploadedImage && !productSaved) {

            console.warn(
                'Check uploaded image before cleanup:',
                uploadedImage.path
            );
        }

    } finally {

        productOperationInProgress = false;

        btn.disabled = false;
    }
}



// --- Edit Product ---

async function editDashboardProduct(id) {

    if (productOperationInProgress) {

        alert('Please wait for the current product operation to finish.');

        return;
    }

    try {

        await requireOwner();

        const product = await query(
            sb.from('products')
                .select('*')
                .eq('id', id)
                .single()
        );

        if ($('dashboardContent').hidden) return;

        closeProductForm();

        editingProductId = product.id;

        existingProductImage = product.image;

        if (existingProductImage) {

            $('previewImage').src = existingProductImage;

            $('productImagePreview').hidden = false;

        }

        $('productFormTitle').textContent =
            'Edit Product';

        $('saveProductBtn').textContent =
            'Update Product';

        $('saveProductBtn').disabled = false;

        $('productName').value =
            product.name ?? '';

        $('productCategory').value =
            product.category ?? '';

        $('productDescription').value =
            product.desc ?? '';

        (product.highlights ?? [])
            .forEach(highlight => {

                addProductHighlight(highlight);

            });

        (product.skus ?? [])
            .forEach(sku => {

                addProductSku(sku);

            });

        $('productFormCard').hidden = false;

        $('productFormCard').scrollIntoView({
            behavior: 'smooth'
        });

    } catch (err) {

        alert('Unable to load product: ' + err.message);

        console.error(err);
    }
}


 // --- Delete Product ---

async function deleteDashboardProduct(id, name) {

    if (productOperationInProgress) return;

    const confirmed = confirm(
        'Are you sure you want to delete "' +
        name +
        '"?\n\nThis action cannot be undone.'
    );

    if (!confirmed) return;

    productOperationInProgress = true;

    try {

        await requireOwner();

        await query(
            sb.from('products')
                .delete()
                .eq('id', id)
                .select('id')
                .single()
        );

        if (editingProductId === id) {

            closeProductForm();
        }

        await loadDashboardProducts();

        await loadDashboardStats();

        alert('Product deleted successfully.');

    } catch (err) {

        alert(
            'Unable to confirm product deletion: ' +
            err.message
        );

        console.error('Delete product error:', err);

    } finally {

        productOperationInProgress = false;
    }
}



// ========================================
// SHARED DASHBOARD UTILITIES
// ========================================

function dashboardMessage(id, message, type = '') {

    const element = $(id);

    element.textContent = message;

    element.classList.remove(
        'message-success',
        'message-error',
        'message-warning',
        'message-loading'
    );

    if (type) {
        element.classList.add('message-' + type);
    }
}

function dashboardDate(value) {

    if (!value) return '—';

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? '—'
        : date.toLocaleDateString('en-IN');
}

function dashboardCell(value) {

    const td = document.createElement('td');

    td.textContent = value ?? '—';

    return td;
}

function dashboardButton(label, callback, danger = false) {

    const button = document.createElement('button');

    button.type = 'button';

    button.className = danger
        ? 'btn btn-outline btn-danger'
        : 'btn btn-outline';

    button.textContent = label;

    button.addEventListener('click', callback);

    return button;
}

function dashboardEmptyTable(id, columns, message) {

    const tbody = $(id);

    tbody.replaceChildren();

    const tr = document.createElement('tr');

    const td = dashboardCell(message);

    td.colSpan = columns;

    td.className = 'table-empty';

    tr.appendChild(td);

    tbody.appendChild(tr);
}

function dashboardBadge(value) {

    const badge = document.createElement('span');

    const status = String(value || 'Unknown');

    const className = status.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-');

    badge.className =
        'status-badge status-' + className;

    badge.textContent = status;

    return badge;
}

function dashboardSafeUrl(value) {

    try {

        const url = new URL(value);

        return url.protocol === 'https:'
            ? url.href
            : null;

    } catch {

        return null;
    }
}

async function dashboardUpload(file, folder) {

    if (!file) return null;

    await requireOwner();

    const allowedTypes = folder === 'catalogs'
        ? { 'application/pdf': 'pdf' }
        : {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp'
        };

    const extension = allowedTypes[file.type];

    if (!extension) {
        throw Error('Unsupported file type.');
    }

    const limit = folder === 'catalogs' ? 20 : 5;

    if (file.size > limit * 1024 * 1024) {

        throw Error(
            'File must not exceed ' + limit + ' MB.'
        );
    }

    const path =
        folder + '/' +
        crypto.randomUUID() +
        '.' + extension;

    await query(
        sb.storage
            .from('website-media')
            .upload(path, file, {
                contentType: file.type,
                upsert: false
            })
    );

    return {
        path,
        url: sb.storage
            .from('website-media')
            .getPublicUrl(path)
            .data.publicUrl
    };
}



// ========================================
// INQUIRY MANAGEMENT
// ========================================

let dashboardInquiryRows = [];
let selectedInquiryId = null;

async function loadDashboardInquiries() {

    try {

        dashboardMessage(
            'inquiriesStatus',
            'Loading inquiries...',
            'loading'
        );

        await requireOwner();

        const rows = await query(
            sb.from('inquiries')
                .select('*')
                .order('created_at', {
                    ascending: false
                })
        );

        if ($('dashboardContent').hidden) return;

        dashboardInquiryRows = rows;

        populateInquiryStatuses();

        renderDashboardInquiries();

        dashboardMessage('inquiriesStatus', '');

    } catch (err) {

        dashboardInquiryRows = [];

        dashboardEmptyTable(
            'dashboardInquiries',
            6,
            'Unable to load inquiries.'
        );

        dashboardMessage(
            'inquiriesStatus',
            err.message,
            'error'
        );
    }
}

function populateInquiryStatuses() {

    const statuses = [...new Set(
        dashboardInquiryRows
            .map(row => row.status)
            .filter(Boolean)
    )];

    const filter = $('inquiryStatusFilter');

    const previous = filter.value;

    filter.replaceChildren(
        new Option('All Statuses', '')
    );

    statuses.forEach(status => {

        filter.add(new Option(status, status));

    });

    filter.value = statuses.includes(previous)
        ? previous
        : '';
}

function renderDashboardInquiries() {

    const search = $('inquirySearch')
        .value.trim().toLowerCase();

    const status = $('inquiryStatusFilter').value;

    const rows = dashboardInquiryRows.filter(row => {

        const searchable = [
            row.company,
            row.name,
            row.email,
            row.phone
        ].join(' ').toLowerCase();

        return searchable.includes(search) &&
            (!status || row.status === status);
    });

    const tbody = $('dashboardInquiries');

    tbody.replaceChildren();

    if (!rows.length) {

        dashboardEmptyTable(
            'dashboardInquiries',
            6,
            'No matching inquiries.'
        );

        return;
    }

    for (const inquiry of rows) {

        const tr = document.createElement('tr');

        const statusCell = document.createElement('td');

        statusCell.append(
            dashboardBadge(inquiry.status)
        );

        const actions = document.createElement('td');

        actions.append(
            dashboardButton('View', () => {
                viewDashboardInquiry(inquiry.id);
            })
        );

        tr.append(
            dashboardCell(inquiry.company),
            dashboardCell(inquiry.name),
            dashboardCell(
                inquiry.email || inquiry.phone
            ),
            dashboardCell(
                dashboardDate(inquiry.created_at)
            ),
            statusCell,
            actions
        );

        tbody.appendChild(tr);
    }
}

function viewDashboardInquiry(id) {

    if (productOperationInProgress) return;

    const inquiry = dashboardInquiryRows.find(
        row => row.id === id
    );

    if (!inquiry) return;

    selectedInquiryId = id;

    const details = $('inquiryDetails');

    details.replaceChildren();

    const fields = {
        'Company': inquiry.company,
        'Customer': inquiry.name,
        'Email': inquiry.email,
        'Phone': inquiry.phone,
        'Requested Items': Array.isArray(inquiry.items)
            ? inquiry.items.join(', ')
            : inquiry.items,
        'Notes': inquiry.notes,
        'Date': dashboardDate(inquiry.created_at),
        'Status': inquiry.status
    };

    for (const [label, value] of Object.entries(fields)) {

        const dt = document.createElement('dt');

        const dd = document.createElement('dd');

        dt.textContent = label;

        dd.textContent = value || '—';

        details.append(dt, dd);
    }

    const select = $('inquiryNewStatus');

    select.replaceChildren();

    const statuses = [...new Set(
        [inquiry.status, 'Reviewed'].filter(Boolean)
    )];

    statuses.forEach(status => {

        select.add(new Option(status, status));

    });

    select.value = inquiry.status || 'Reviewed';

    $('updateInquiryBtn').disabled = false;

    dashboardMessage('inquiryUpdateStatus', '');

    $('inquiryDetailsCard').hidden = false;

    $('inquiryDetailsCard').scrollIntoView({
        behavior: 'smooth'
    });
}

function closeDashboardInquiry() {

    selectedInquiryId = null;

    $('inquiryDetails').replaceChildren();

    $('inquiryDetailsCard').hidden = true;

    $('updateInquiryBtn').disabled = true;

    dashboardMessage('inquiryUpdateStatus', '');
}

async function updateDashboardInquiry(e) {

    e.preventDefault();

    if (productOperationInProgress) return;

    if (selectedInquiryId === null) return;

    const id = selectedInquiryId;

    const status = $('inquiryNewStatus').value;

    const btn = $('updateInquiryBtn');

    if (status !== 'Reviewed') {

        dashboardMessage(
            'inquiryUpdateStatus',
            'Select Reviewed to update this inquiry.',
            'warning'
        );

        return;
    }

    productOperationInProgress = true;

    btn.disabled = true;

    try {

        await requireOwner();

        await query(
            sb.from('inquiries')
                .update({ status })
                .eq('id', id)
                .select('id')
                .single()
        );

        await loadDashboardInquiries();

        await loadRecentInquiries();

        viewDashboardInquiryAfterUpdate(id);

        dashboardMessage(
            'inquiryUpdateStatus',
            'Inquiry status updated successfully.',
            'success'
        );

    } catch (err) {

        dashboardMessage(
            'inquiryUpdateStatus',
            err.message,
            'error'
        );

    } finally {

        productOperationInProgress = false;

        btn.disabled = false;
    }
}

function viewDashboardInquiryAfterUpdate(id) {

    const inquiry = dashboardInquiryRows.find(
        row => row.id === id
    );

    if (!inquiry) {

        closeDashboardInquiry();

        return;
    }

    const values = $('inquiryDetails')
        .querySelectorAll('dd');

    if (values.length) {

        values[values.length - 1].textContent =
            inquiry.status;
    }

    $('inquiryNewStatus').value = inquiry.status;
}


// ========================================
// PDF CATALOG MANAGEMENT
// ========================================

async function loadDashboardCatalogs() {

    try {

        dashboardMessage(
            'catalogsStatus',
            'Loading catalogs...',
            'loading'
        );

        await requireOwner();

        const rows = await query(
            sb.from('pdf_catalogs')
                .select('*')
                .order('created_at', {
                    ascending: false
                })
        );

        if ($('dashboardContent').hidden) return;

        const tbody = $('dashboardCatalogs');

        tbody.replaceChildren();

        if (!rows.length) {

            dashboardEmptyTable(
                'dashboardCatalogs',
                3,
                'No catalogs found.'
            );
        }

        for (const catalog of rows) {

            const tr = document.createElement('tr');

            const actions = document.createElement('td');

            const url = dashboardSafeUrl(catalog.url);

            if (url) {

                const link = document.createElement('a');

                link.href = url;

                link.target = '_blank';

                link.rel = 'noopener noreferrer';

                link.className = 'btn btn-outline';

                link.textContent = 'View PDF';

                actions.appendChild(link);
            }

            actions.append(
                dashboardButton(
                    'Delete',
                    () => deleteDashboardCatalog(catalog),
                    true
                )
            );

            tr.append(
                dashboardCell(catalog.title),
                dashboardCell(
                    dashboardDate(catalog.created_at)
                ),
                actions
            );

            tbody.appendChild(tr);
        }

        dashboardMessage('catalogsStatus', '');

    } catch (err) {

        dashboardEmptyTable(
            'dashboardCatalogs',
            3,
            'Unable to load catalogs.'
        );

        dashboardMessage(
            'catalogsStatus',
            err.message,
            'error'
        );
    }
}

function openCatalogForm() {

    if (productOperationInProgress) return;

    closeCatalogForm();

    $('catalogFormCard').hidden = false;

    $('catalogTitle').focus();
}

function closeCatalogForm() {

    $('dashboardCatalogForm').reset();

    removeCatalogFile();

    dashboardMessage('catalogFormStatus', '');

    $('catalogFormCard').hidden = true;
}

function removeCatalogFile() {

    $('catalogFile').value = '';

    $('catalogFileName').textContent = '';

    $('catalogFileSize').textContent = '';

    $('catalogFilePreview').hidden = true;

    $('saveCatalogBtn').disabled = true;
}

function previewCatalogFile() {

    const file = $('catalogFile').files[0];

    $('catalogFilePreview').hidden = true;

    $('saveCatalogBtn').disabled = true;

    dashboardMessage('catalogFormStatus', '');

    if (!file) return;

    if (file.type !== 'application/pdf') {

        removeCatalogFile();

        dashboardMessage(
            'catalogFormStatus',
            'Please select a PDF file.',
            'error'
        );

        return;
    }

    if (file.size > 20 * 1024 * 1024) {

        removeCatalogFile();

        dashboardMessage(
            'catalogFormStatus',
            'PDF must not exceed 20 MB.',
            'error'
        );

        return;
    }

    $('catalogFileName').textContent = file.name;

    $('catalogFileSize').textContent =
        (file.size / 1024 / 1024).toFixed(2) + ' MB';

    $('catalogFilePreview').hidden = false;

    $('saveCatalogBtn').disabled = false;
}

async function saveDashboardCatalog(e) {

    e.preventDefault();

    if (productOperationInProgress) return;

    const title = $('catalogTitle').value.trim();

    const file = $('catalogFile').files[0];

    const btn = $('saveCatalogBtn');

    let uploaded = null;

    productOperationInProgress = true;

    btn.disabled = true;

    try {

        if (!title) throw Error('Catalog title is required.');

        if (!file) throw Error('Select a PDF file.');

        await requireOwner();

        dashboardMessage(
            'catalogFormStatus',
            'Uploading PDF...',
            'loading'
        );

        uploaded = await dashboardUpload(
            file,
            'catalogs'
        );

        await query(
            sb.from('pdf_catalogs')
                .insert({
                    title,
                    url: uploaded.url
                })
                .select('id')
                .single()
        );

        closeCatalogForm();

        await loadDashboardCatalogs();

        await loadDashboardStats();

        dashboardMessage(
            'catalogsStatus',
            'Catalog uploaded successfully.',
            'success'
        );

    } catch (err) {

        dashboardMessage(
            'catalogFormStatus',
            'Unable to confirm upload: ' + err.message,
            'error'
        );

        if (uploaded) {

            console.warn(
                'Check catalog before storage cleanup:',
                uploaded.path
            );
        }

    } finally {

        productOperationInProgress = false;

        btn.disabled = !$('catalogFile').files.length;
    }
}

async function deleteDashboardCatalog(catalog) {

    if (productOperationInProgress) return;

    if (!confirm(
        'Delete catalog "' + catalog.title + '"?'
    )) return;

    productOperationInProgress = true;

    try {

        await requireOwner();

        await query(
            sb.from('pdf_catalogs')
                .delete()
                .eq('id', catalog.id)
                .select('id')
                .single()
        );

        await loadDashboardCatalogs();

        await loadDashboardStats();

        dashboardMessage(
            'catalogsStatus',
            'Catalog deleted successfully.',
            'success'
        );

    } catch (err) {

        dashboardMessage(
            'catalogsStatus',
            err.message,
            'error'
        );

    } finally {

        productOperationInProgress = false;
    }
}



// ========================================
// OFFERS MANAGEMENT
// ========================================

let editingOfferId = null;
let existingOfferImage = null;
let removeExistingOfferImage = false;
let offerPreviewUrl = null;

function getOfferStatus(offer) {

    if (!offer.ends_on) return 'Active';

    const parts = new Intl.DateTimeFormat(
        'en-GB',
        {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }
    ).formatToParts(new Date());

    const getPart = type =>
        parts.find(part => part.type === type).value;

    const today =
        getPart('year') + '-' +
        getPart('month') + '-' +
        getPart('day');

    return offer.ends_on < today
        ? 'Expired'
        : 'Active';
}

async function loadDashboardOffers() {

    try {

        dashboardMessage(
            'offersStatus',
            'Loading offers...',
            'loading'
        );

        await requireOwner();

        const rows = await query(
            sb.from('offers')
                .select('*')
                .order('created_at', {
                    ascending: false
                })
        );

        if ($('dashboardContent').hidden) return;

        const tbody = $('dashboardOffers');

        tbody.replaceChildren();

        if (!rows.length) {

            dashboardEmptyTable(
                'dashboardOffers',
                5,
                'No offers found.'
            );
        }

        for (const offer of rows) {

            const tr = document.createElement('tr');

            const status = document.createElement('td');

            status.append(
                dashboardBadge(getOfferStatus(offer))
            );

            const actions = document.createElement('td');

            actions.append(

                dashboardButton('Edit', () => {
                    editDashboardOffer(offer);
                }),

                dashboardButton('Delete', () => {
                    deleteDashboardOffer(offer);
                }, true)
            );

            tr.append(
                dashboardCell(offer.title),
                dashboardCell(offer.badge),
                dashboardCell(
                    offer.ends_on
                        ? dashboardDate(offer.ends_on)
                        : 'No expiry'
                ),
                status,
                actions
            );

            tbody.appendChild(tr);
        }

        dashboardMessage('offersStatus', '');

    } catch (err) {

        dashboardEmptyTable(
            'dashboardOffers',
            5,
            'Unable to load offers.'
        );

        dashboardMessage(
            'offersStatus',
            err.message,
            'error'
        );
    }
}

function clearOfferPreview() {

    if (offerPreviewUrl) {

        URL.revokeObjectURL(offerPreviewUrl);

        offerPreviewUrl = null;
    }

    $('previewOfferImage').removeAttribute('src');

    $('offerImagePreview').hidden = true;
}

function restoreOfferPreview() {

    const url = dashboardSafeUrl(existingOfferImage);

    if (url && !removeExistingOfferImage) {

        $('previewOfferImage').src = url;

        $('offerImagePreview').hidden = false;
    }
}

function previewDashboardOfferImage() {

    const file = $('offerImage').files[0];

    clearOfferPreview();

    dashboardMessage('offerFormStatus', '');

    if (!file) {

        restoreOfferPreview();

        return;
    }

    const allowed = [
        'image/jpeg',
        'image/png',
        'image/webp'
    ];

    if (!allowed.includes(file.type) ||
        file.size > 5 * 1024 * 1024) {

        $('offerImage').value = '';

        dashboardMessage(
            'offerFormStatus',
            'Select a JPG, PNG or WebP image under 5 MB.',
            'error'
        );

        restoreOfferPreview();

        return;
    }

    removeExistingOfferImage = false;

    offerPreviewUrl = URL.createObjectURL(file);

    $('previewOfferImage').src = offerPreviewUrl;

    $('offerImagePreview').hidden = false;
}

function removeDashboardOfferImage() {

    $('offerImage').value = '';

    removeExistingOfferImage = true;

    clearOfferPreview();
}

function closeOfferForm() {

    editingOfferId = null;

    existingOfferImage = null;

    removeExistingOfferImage = false;

    $('dashboardOfferForm').reset();

    $('offerDescription').value = '';

    clearOfferPreview();

    $('offerFormTitle').textContent = 'Add New Offer';

    $('saveOfferBtn').textContent = 'Save Offer';

    $('saveOfferBtn').disabled = true;

    dashboardMessage('offerFormStatus', '');

    $('offerFormCard').hidden = true;
}

function openOfferForm() {

    if (productOperationInProgress) return;

    closeOfferForm();

    $('offerFormCard').hidden = false;

    $('saveOfferBtn').disabled = false;

    $('offerTitle').focus();
}

function editDashboardOffer(offer) {

    if (productOperationInProgress) return;

    closeOfferForm();

    editingOfferId = offer.id;

    existingOfferImage = offer.image_url;

    $('offerTitle').value = offer.title || '';

    $('offerBadge').value =
        offer.badge || 'ANNOUNCEMENT';

    $('offerDescription').value =
        offer.description || '';

    $('offerEndDate').value = offer.ends_on || '';

    restoreOfferPreview();

    $('offerFormTitle').textContent = 'Edit Offer';

    $('saveOfferBtn').textContent = 'Update Offer';

    $('saveOfferBtn').disabled = false;

    $('offerFormCard').hidden = false;

    $('offerFormCard').scrollIntoView({
        behavior: 'smooth'
    });
}

async function saveDashboardOffer(e) {

    e.preventDefault();

    if (productOperationInProgress) return;

    const id = editingOfferId;

    const btn = $('saveOfferBtn');

    const file = $('offerImage').files[0];

    const payload = {

        title: $('offerTitle').value.trim(),

        badge: $('offerBadge').value.trim()
            || 'ANNOUNCEMENT',

        description: $('offerDescription').value.trim(),

        ends_on: $('offerEndDate').value || null,

        image_url: removeExistingOfferImage
            ? null
            : existingOfferImage
    };

    let uploaded = null;

    productOperationInProgress = true;

    btn.disabled = true;

    try {

        if (!payload.title) {
            throw Error('Offer title is required.');
        }

        await requireOwner();

        if (file) {

            dashboardMessage(
                'offerFormStatus',
                'Uploading image...',
                'loading'
            );

            uploaded = await dashboardUpload(
                file,
                'offers'
            );

            payload.image_url = uploaded.url;
        }

        dashboardMessage(
            'offerFormStatus',
            'Saving offer...',
            'loading'
        );

        const request = id !== null
            ? sb.from('offers')
                .update(payload)
                .eq('id', id)
            : sb.from('offers')
                .insert(payload);

        await query(
            request.select('id').single()
        );

        closeOfferForm();

        await loadDashboardOffers();

        await loadDashboardStats();

        dashboardMessage(
            'offersStatus',
            'Offer saved successfully.',
            'success'
        );

    } catch (err) {

        dashboardMessage(
            'offerFormStatus',
            'Unable to confirm save: ' + err.message,
            'error'
        );

        if (uploaded) {

            console.warn(
                'Check offer image before cleanup:',
                uploaded.path
            );
        }

    } finally {

        productOperationInProgress = false;

        btn.disabled = $('offerFormCard').hidden;
    }
}

async function deleteDashboardOffer(offer) {

    if (productOperationInProgress) return;

    if (!confirm(
        'Delete offer "' + offer.title + '"?'
    )) return;

    productOperationInProgress = true;

    try {

        await requireOwner();

        await query(
            sb.from('offers')
                .delete()
                .eq('id', offer.id)
                .select('id')
                .single()
        );

        if (editingOfferId === offer.id) {

            closeOfferForm();
        }

        await loadDashboardOffers();

        await loadDashboardStats();

        dashboardMessage(
            'offersStatus',
            'Offer deleted successfully.',
            'success'
        );

    } catch (err) {

        dashboardMessage(
            'offersStatus',
            err.message,
            'error'
        );

    } finally {

        productOperationInProgress = false;
    }
}



// ========================================
// LOGIN MANAGEMENT
// ========================================

let dashboardCurrentAccount = null;

async function loadDashboardRole() {

    $('manageLoginsNav').hidden = true;

    dashboardCurrentAccount = null;

    try {

        await requireOwner();

        const { user } = await query(
            sb.auth.getUser()
        );

        const row = await query(
            sb.from('website_owners')
                .select('user_id, role, login_id')
                .eq('user_id', user.id)
                .single()
        );

        if ($('dashboardContent').hidden) return;

        dashboardCurrentAccount = row;

        $('currentLoginId').textContent =
            row.login_id || '—';

        $('currentLoginRole').textContent =
            row.role || '—';

        $('manageLoginsNav').hidden =
            row.role !== 'admin';

    } catch (err) {

        console.error('Role error:', err.message);
    }
}

async function requireDashboardAdmin() {

    await requireOwner();

    const { user } = await query(
        sb.auth.getUser()
    );

    const row = await query(
        sb.from('website_owners')
            .select('role')
            .eq('user_id', user.id)
            .single()
    );

    if (row.role !== 'admin') {

        throw Error('Administrator access required.');
    }
}

async function dashboardOwnersCall(body) {

    await requireDashboardAdmin();

    const { data, error } = await sb.functions.invoke(
        'owner-admin',
        { body }
    );

    if (error) {

        let message = error.message;

        try {

            const response = await error.context.json();

            if (response?.error) {

                message = response.error;
            }

        } catch {}

        throw Error(message);
    }

    if (data?.error) {

        throw Error(data.error);
    }

    return data;
}

async function loadDashboardLogins() {

    try {

        dashboardMessage(
            'loginsStatus',
            'Loading accounts...',
            'loading'
        );

        const { owners } = await dashboardOwnersCall({
            action: 'list'
        });

        if ($('dashboardContent').hidden) return;

        const tbody = $('dashboardLogins');

        tbody.replaceChildren();

        for (const account of owners) {

            const tr = document.createElement('tr');

            const isCurrent =
                account.user_id ===
                dashboardCurrentAccount?.user_id;

            const role = document.createElement('td');

            role.append(dashboardBadge(account.role));

            const actions = document.createElement('td');

            const actionGroup = document.createElement('div');

            actionGroup.className = 'table-actions';

            actionGroup.append(

                dashboardButton(
                    'Rename',
                    () => renameDashboardLogin(account)
                ),

                dashboardButton(
                    'Password',
                    () => changeDashboardPassword(account)
                )

            );

            if (!isCurrent) {

                actionGroup.append(

                    dashboardButton(
                        account.role === 'admin'
                            ? 'Make Editor'
                            : 'Make Admin',
                        () => changeDashboardRole(account)
                    ),

                    dashboardButton(
                        'Delete',
                        () => deleteDashboardLogin(account),
                        true
                    )

                );

            }

            actions.appendChild(actionGroup);

            tr.append(

                dashboardCell(
                    (account.login_id || 'Legacy account') +
                    (isCurrent ? ' (you)' : '')
                ),

                role,

                actions

            );

            tbody.appendChild(tr);

        }

        if (!owners.length) {

            dashboardEmptyTable(
                'dashboardLogins',
                3,
                'No accounts found.'
            );

        }

        dashboardMessage('loginsStatus', '');

    } catch (err) {

        dashboardEmptyTable(
            'dashboardLogins',
            3,
            'Unable to load accounts.'
        );

        dashboardMessage(
            'loginsStatus',
            err.message,
            'error'
        );

    }

}

function closeDashboardLoginForm() {

    $('dashboardCreateLoginForm').reset();

    $('loginFormCard').hidden = true;

    $('saveLoginBtn').disabled = true;

    dashboardMessage('createLoginStatus', '');
}

// ======================================
// LOGIN MANAGEMENT OPERATIONS
// ======================================

function validDashboardLoginId(id) {

    return /^[a-z0-9._-]{3,30}$/.test(id);

}


function validDashboardPassword(password) {

    return password.length >= 10 &&
        new TextEncoder().encode(password).length <= 72;

}


function setLoginOperationBusy(busy) {

    productOperationInProgress = busy;

    $('addLoginBtn').disabled = busy;

    $('saveLoginBtn').disabled = busy;

    $('closeLoginForm').disabled = busy;

    $('cancelLoginForm').disabled = busy;

    $('dashboardLogout').disabled = busy;

    document.querySelectorAll(
        '#dashboardLogins button'
    ).forEach(button => {

        button.disabled = busy;

    });

}


async function runDashboardLoginAction(
    body,
    successMessage
) {

    if (productOperationInProgress) return false;

    setLoginOperationBusy(true);

    try {

        dashboardMessage(
            'loginsStatus',
            'Processing request...',
            'loading'
        );

        await dashboardOwnersCall(body);

        await loadDashboardRole();

        await loadDashboardLogins();

        dashboardMessage(
            'loginsStatus',
            successMessage,
            'success'
        );

        return true;

    } catch (err) {

        dashboardMessage(
            'loginsStatus',
            err.message,
            'error'
        );

        return false;

    } finally {

        setLoginOperationBusy(false);

    }

}

// --- Create New Login ---

function openDashboardLoginForm() {

    if (productOperationInProgress) return;

    $('dashboardCreateLoginForm').reset();

    $('loginFormCard').hidden = false;

    $('saveLoginBtn').disabled = false;

    dashboardMessage('createLoginStatus', '');

    $('newLoginId').focus();

}


async function createDashboardLogin(event) {

    event.preventDefault();

    if (productOperationInProgress) return;

    const id = $('newLoginId')
        .value.trim().toLowerCase();

    const password = $('newLoginPassword').value;

    const confirmPassword =
        $('confirmLoginPassword').value;

    const role = $('newLoginRole').value;

    if (!validDashboardLoginId(id)) {

        dashboardMessage(
            'createLoginStatus',
            'Enter a valid Login ID of 3–30 characters.',
            'error'
        );

        return;

    }

    if (!validDashboardPassword(password)) {

        dashboardMessage(
            'createLoginStatus',
            'Password must be at least 10 characters and no more than 72 bytes.',
            'error'
        );

        return;

    }

    if (password !== confirmPassword) {

        dashboardMessage(
            'createLoginStatus',
            'Passwords do not match.',
            'error'
        );

        return;

    }

    if (!['admin', 'editor'].includes(role)) {

        dashboardMessage(
            'createLoginStatus',
            'Invalid account role.',
            'error'
        );

        return;

    }

    dashboardMessage(
        'createLoginStatus',
        'Creating account...',
        'loading'
    );

    const success = await runDashboardLoginAction(

        {
            action: 'create',
            login_id: id,
            password: password,
            role: role
        },

        'New login created successfully.'

    );

    if (success) {

        closeDashboardLoginForm();

    } else {

        dashboardMessage(
            'createLoginStatus',
            $('loginsStatus').textContent,
            'error'
        );

    }

}

// --- Rename Login ---

async function renameDashboardLogin(account) {

    if (productOperationInProgress) return;

    const input = prompt(
        'Enter the new Login ID:',
        account.login_id || ''
    );

    if (input === null) return;

    const id = input.trim().toLowerCase();

    if (!validDashboardLoginId(id)) {

        alert(
            'Login ID must contain 3–30 valid characters.'
        );

        return;

    }

    if (id === account.login_id) return;

    if (!confirm(
        'Rename ' + account.login_id + ' to ' + id + '?'
    )) return;

    await runDashboardLoginAction(

        {
            action: 'rename',
            user_id: account.user_id,
            login_id: id
        },

        'Login ID updated successfully.'

    );

}

// --- Change Account Password ---

async function changeDashboardPassword(account) {

    if (productOperationInProgress) return;

    openDashboardPasswordDialog(account);

}


function openDashboardPasswordDialog(account) {

    const dialog = document.createElement('dialog');

    dialog.className = 'card';

    dialog.style.width = 'min(420px, 90vw)';

    dialog.style.margin = 'auto';

    const form = document.createElement('form');

    const heading = document.createElement('h3');

    heading.textContent =
        'Change Password: ' + account.login_id;

    const password = document.createElement('input');

    password.type = 'password';
    password.placeholder = 'New password';
    password.autocomplete = 'new-password';
    password.minLength = 10;
    password.required = true;
    password.setAttribute('aria-label', 'New password');

    const confirmation = document.createElement('input');

    confirmation.type = 'password';
    confirmation.placeholder = 'Confirm password';
    confirmation.autocomplete = 'new-password';
    confirmation.required = true;
    confirmation.setAttribute('aria-label', 'Confirm password');

    const status = document.createElement('p');

    status.setAttribute('role', 'status');

    const save = document.createElement('button');

    save.type = 'submit';
    save.className = 'btn btn-gold';
    save.textContent = 'Save Password';

    const cancel = document.createElement('button');

    cancel.type = 'button';
    cancel.className = 'btn btn-outline';
    cancel.textContent = 'Cancel';

    const actions = document.createElement('div');

    actions.className = 'product-form-actions';

    actions.append(cancel, save);

    form.append(
        heading,
        password,
        confirmation,
        status,
        actions
    );

    dialog.appendChild(form);

    document.body.appendChild(dialog);

    cancel.addEventListener('click', () => {

        dialog.close();

    });

    dialog.addEventListener('close', () => {

        password.value = '';
        confirmation.value = '';

        dialog.remove();

    });

    dialog.addEventListener('cancel', event => {

        if (productOperationInProgress) {

            event.preventDefault();

        }

    });

    form.addEventListener('submit', async event => {

        event.preventDefault();

        if (productOperationInProgress) return;

        if (!validDashboardPassword(password.value)) {

            status.textContent =
                'Use at least 10 characters and no more than 72 bytes.';

            return;

        }

        if (password.value !== confirmation.value) {

            status.textContent =
                'Passwords do not match.';

            return;

        }

        save.disabled = true;
        cancel.disabled = true;

        status.textContent = 'Updating password...';

        const success = await runDashboardLoginAction(

            {
                action: 'set_password',
                user_id: account.user_id,
                password: password.value
            },

            'Password updated successfully.'

        );

        if (success) {

            dialog.close();

        } else {

            status.textContent =
                $('loginsStatus').textContent;

            save.disabled = false;
            cancel.disabled = false;

        }

    });

    dialog.showModal();

    password.focus();

}

// --- Change Account Role ---

async function changeDashboardRole(account) {

    if (productOperationInProgress) return;

    if (
        account.user_id ===
        dashboardCurrentAccount?.user_id
    ) {

        alert('You cannot change your own role.');

        return;

    }

    const newRole =
        account.role === 'admin'
            ? 'editor'
            : 'admin';

    const confirmed = confirm(

        'Change ' + account.login_id +
        ' from ' + account.role +
        ' to ' + newRole + '?'

    );

    if (!confirmed) return;

    await runDashboardLoginAction(

        {
            action: 'set_role',
            user_id: account.user_id,
            role: newRole
        },

        'Account role updated successfully.'

    );

}

// --- Delete Login ---

async function deleteDashboardLogin(account) {

    if (productOperationInProgress) return;

    if (
        account.user_id ===
        dashboardCurrentAccount?.user_id
    ) {

        alert('You cannot delete your own account.');

        return;

    }

    const confirmed = confirm(

        'Permanently delete the login "' +
        account.login_id +
        '"?\n\nThis action cannot be undone.'

    );

    if (!confirmed) return;

    await runDashboardLoginAction(

        {
            action: 'delete',
            user_id: account.user_id
        },

        'Login deleted successfully.'

    );

}



// --- Dashboard Initialization ---

$('dashboardLoginForm').addEventListener(
    'submit', loginDashboard
);

$('dashboardLogout').addEventListener(
    'click', logoutDashboard
);


document.querySelectorAll('.admin-nav button')
    .forEach(button => {

        button.addEventListener('click', () => {

            switchDashboardSection(
                button.dataset.section
            );

        });

    });


$('addProductBtn').addEventListener(
    'click', openProductForm
);

function cancelProductEditing() {

    if (productOperationInProgress) {

        alert('Please wait for the current product operation to finish.');

        return;
    }

    closeProductForm();
}

$('closeProductForm').addEventListener(
    'click', cancelProductEditing
);

$('cancelProductForm').addEventListener(
    'click', cancelProductEditing
);

$('dashboardProductForm').addEventListener(
    'submit', saveDashboardProduct
);

$('productImage').addEventListener(
    'change', previewProductImage
);

$('removeProductImage').addEventListener(
    'click', removeProductImage
);

$('addHighlightBtn').addEventListener(
    'click', () => addProductHighlight()
);

$('addSkuBtn').addEventListener(
    'click', () => addProductSku()
);


// ========================================
// INQUIRY EVENT LISTENERS
// ========================================

$('refreshInquiriesBtn').addEventListener(
    'click', () => {

        if (productOperationInProgress) return;

        closeDashboardInquiry();

        loadDashboardInquiries();
    }
);

$('inquirySearch').addEventListener(
    'input', renderDashboardInquiries
);

$('inquiryStatusFilter').addEventListener(
    'change', renderDashboardInquiries
);

$('closeInquiryDetails').addEventListener(
    'click', () => {

        if (!productOperationInProgress) {

            closeDashboardInquiry();
        }
    }
);

$('inquiryUpdateForm').addEventListener(
    'submit', updateDashboardInquiry
);


// ========================================
// CATALOG EVENT LISTENERS
// ========================================

$('addCatalogBtn').addEventListener(
    'click', openCatalogForm
);

['closeCatalogForm', 'cancelCatalogForm']
    .forEach(id => {

        $(id).addEventListener('click', () => {

            if (!productOperationInProgress) {

                closeCatalogForm();
            }
        });
    });

$('catalogFile').addEventListener(
    'change', previewCatalogFile
);

$('removeCatalogFile').addEventListener(
    'click', () => {

        if (!productOperationInProgress) {

            removeCatalogFile();
        }
    }
);

$('dashboardCatalogForm').addEventListener(
    'submit', saveDashboardCatalog
);


// ========================================
// OFFER EVENT LISTENERS
// ========================================

$('addOfferBtn').addEventListener(
    'click', openOfferForm
);

['closeOfferForm', 'cancelOfferForm']
    .forEach(id => {

        $(id).addEventListener('click', () => {

            if (!productOperationInProgress) {

                closeOfferForm();
            }
        });
    });

$('offerImage').addEventListener(
    'change', previewDashboardOfferImage
);

$('removeOfferImage').addEventListener(
    'click', () => {

        if (!productOperationInProgress) {

            removeDashboardOfferImage();
        }
    }
);

$('dashboardOfferForm').addEventListener(
    'submit', saveDashboardOffer
);


// ========================================
// LOGIN MANAGEMENT EVENT LISTENERS
// ========================================

// --- Login Management Event Listeners ---

$('addLoginBtn').disabled = false;

$('newLoginPassword').minLength = 10;

$('confirmLoginPassword').minLength = 10;

$('addLoginBtn').addEventListener(
    'click',
    openDashboardLoginForm
);

$('dashboardCreateLoginForm').addEventListener(
    'submit',
    createDashboardLogin
);

$('closeLoginForm').addEventListener(
    'click',
    closeDashboardLoginForm
);

$('cancelLoginForm').addEventListener(
    'click',
    closeDashboardLoginForm
);

checkDashboardSession();
