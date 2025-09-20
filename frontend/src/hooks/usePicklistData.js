import { useState, useEffect } from 'react'
import Fuse from 'fuse.js'
import { devLog } from '../utils/logger'
import apiClient from '../utils/apiClient'

export function usePicklistData(currentPicklist, initialDataFetched, setInitialDataFetched) {
  const [availableSuppliers, setAvailableSuppliers] = useState([])
  const [availableItems, setAvailableItems] = useState([])
  const [selectOptions, setSelectOptions] = useState([])
  const [productSuppliers, setProductSuppliers] = useState({})
  const [fuseInstance, setFuseInstance] = useState(null)

  // Handle side effects separately - only run once when picklist is first available
  useEffect(() => {
    if (currentPicklist.length > 0 && !initialDataFetched) {
      // Extract unique suppliers for dropdown
      const suppliers = [...new Set(currentPicklist
        .filter(item => item.selectedSupplier !== 'back order')
        .map(item => item.selectedSupplier)
      )].sort()
      setAvailableSuppliers([...suppliers, 'back order'])

      // Fetch database data
      fetchDatabaseData()

      // Fetch supplier data for matched items (only unique IDs)
      const uniqueMatchedIds = [...new Set(currentPicklist
        .filter(item => item.matchedItemId)
        .map(item => item.matchedItemId)
      )]

      uniqueMatchedIds.forEach(matchedItemId => {
        fetchProductSuppliers(matchedItemId)
      })

      setInitialDataFetched(true)
    }
  }, [currentPicklist.length, initialDataFetched])

  const fetchDatabaseData = async () => {
    try {
      // Fetch suppliers
      const suppliersData = await apiClient.getSuppliers()
      const supplierNames = (suppliersData.suppliers || []).map(s => s.name)
      const allSuppliers = [...new Set([...availableSuppliers.filter(s => s !== 'back order'), ...supplierNames])].sort()
      setAvailableSuppliers([...allSuppliers, 'back order'])

      // Fetch available items for matching
      const itemsData = await apiClient.getItems()
      const items = itemsData.items || []
      devLog('PicklistPreview: Fetched items', items.length)
      setAvailableItems(items)

      // Prepare options for matched item selection (only product descriptions)
      const options = items.map(item => ({
        value: item.id,
        label: item.description, // Only show description, no supplier/price
        item: item // Store full item data for easy access
      }))
      devLog('PicklistPreview: Select options prepared', options.length)
      setSelectOptions(options)

      // Create Fuse instance for fuzzy matching (only product descriptions)
      const fuseOptions = {
        keys: [
          { name: 'item.description', weight: 1.0 } // Only search descriptions
        ],
        threshold: 0.6, // 0.0 = perfect match, 1.0 = match anything
        includeScore: true,
        minMatchCharLength: 2
      }
      const fuse = new Fuse(options, fuseOptions)
      setFuseInstance(fuse)
    } catch (error) {
      console.error('Error fetching database data:', error)
    }
  }

  const fetchProductSuppliers = async (productId) => {
    if (productSuppliers[productId]) {
      return productSuppliers[productId]
    }

    try {
      const data = await apiClient.get(`/api/items/${productId}/suppliers`)
      const suppliers = data.suppliers || []
      setProductSuppliers(prev => ({ ...prev, [productId]: suppliers }))
      return suppliers
    } catch (error) {
      console.error('Error fetching product suppliers:', error)
    }
    return []
  }

  return {
    availableSuppliers,
    availableItems,
    selectOptions,
    productSuppliers,
    fuseInstance,
    fetchProductSuppliers,
    setAvailableSuppliers,
    setProductSuppliers
  }
}