// Member Directory JavaScript
// Version 2 - Enhanced with accessibility and functionality

// Brand Switcher
document.addEventListener('DOMContentLoaded', function() {
    const brandSelect = document.getElementById('brand-select');
    const brandStylesLink = document.getElementById('brand-styles');

    // Load saved preference
    const savedBrand = localStorage.getItem('brandTheme') || 'eco';
    brandSelect.value = savedBrand;
    updateBrandTheme(savedBrand);

    brandSelect.addEventListener('change', function() {
        const selectedBrand = this.value;
        updateBrandTheme(selectedBrand);
        localStorage.setItem('brandTheme', selectedBrand);
    });

    function updateBrandTheme(brand) {
        if (brand === 'eco') {
            brandStylesLink.href = 'styles-eco.css';
        } else if (brand === 'oac') {
            brandStylesLink.href = 'styles-oac.css';
        }
    }

    // Initialize search functionality
    initializeSearch();

    // Add keyboard navigation for result rows
    initializeKeyboardNavigation();
});

// Toggle Specializations
function toggleSpecializations(id, button) {
    const element = document.getElementById(id);
    const isExpanded = element.classList.contains('active');

    if (isExpanded) {
        element.classList.remove('active');
        button.textContent = 'SHOW ALL';
        button.setAttribute('aria-expanded', 'false');
    } else {
        element.classList.add('active');
        button.textContent = 'HIDE ALL';
        button.setAttribute('aria-expanded', 'true');
    }
}

// Toggle Details
function toggleDetails(detailsId) {
    const details = document.getElementById(detailsId);
    const allDetails = document.querySelectorAll('.result-details');
    const resultRow = details.previousElementSibling;
    const isActive = details.classList.contains('active');

    // Close all other details first
    allDetails.forEach(detail => {
        if (detail.id !== detailsId) {
            detail.classList.remove('active');
            const otherRow = detail.previousElementSibling;
            if (otherRow) {
                otherRow.setAttribute('aria-expanded', 'false');
            }
        }
    });

    // Toggle the clicked one
    if (isActive) {
        details.classList.remove('active');
        resultRow.setAttribute('aria-expanded', 'false');
    } else {
        details.classList.add('active');
        resultRow.setAttribute('aria-expanded', 'true');

        // Smooth scroll to details
        setTimeout(() => {
            details.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    }
}

// Clear All Filters
function clearAllFilters() {
    // Clear search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = '';
    }

    // Uncheck all checkboxes
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });

    // Trigger search update
    updateResults();

    // Announce to screen readers
    announceToScreenReader('All filters cleared');
}

// Search Functionality
function initializeSearch() {
    const searchInput = document.getElementById('search-input');
    let debounceTimer;

    // Debounced search
    searchInput.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            updateResults();
        }, 300);
    });

    // Add event listeners to all filter checkboxes
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateResults);
    });
}

// Update Results (placeholder function)
function updateResults() {
    // This would connect to a backend API in production
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const selectedDesignations = getSelectedValues('designation');
    const selectedStatuses = getSelectedValues('status');
    const selectedProvinces = getSelectedValues('province');
    const selectedSpecializations = getSelectedSpecializations();

    // For now, just update the count display
    const resultsCount = document.getElementById('results-count');

    // Mock filtering logic
    let mockCount = 4500;
    if (searchTerm) mockCount = Math.floor(mockCount * 0.7);
    if (selectedDesignations.length > 0) mockCount = Math.floor(mockCount * 0.5);
    if (selectedStatuses.length > 0) mockCount = Math.floor(mockCount * 0.6);
    if (selectedProvinces.length > 0) mockCount = Math.floor(mockCount * 0.4);
    if (selectedSpecializations.length > 0) mockCount = Math.floor(mockCount * 0.3);

    resultsCount.textContent = `Results: ${mockCount}`;

    // Announce to screen readers
    announceToScreenReader(`${mockCount} results found`);
}

// Get selected checkbox values by name
function getSelectedValues(name) {
    const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);
    return Array.from(checkboxes).map(cb => cb.value);
}

// Get selected specializations
function getSelectedSpecializations() {
    const epSpecs = document.querySelectorAll('#ep-spec input[type="checkbox"]:checked');
    const sbepSpecs = document.querySelectorAll('#sbep-spec input[type="checkbox"]:checked');
    return [
        ...Array.from(epSpecs).map(cb => cb.value),
        ...Array.from(sbepSpecs).map(cb => cb.value)
    ];
}

// Keyboard Navigation
function initializeKeyboardNavigation() {
    const resultRows = document.querySelectorAll('.result-row');

    resultRows.forEach(row => {
        row.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const detailsId = this.getAttribute('aria-controls');
                if (detailsId) {
                    toggleDetails(detailsId);
                }
            }
        });
    });

    // Logo container keyboard support
    const logoContainers = document.querySelectorAll('.logo-container');
    logoContainers.forEach(container => {
        container.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    });
}

// Screen Reader Announcements
function announceToScreenReader(message) {
    // Create or get announcement element
    let announcer = document.getElementById('sr-announcer');

    if (!announcer) {
        announcer = document.createElement('div');
        announcer.id = 'sr-announcer';
        announcer.className = 'sr-only';
        announcer.setAttribute('role', 'status');
        announcer.setAttribute('aria-live', 'polite');
        announcer.setAttribute('aria-atomic', 'true');
        document.body.appendChild(announcer);
    }

    // Clear and announce
    announcer.textContent = '';
    setTimeout(() => {
        announcer.textContent = message;
    }, 100);
}

// Export to PDF (placeholder)
document.addEventListener('DOMContentLoaded', function() {
    const exportBtn = document.querySelector('.export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            // This would trigger PDF generation in production
            alert('Export to PDF functionality would be implemented here.');
        });
    }

    // Pagination buttons (placeholder)
    const pageButtons = document.querySelectorAll('.page-btn');
    pageButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            if (!this.classList.contains('active')) {
                // Remove active class from all buttons
                pageButtons.forEach(b => b.classList.remove('active'));

                // Add active class to clicked button
                this.classList.add('active');

                // Scroll to top of results
                document.querySelector('.results-panel').scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });

                // Announce page change
                const pageNum = this.textContent;
                announceToScreenReader(`Navigated to page ${pageNum}`);
            }
        });
    });
});

// Loading State Helper
function showLoading() {
    const resultsContainer = document.getElementById('results-container');
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading-indicator';
    loadingDiv.className = 'loading-indicator';
    loadingDiv.innerHTML = '<p>Loading results...</p>';
    loadingDiv.setAttribute('role', 'status');
    loadingDiv.setAttribute('aria-live', 'polite');

    if (resultsContainer) {
        resultsContainer.style.opacity = '0.5';
        resultsContainer.parentElement.insertBefore(loadingDiv, resultsContainer);
    }
}

function hideLoading() {
    const resultsContainer = document.getElementById('results-container');
    const loadingDiv = document.getElementById('loading-indicator');

    if (resultsContainer) {
        resultsContainer.style.opacity = '1';
    }

    if (loadingDiv) {
        loadingDiv.remove();
    }
}

// Handle window resize for responsive behavior
let resizeTimer;
window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
        // Adjust layout if needed
        const searchPanel = document.querySelector('.search-panel');
        const mainContainer = document.querySelector('.main-container');

        if (window.innerWidth <= 1024) {
            // Mobile/tablet adjustments
            console.log('Mobile/tablet layout active');
        } else {
            // Desktop adjustments
            console.log('Desktop layout active');
        }
    }, 250);
});

// Service Worker registration (for future PWA capabilities)
if ('serviceWorker' in navigator) {
    // Uncomment when service worker is implemented
    // navigator.serviceWorker.register('/sw.js')
    //     .then(reg => console.log('Service Worker registered'))
    //     .catch(err => console.log('Service Worker registration failed'));
}
