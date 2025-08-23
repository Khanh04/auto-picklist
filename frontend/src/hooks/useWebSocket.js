import { useEffect, useRef, useState, useCallback } from 'react'

const useWebSocket = (shareId) => {
  const ws = useRef(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState(null)
  const messageHandlers = useRef(new Map())

  const connect = useCallback(() => {
    if (!shareId) return

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}`
      
      console.log('Attempting WebSocket connection to:', wsUrl)
      ws.current = new WebSocket(wsUrl)

      ws.current.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        setConnectionError(null)
        
        // Join the shopping list room
        ws.current.send(JSON.stringify({
          type: 'join_shopping_list',
          shareId: shareId
        }))
      }

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          const handler = messageHandlers.current.get(message.type)
          if (handler) {
            handler(message.data)
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.current.onclose = () => {
        console.log('WebSocket disconnected')
        setIsConnected(false)
        
        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          if (shareId) {
            connect()
          }
        }, 3000)
      }

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        console.error('WebSocket readyState:', ws.current.readyState)
        setConnectionError('Connection failed')
        setIsConnected(false)
      }
    } catch (error) {
      console.error('Error creating WebSocket connection:', error)
      setConnectionError('Failed to connect')
    }
  }, [shareId])

  const disconnect = useCallback(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.close()
    }
  }, [])

  const sendMessage = useCallback((message) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message))
    }
  }, [])

  const subscribe = useCallback((messageType, handler) => {
    messageHandlers.current.set(messageType, handler)
    
    // Return unsubscribe function
    return () => {
      messageHandlers.current.delete(messageType)
    }
  }, [])

  const updateItem = useCallback((itemData) => {
    sendMessage({
      type: 'update_item',
      data: itemData
    })
  }, [sendMessage])

  const toggleCompleted = useCallback((itemData) => {
    sendMessage({
      type: 'toggle_completed',
      data: itemData
    })
  }, [sendMessage])

  const switchSupplier = useCallback((itemData) => {
    sendMessage({
      type: 'switch_supplier',
      data: itemData
    })
  }, [sendMessage])

  useEffect(() => {
    if (shareId) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [shareId, connect, disconnect])

  return {
    isConnected,
    connectionError,
    subscribe,
    updateItem,
    toggleCompleted,
    switchSupplier,
    disconnect
  }
}

export default useWebSocket