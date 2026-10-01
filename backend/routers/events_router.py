# -*- coding: utf-8 -*-
"""
NOVIARA - Realtime Event Bus & SSE Endpoint
Cho phép server chủ động push thông báo đến tất cả client đang kết nối
khi có thay đổi dữ liệu (công bố nhóm, tạo lớp, import sinh viên...).

Sử dụng Server-Sent Events (SSE) — đơn giản, native, tự reconnect.
"""
import asyncio
import json
import time
from typing import AsyncIterator
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/events", tags=["Realtime SSE"])

# --------------------------------------------------------------------------
# Global Event Bus
# Danh sách asyncio.Queue của từng client đang kết nối SSE
# --------------------------------------------------------------------------
_subscribers: list[asyncio.Queue] = []


def emit_event(event_type: str, data: dict) -> None:
    """
    Phát một event đến tất cả client đang kết nối SSE.
    Gọi hàm này từ bất kỳ router nào khi có thay đổi dữ liệu quan trọng.

    Args:
        event_type: Tên event (vd: 'session_published', 'classes_updated')
        data: Payload dict sẽ được serialize thành JSON
    """
    payload = json.dumps({
        "type": event_type,
        "data": data,
        "timestamp": int(time.time() * 1000)
    }, ensure_ascii=False)

    dead: list[asyncio.Queue] = []
    for q in _subscribers:
        try:
            q.put_nowait(payload)
        except asyncio.QueueFull:
            dead.append(q)

    # Dọn dẹp queue bị đầy (client đã disconnect nhưng chưa kịp xóa)
    for q in dead:
        if q in _subscribers:
            _subscribers.remove(q)


async def _event_stream(request: Request) -> AsyncIterator[str]:
    """
    Generator tạo SSE stream cho 1 client.
    Tự động dọn dẹp khi client disconnect.
    """
    queue: asyncio.Queue = asyncio.Queue(maxsize=50)
    _subscribers.append(queue)

    # Gửi event 'connected' ngay khi kết nối thành công
    connected_payload = json.dumps({
        "type": "connected",
        "data": {"clientCount": len(_subscribers)},
        "timestamp": int(time.time() * 1000)
    }, ensure_ascii=False)
    yield f"data: {connected_payload}\n\n"

    try:
        while True:
            # Kiểm tra client còn kết nối không (HTTP disconnect detection)
            if await request.is_disconnected():
                break

            try:
                # Chờ event với timeout 20 giây, sau đó gửi ping giữ kết nối
                message = await asyncio.wait_for(queue.get(), timeout=20.0)
                yield f"data: {message}\n\n"
            except asyncio.TimeoutError:
                # Gửi ping để tránh proxy/firewall đóng kết nối do idle
                ping = json.dumps({
                    "type": "ping",
                    "data": {},
                    "timestamp": int(time.time() * 1000)
                })
                yield f"data: {ping}\n\n"

    except asyncio.CancelledError:
        pass
    finally:
        # Xóa queue của client này khi disconnect
        if queue in _subscribers:
            _subscribers.remove(queue)


@router.get("")
async def sse_stream(request: Request):
    """
    Server-Sent Events endpoint.
    Frontend kết nối tại: GET /api/events
    Browser sẽ tự reconnect nếu mất kết nối.
    """
    return StreamingResponse(
        _event_stream(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # Tắt nginx buffering
            "Connection": "keep-alive",
        }
    )


@router.get("/status")
async def sse_status():
    """Kiểm tra số lượng client đang kết nối SSE realtime."""
    return {
        "online": True,
        "activeConnections": len(_subscribers),
        "transport": "Server-Sent Events (SSE)"
    }
