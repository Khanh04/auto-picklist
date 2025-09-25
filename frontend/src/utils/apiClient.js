/**
 * Centralized API client that handles both old and new response formats
 * This eliminates the need to update response handling in multiple components
 */

class ApiClient {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
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
   * Generic fetch wrapper with error handling and response normalization
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      const data = await response.json();
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
}

// Create singleton instance
const apiClient = new ApiClient();

export default apiClient;