"""Event bus abstraction targeting NATS JetStream."""

import json
from abc import ABC, abstractmethod
from typing import Any, Callable, Coroutine
import nats
from nats.aio.client import Client as NATSClient
from nats.js.client import JetStreamContext

from app.core.config import get_settings
from app.core.logging import get_logger
from app.schemas.events import EventEnvelope, EventType

logger = get_logger("event_bus")

EventHandler = Callable[[EventEnvelope], Coroutine[Any, Any, None]]


class EventBus(ABC):
    """Abstract interface for event publication and subscription."""

    @abstractmethod
    async def connect(self) -> bool:
        """Establishes connection to the event broker."""
        raise NotImplementedError

    @abstractmethod
    async def disconnect(self) -> None:
        """Closes connection to the event broker."""
        raise NotImplementedError

    @abstractmethod
    async def publish(self, event: EventEnvelope) -> bool:
        """Publishes an event envelope to the appropriate stream/subject."""
        raise NotImplementedError

    @abstractmethod
    async def subscribe(self, event_type: EventType, handler: EventHandler) -> None:
        """Subscribes an async handler to events of a specific type."""
        raise NotImplementedError

    @abstractmethod
    async def check_health(self) -> bool:
        """Checks connectivity to the event broker."""
        raise NotImplementedError


class NatsEventBus(EventBus):
    """NATS JetStream event bus implementation."""

    def __init__(self, nats_url: str | None = None) -> None:
        self.nats_url = nats_url or get_settings().NATS_URL
        self._nc: NATSClient | None = None
        self._js: JetStreamContext | None = None
        self._is_connected: bool = False
        self._handlers: dict[EventType, list[EventHandler]] = {}

    @property
    def is_configured(self) -> bool:
        """Returns True if NATS_URL is configured."""
        return bool(self.nats_url)

    async def connect(self) -> bool:
        """Connects to NATS JetStream broker if configured."""
        if not self.is_configured:
            logger.info("NATS URL not configured; running without active event bus")
            self._is_connected = False
            return False

        try:
            self._nc = await nats.connect(self.nats_url)
            self._js = self._nc.jetstream()
            self._is_connected = True
            logger.info("Connected to NATS broker at %s", self.nats_url)
            return True
        except Exception as exc:
            logger.warning("Failed to connect to NATS broker at %s: %s", self.nats_url, exc)
            self._is_connected = False
            return False

    async def disconnect(self) -> None:
        """Closes NATS connection."""
        if self._nc and self._nc.is_connected:
            await self._nc.drain()
            await self._nc.close()
        self._is_connected = False
        self._nc = None
        self._js = None
        logger.info("Disconnected from NATS broker")

    async def publish(self, event: EventEnvelope) -> bool:
        """Publishes an event to NATS subject `events.<event_type>`."""
        subject = f"beacon_insight.events.{event.event_type.value}"
        payload_bytes = json.dumps(event.model_dump()).encode("utf-8")

        if self._js and self._is_connected:
            try:
                await self._js.publish(subject, payload_bytes)
                logger.debug("Published event %s to subject %s", event.event_id, subject)
                return True
            except Exception as exc:
                logger.error("Failed to publish event %s: %s", event.event_id, exc)
                return False
        else:
            logger.debug("Event bus offline; event %s (%s) not published to broker", event.event_id, event.event_type.value)
            return False

    async def subscribe(self, event_type: EventType, handler: EventHandler) -> None:
        """Registers a local or JetStream subscription handler."""
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)

        if self._js and self._is_connected:
            subject = f"beacon_insight.events.{event_type.value}"
            try:
                sub = await self._js.subscribe(subject)
                logger.info("Subscribed to NATS subject %s", subject)
            except Exception as exc:
                logger.error("Failed to subscribe to NATS subject %s: %s", subject, exc)

    async def check_health(self) -> bool:
        """Truthfully checks whether NATS connection is active and healthy."""
        if not self.is_configured:
            return False
        if self._nc is None or not self._nc.is_connected:
            return False
        try:
            return self._nc.is_connected
        except Exception:
            return False


_global_event_bus: NatsEventBus | None = None


def get_event_bus() -> NatsEventBus:
    """Returns the global singleton NatsEventBus."""
    global _global_event_bus
    if _global_event_bus is None:
        _global_event_bus = NatsEventBus()
    return _global_event_bus
