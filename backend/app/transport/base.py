"""Tactical transport abstraction for JSON, WebSocket, Tactical Binary, and LoRa/MANET."""

import json
import struct
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from enum import Enum
from typing import Any
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.domain import Priority, RecommendedAction


class TransportProtocol(str, Enum):
    """Transport protocol channels."""
    JSON = "JSON"
    WEBSOCKET = "WEBSOCKET"
    TACTICAL_BINARY = "TACTICAL_BINARY"
    LORA_MANET = "LORA_MANET"


class TacticalDirective(BaseModel):
    """Compact tactical search directive dispatched to field rescuers or UAVs."""
    model_config = ConfigDict(extra="forbid")

    directive_id: str
    incident_id: str
    target_zone_id: str
    latitude: float = Field(ge=-90.0, le=90.0)
    longitude: float = Field(ge=-180.0, le=180.0)
    priority: Priority
    recommended_action: RecommendedAction
    victim_probability: float = Field(ge=0.0, le=1.0)
    estimated_depth_m: float = Field(ge=0.0, default=1.0)
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    sequence_number: int = Field(ge=0, default=1)


class TransportEncoder(ABC):
    """Abstract base class for encoding tactical directives across transport media."""

    @abstractmethod
    def encode(self, directive: TacticalDirective) -> bytes | str:
        """Encodes a tactical directive into transport wire format."""
        raise NotImplementedError

    @abstractmethod
    def decode(self, payload: bytes | str) -> TacticalDirective:
        """Decodes raw wire data back into a TacticalDirective."""
        raise NotImplementedError


class JsonTransportEncoder(TransportEncoder):
    """Encodes directives as standard JSON strings (for WebSocket and REST APIs)."""

    def encode(self, directive: TacticalDirective) -> str:
        return directive.model_dump_json()

    def decode(self, payload: bytes | str) -> TacticalDirective:
        if isinstance(payload, bytes):
            payload = payload.decode("utf-8")
        data = json.loads(payload)
        return TacticalDirective.model_validate(data)


class TacticalBinaryTransportEncoder(TransportEncoder):
    """Encodes directives into compact binary frames suitable for LoRa / MANET bandwidth constraints.

    Frame format (28 bytes):
    - Magic (2 bytes): 0xAB, 0x51
    - Sequence (2 bytes, unsigned short)
    - Latitude (4 bytes, float)
    - Longitude (4 bytes, float)
    - Victim Prob (2 bytes, unsigned short, scaled x10000)
    - Depth (2 bytes, unsigned short, scaled x100 mm)
    - Priority (1 byte, enum ordinal)
    - Action (1 byte, enum ordinal)
    - CRC-16 (2 bytes, CCITT)
    - Zone ID (8 bytes ASCII padded)
    """

    MAGIC = b"\xab\x51"

    PRIORITY_MAP = {Priority.P1: 1, Priority.P2: 2, Priority.P3: 3}
    REV_PRIORITY_MAP = {1: Priority.P1, 2: Priority.P2, 3: Priority.P3}

    ACTION_MAP = {
        RecommendedAction.PINPOINT_AND_PROBE: 1,
        RecommendedAction.SECONDARY_SENSOR_SCAN: 2,
        RecommendedAction.REMOTE_SENSING: 3,
        RecommendedAction.DEFER: 4,
        RecommendedAction.INSUFFICIENT_EVIDENCE: 5,
    }
    REV_ACTION_MAP = {v: k for k, v in ACTION_MAP.items()}

    def encode(self, directive: TacticalDirective) -> bytes:
        seq = directive.sequence_number & 0xFFFF
        lat = float(directive.latitude)
        lon = float(directive.longitude)
        prob_scaled = int(round(directive.victim_probability * 10000))
        depth_scaled = int(round(directive.estimated_depth_m * 100))
        prio_val = self.PRIORITY_MAP.get(directive.priority, 3)
        act_val = self.ACTION_MAP.get(directive.recommended_action, 4)
        zone_bytes = directive.target_zone_id.encode("ascii")[:8].ljust(8, b"\x00")

        # Pack header and data without CRC
        data_to_crc = struct.pack(
            ">2sHffHHBB8s",
            self.MAGIC,
            seq,
            lat,
            lon,
            prob_scaled,
            depth_scaled,
            prio_val,
            act_val,
            zone_bytes,
        )

        crc = self._compute_crc16(data_to_crc)
        return data_to_crc + struct.pack(">H", crc)

    def decode(self, payload: bytes | str) -> TacticalDirective:
        if isinstance(payload, str):
            payload = payload.encode("latin1")

        if len(payload) < 26:
            raise ValueError(f"Payload too short for tactical binary frame: {len(payload)} bytes")

        data_body = payload[:-2]
        expected_crc = struct.unpack(">H", payload[-2:])[0]
        actual_crc = self._compute_crc16(data_body)

        if actual_crc != expected_crc:
            raise ValueError(f"CRC-16 mismatch: expected {expected_crc:#06x}, got {actual_crc:#06x}")

        magic, seq, lat, lon, prob_scaled, depth_scaled, prio_val, act_val, zone_bytes = struct.unpack(
            ">2sHffHHBB8s",
            data_body,
        )

        if magic != self.MAGIC:
            raise ValueError(f"Invalid frame magic: {magic!r}")

        zone_id = zone_bytes.rstrip(b"\x00").decode("ascii", errors="replace")
        priority = self.REV_PRIORITY_MAP.get(prio_val, Priority.P3)
        action = self.REV_ACTION_MAP.get(act_val, RecommendedAction.DEFER)

        return TacticalDirective(
            directive_id=f"dir-{seq}",
            incident_id="incident-tac",
            target_zone_id=zone_id,
            latitude=round(lat, 6),
            longitude=round(lon, 6),
            priority=priority,
            recommended_action=action,
            victim_probability=round(prob_scaled / 10000.0, 4),
            estimated_depth_m=round(depth_scaled / 100.0, 2),
            sequence_number=seq,
        )

    @staticmethod
    def _compute_crc16(data: bytes) -> int:
        """Computes standard CRC-16-CCITT (polynomial 0x1021, init 0xFFFF)."""
        crc = 0xFFFF
        for byte in data:
            crc ^= byte << 8
            for _ in range(8):
                if crc & 0x8000:
                    crc = ((crc << 1) ^ 0x1021) & 0xFFFF
                else:
                    crc = (crc << 1) & 0xFFFF
        return crc
