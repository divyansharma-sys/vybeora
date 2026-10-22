import time
import json
import logging
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Room, RoomParticipant
from apps.chat.models import ChatMessage

logger = logging.getLogger(__name__)

# In-memory sequence counter & latest authoritative state tracker per room
_ROOM_STATE = {}


class RoomConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket Consumer handling authoritative real-time synchronized playback
    accessible by EVERY participant in the room, chat messages, and emoji reaction bursts.
    """

    async def connect(self):
        self.room_code = self.scope["url_route"]["kwargs"]["room_code"]
        self.room_group_name = f"room_{self.room_code}"

        # 1. Validate that the room exists and is active on backend
        room_valid = await self.is_room_valid(self.room_code)
        if not room_valid:
            await self.close(code=4004)
            return

        # 2. Join room broadcast channel group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name,
        )

        await self.accept()

        # Send authoritative playback state with server timestamp & sequence to connecting participant
        playback_state = await self.get_authoritative_state(self.room_code)
        if playback_state:
            await self.send_json({
                "type": "playback.sync",
                "payload": playback_state,
            })

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name,
        )

    async def receive_json(self, content):
        """
        Handle incoming WebSocket events from ANY connected participant.
        """
        event_type = content.get("type")
        payload = content.get("payload", {})

        if event_type in ["playback.play", "playback.pause", "playback.seek"]:
            user_requested_time = float(payload.get("current_time", 0.0))
            is_playing = payload.get("is_playing", True) if event_type != "playback.pause" else False
            initiated_by = payload.get("user", "Participant")

            # Update authoritative state on backend with monotonic sequence number & server time
            authoritative_state = await self.process_playback_action(
                self.room_code,
                event_type,
                user_requested_time,
                is_playing,
                initiated_by,
            )

            # Broadcast authoritative playback change to ALL participants in room group (including sender)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "room_playback_event",
                    "event_type": event_type,
                    "payload": authoritative_state,
                    "sender_channel": self.channel_name,
                },
            )

        elif event_type == "chat.message":
            user = payload.get("user", "Viewer")
            text = payload.get("text", "")
            is_host = payload.get("is_host", False)
            timestamp_tag = payload.get("timestamp_tag", "")
            is_spoiler = payload.get("is_spoiler", False)

            # Persist message in database
            saved_msg = await self.save_chat_message(self.room_code, user, text, is_host, timestamp_tag, is_spoiler)

            # Broadcast chat message to group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "room_chat_event",
                    "payload": {
                        "id": str(saved_msg.id) if saved_msg else None,
                        "user": user,
                        "text": text,
                        "is_host": is_host,
                        "is_spoiler": is_spoiler,
                        "time": timestamp_tag,
                    },
                },
            )

        elif event_type == "reaction.emoji":
            # Broadcast floating reaction to all viewers
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "room_reaction_event",
                    "payload": payload,
                },
            )

        elif event_type in ["ready.toggle", "ready.countdown", "webrtc.signal"]:
            # Broadcast ready-check state changes or peer-to-peer WebRTC signals to all room members
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "room_generic_event",
                    "event_type": event_type,
                    "payload": payload,
                    "sender_channel": self.channel_name,
                },
            )

    # Handlers for messages broadcast from group_send
    async def room_playback_event(self, event):
        # Forward authoritative playback state to client
        await self.send_json({
            "type": event["event_type"],
            "payload": event["payload"],
        })

    async def room_chat_event(self, event):
        await self.send_json({
            "type": "chat.message",
            "payload": event["payload"],
        })

    async def room_reaction_event(self, event):
        await self.send_json({
            "type": "reaction.emoji",
            "payload": event["payload"],
        })

    async def room_generic_event(self, event):
        # Don't echo WebRTC signals back to the sender
        sender_channel = event.get("sender_channel")
        if sender_channel and sender_channel == self.channel_name:
            return

        # Forward ready check or webrtc signals to other room clients
        await self.send_json({
            "type": event["event_type"],
            "payload": event["payload"],
        })

    async def room_video_change_event(self, event):
        # Reset cached room state upon video change
        code = self.room_code
        if code in _ROOM_STATE:
            _ROOM_STATE[code]["current_time"] = 0.0
            _ROOM_STATE[code]["is_playing"] = True
            _ROOM_STATE[code]["sequence"] = _ROOM_STATE[code].get("sequence", 0) + 1
            _ROOM_STATE[code]["server_time"] = time.time()
        await self.send_json({
            "type": "video.change",
            "payload": event["payload"],
        })

    async def room_closed_event(self, event):
        code = self.room_code
        if code in _ROOM_STATE:
            del _ROOM_STATE[code]
        await self.send_json({
            "type": "room.closed",
            "payload": event["payload"],
        })

    async def room_watchlist_event(self, event):
        await self.send_json({
            "type": "watchlist.updated",
            "payload": event["payload"],
        })

    async def process_playback_action(self, code, action_type, current_time, is_playing, user):
        """
        Coordinates authoritative room sequence numbers, calculates accurate elapsed time,
        and saves state in database.
        """
        now = time.time()
        state = _ROOM_STATE.get(code)
        if not state:
            state = {
                "sequence": 0,
                "current_time": current_time,
                "is_playing": is_playing,
                "server_time": now,
            }
        
        state["sequence"] += 1
        state["current_time"] = max(0.0, current_time)
        state["is_playing"] = is_playing
        state["server_time"] = now
        state["last_action"] = action_type
        state["initiated_by"] = user
        _ROOM_STATE[code] = state

        # Persist to database asynchronously
        await self.update_room_playback(code, state["current_time"], state["is_playing"])

        return {
            "room_code": code,
            "current_time": state["current_time"],
            "is_playing": state["is_playing"],
            "server_time": state["server_time"],
            "sequence": state["sequence"],
            "action": action_type,
            "user": user,
        }

    async def get_authoritative_state(self, code):
        """
        Returns latest authoritative state. If the room is playing, adds elapsed seconds.
        """
        now = time.time()
        state = _ROOM_STATE.get(code)
        if state:
            calculated_time = state["current_time"]
            if state["is_playing"]:
                elapsed = now - state["server_time"]
                calculated_time += elapsed
            return {
                "room_code": code,
                "current_time": calculated_time,
                "is_playing": state["is_playing"],
                "server_time": now,
                "sequence": state["sequence"],
            }

        # Otherwise read from database
        db_state = await self.get_room_playback_state(code)
        if db_state:
            _ROOM_STATE[code] = {
                "sequence": 1,
                "current_time": db_state["current_time"],
                "is_playing": db_state["is_playing"],
                "server_time": now,
            }
            db_state["server_time"] = now
            db_state["sequence"] = 1
            return db_state
        return None

    @database_sync_to_async
    def get_room_playback_state(self, code):
        try:
            room = Room.objects.get(code=code)
            return {
                "room_code": room.code,
                "current_time": room.current_time_seconds,
                "is_playing": room.is_playing,
                "playback_rate": room.playback_rate,
                "movie_title": room.movie_title,
                "host_name": room.host_name,
            }
        except Room.DoesNotExist:
            return None

    @database_sync_to_async
    def update_room_playback(self, code, current_time, is_playing):
        try:
            room = Room.objects.get(code=code)
            room.current_time_seconds = float(current_time)
            room.is_playing = bool(is_playing)
            room.save(update_fields=["current_time_seconds", "is_playing", "last_updated_at"])
        except Room.DoesNotExist:
            pass

    @database_sync_to_async
    def save_chat_message(self, code, user, text, is_host, timestamp_tag, is_spoiler=False):
        try:
            room = Room.objects.get(code=code)
            return ChatMessage.objects.create(
                room=room,
                user=user,
                is_host=is_host,
                text=text,
                timestamp_tag=timestamp_tag,
                is_spoiler=is_spoiler,
            )
        except Room.DoesNotExist:
            return None

    @database_sync_to_async
    def is_room_valid(self, code):
        try:
            return Room.objects.filter(code=code, status__in=["active", "lobby"]).exists()
        except Exception:
            return False
