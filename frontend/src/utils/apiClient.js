/**
 * Centralized API client that handles both old and new response formats
 * This eliminates the need to update response handling in multiple components
 */

class ApiClient {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
    this.isRefreshing = false;
    this.failedQueue = [];
    this.onAuthFailure = null; // Callback for when authentication completely fails
  }

  /**
   * Set callback for authentication failure
   * @param {Function} callback - Function to call when auth fails
   */
  setAuthFailureCallback(callback) {
    this.onAuthFailure = callback;
  }

  /**
   * Normalize API response to extract data from both old and new formats
   * Old format: { success: true, suppliers: [...] }
   * New format: { success: true, data: { suppliers: [...] }, timestamp: "...", requestId: "..." }
   */
  normalizeResponse(response) {
    if (!response.success) {
      throw new Error(response.error?.message || 'API request failed');
    }

    // If response has a 'data' property, return it (new format)
    if (response.data) {
      return response.data;
    }

    // Otherwise, extract the data from the old format
    const { success, timestamp, requestId, meta, error, ...data } = response;
    return data;
  }

  /**
   * Add authentication headers to request
   */
  addAuthHeaders(headers = {}) {
    // JWT tokens are handled via httpOnly cookies, so no manual header needed
    // But we can add other auth-related headers if needed
    return {
      ...headers
    };
  }

  /**
   * Handle token refresh and retry failed requests
   */
  async handleTokenRefresh() {
    if (this.isRefreshing) {
      // If refresh is already in progress, queue this request
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject });
      });
    }

    this.isRefreshing = true;

    try {
      await this.refreshToken();

      // Process queued requests
      this.failedQueue.forEach(({ resolve }) => resolve());
      this.failedQueue = [];

      this.isRefreshing = false;
      return true;
    } catch (error) {
      // Process queued requests with error
      this.failedQueue.forEach(({ reject }) => reject(error));
      this.failedQueue = [];

      this.isRefreshing = false;
      throw error;
    }
  }

  /**
   * Generic fetch wrapper with error handling and response normalization
   */
  async request(endpoint, options = {}, retryOnAuth = true) {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        credentials: 'include', // Include cookies for JWT
        headers: {
          'Content-Type': 'application/json',
          ...this.addAuthHeaders(options.headers)
        },
        ...options
      });

      // Handle 401 Unauthorized - try to refresh token
      if (response.status === 401 && retryOnAuth && !endpoint.includes('/auth/')) {
        try {
          await this.handleTokenRefresh();
          // Retry the original request
          return this.request(endpoint, options, false);
        } catch (refreshError) {
          // Refresh failed, trigger auth failure callback
          if (this.onAuthFailure) {
            this.onAuthFailure();
          }
          const data = await response.json();
          throw new Error(data.error?.message || 'Authentication failed');
        }
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || `HTTP error! status: ${response.status}`);
      }

      return this.normalizeResponse(data);
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  /**
   * GET request
   */
  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post(endpoint, body = null, options = {}) {
    const requestOptions = { ...options, method: 'POST' };
    
    if (body && !(body instanceof FormData)) {
      requestOptions.body = JSON.stringify(body);
    } else if (body instanceof FormData) {
      // Remove Content-Type header for FormData - browser will set it with boundary
      const { 'Content-Type': _, ...headers } = requestOptions.headers || {};
      requestOptions.headers = headers;
      requestOptions.body = body;
    }

    return this.request(endpoint, requestOptions);
  }

  /**
   * PUT request
   */
  async put(endpoint, body = null, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : null
    });
  }

  /**
   * DELETE request
   */
  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  // Specific API methods for common endpoints
  
  /**
   * Get suppliers
   */
  async getSuppliers() {
    return this.get('/api/suppliers');
  }

  /**
   * Get items
   */
  async getItems() {
    return this.get('/api/items');
  }

  /**
   * Get preferences
   */
  async getPreferences() {
    return this.get('/api/preferences');
  }

  /**
   * Parse file and return order items for intelligent processing
   */
  async parseFileForItems(file) {
    const formData = new FormData();
    formData.append('file', file);

    return this.post('/api/picklist/parse', formData);
  }

  /**
   * Upload file for picklist generation
   */
  async uploadPicklist(file, useDatabase = true) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('useDatabase', useDatabase.toString());

    return this.post('/api/picklist/upload', formData);
  }

  /**
   * Upload file and generate intelligent picklist with user-first supplier selection
   */
  async uploadFileIntelligent(file) {
    // First, parse the file to get order items
    const parseResult = await this.parseFileForItems(file);
    const { orderItems } = parseResult;

    // Then generate intelligent picklist
    const picklistResult = await this.generateIntelligentPicklist(orderItems);

    // Return combined result with filename for compatibility
    return {
      ...picklistResult,
      filename: parseResult.filename,
      useDatabase: true,
      intelligent: true
    };
  }

  /**
   * Upload multiple CSV files
   */
  async uploadMultipleCSV(files, useDatabase = true) {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    formData.append('useDatabase', useDatabase.toString());
    
    return this.post('/api/multi-csv/upload', formData);
  }

  /**
   * Create shared shopping list
   */
  async createSharedList(picklist, title = 'Shopping List') {
    return this.post('/api/shopping-list/share', { picklist, title });
  }

  /**
   * Get shared shopping list
   */
  async getSharedList(shareId) {
    return this.get(`/api/shopping-list/share/${shareId}`);
  }

  /**
   * Update shared shopping list picklist
   */
  async updateSharedListPicklist(shareId, picklist) {
    return this.put(`/api/shopping-list/share/${shareId}/picklist`, { picklist });
  }

  /**
   * Get current user's pick lists
   */
  async getUserPickLists() {
    return this.get('/api/shopping-list/user');
  }


  /**
   * Enhanced intelligent picklist generation with user-first supplier selection
   */
  async generateIntelligentPicklist(orderItems) {
    return this.post('/api/supplier-preferences/intelligent-picklist', { orderItems });
  }

  /**
   * Update supplier selection and learn user preference
   */
  async updateSupplierSelection(originalItem, newSupplierId, matchedProductId = null) {
    return this.post('/api/supplier-preferences/update-selection', {
      originalItem,
      newSupplierId,
      matchedProductId
    });
  }

  /**
   * Store multiple supplier preferences from shopping list
   */
  async storeSupplierPreferences(preferences) {
    return this.post('/api/supplier-preferences/store-batch', { preferences });
  }

  /**
   * Get supplier preference for a specific item
   */
  async getSupplierPreference(originalItem, matchedProductId = null) {
    const params = matchedProductId ? `?matchedProductId=${matchedProductId}` : '';
    return this.get(`/api/supplier-preferences/${encodeURIComponent(originalItem)}${params}`);
  }

  /**
   * Get preferences summary for multiple items
   */
  async getPreferencesSummary(items) {
    return this.post('/api/supplier-preferences/summary/items', { items });
  }

  /**
   * Get all supplier preferences
   */
  async getAllSupplierPreferences() {
    return this.get('/api/supplier-preferences/all');
  }

  /**
   * Get supplier preference statistics
   */
  async getSupplierPreferenceStats() {
    return this.get('/api/supplier-preferences/stats');
  }

  // Authentication API methods

  /**
   * User registration
   */
  async register(userData) {
    return this.post('/api/auth/register', userData);
  }

  /**
   * User login
   */
  async login(email, password) {
    return this.post('/api/auth/login', { email, password });
  }

  /**
   * Refresh JWT tokens
   */
  async refreshToken() {
    return this.post('/api/auth/refresh');
  }

  /**
   * User logout
   */
  async logout() {
    return this.post('/api/auth/logout');
  }

  /**
   * Get current user profile
   */
  async getCurrentUser() {
    return this.get('/api/auth/me');
  }

  /**
   * Update user profile
   */
  async updateProfile(profileData) {
    return this.put('/api/auth/profile', profileData);
  }

  /**
   * Get user preferences
   */
  async getUserPreferences() {
    return this.get('/api/auth/preferences');
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(preferences) {
    return this.put('/api/auth/preferences', preferences);
  }

  // Draft Picklist Methods
  async saveDraftPicklist(draftData) {
    return this.post('/api/drafts', draftData);
  }

  async getUserDrafts(limit = 10, offset = 0) {
    return this.get(`/api/drafts?limit=${limit}&offset=${offset}`);
  }

  async getDraft(draftKey) {
    return this.get(`/api/drafts/${draftKey}`);
  }

  async updateDraft(draftKey, draftData) {
    return this.put(`/api/drafts/${draftKey}`, draftData);
  }

  async deleteDraft(draftKey) {
    return this.delete(`/api/drafts/${draftKey}`);
  }

  async promoteDraftToSharedList(draftKey, title) {
    return this.post(`/api/drafts/${draftKey}/promote`, { title });
  }
}

// Create singleton instance
const apiClient = new ApiClient();

export default apiClient;