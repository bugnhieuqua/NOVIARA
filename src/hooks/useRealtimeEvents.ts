/**
 * useRealtimeEvents — Custom hook kết nối SSE từ backend NOVIARA.
 *
 * Tự động reconnect với exponential backoff khi mất kết nối.
 * Trả về connectionStatus và lastEvent để App.tsx xử lý cập nhật state.
 *
 * Sử dụng:
 *   const { isLive, lastEvent } = useRealtimeEvents({ onEvent });
 */
import { useState, useEffect, useRef, useCallback } from 'react';

export type SSEConnectionStatus = 'connecting' | 'live' | 'offline';

export interface SSEEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
}

interface UseRealtimeEventsOptions {
  /** Callback khi nhận được bất kỳ event nào từ server */
  onEvent?: (event: SSEEvent) => void;
  /** URL của SSE endpoint (mặc định: /api/events) */
  url?: string;
  /** Bật/tắt realtime (mặc định: true) */
  enabled?: boolean;
}

const SSE_URL = '/api/events';
const MIN_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 30_000;

export function useRealtimeEvents({
  onEvent,
  url = SSE_URL,
  enabled = true,
}: UseRealtimeEventsOptions = {}) {
  const [status, setStatus] = useState<SSEConnectionStatus>('connecting');
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);

  // Refs để tránh stale closure
  const esRef = useRef<EventSource | null>(null);
  const onEventRef = useRef(onEvent);
  const reconnectDelayRef = useRef(MIN_RECONNECT_MS);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  // Luôn dùng ref mới nhất của callback
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (unmountedRef.current || !enabled) return;

    // Đóng kết nối cũ nếu còn
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    setStatus('connecting');

    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => {
      if (unmountedRef.current) return;
      setStatus('live');
      // Reset backoff khi kết nối thành công
      reconnectDelayRef.current = MIN_RECONNECT_MS;
    };

    es.onmessage = (e: MessageEvent) => {
      if (unmountedRef.current) return;
      try {
        const parsed: SSEEvent = JSON.parse(e.data);
        // Bỏ qua ping (chỉ dùng để giữ kết nối)
        if (parsed.type === 'ping') return;
        // Cập nhật trạng thái live khi nhận event thực
        if (parsed.type === 'connected') {
          setStatus('live');
          return;
        }
        setLastEvent(parsed);
        onEventRef.current?.(parsed);
      } catch {
        // JSON parse error — bỏ qua
      }
    };

    es.onerror = () => {
      if (unmountedRef.current) return;
      es.close();
      esRef.current = null;
      setStatus('offline');

      // Exponential backoff reconnect
      const delay = reconnectDelayRef.current;
      reconnectDelayRef.current = Math.min(delay * 2, MAX_RECONNECT_MS);

      clearReconnectTimer();
      reconnectTimerRef.current = setTimeout(() => {
        if (!unmountedRef.current) connect();
      }, delay);
    };
  }, [url, enabled, clearReconnectTimer]);

  useEffect(() => {
    unmountedRef.current = false;

    if (enabled) {
      connect();
    } else {
      setStatus('offline');
    }

    return () => {
      unmountedRef.current = true;
      clearReconnectTimer();
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [enabled, connect, clearReconnectTimer]);

  return {
    /** true khi đang kết nối SSE thành công */
    isLive: status === 'live',
    /** Trạng thái kết nối: 'connecting' | 'live' | 'offline' */
    connectionStatus: status,
    /** Event cuối cùng nhận được (không bao gồm ping) */
    lastEvent,
  };
}
