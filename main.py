import asyncio
import json
import logging
import websockets

logging.basicConfig()

USERS = set()


async def counter(websocket, path):
    try:
        print("connect")
        USERS.add(websocket)
        websockets.broadcast(USERS, json.dumps({"type": "users", "count": len(USERS)}))
        async for message in websocket:
            print(message)
            websockets.broadcast(USERS, json.dumps({"type": "draw", "data": message}))
    finally:
        USERS.remove(websocket)


async def main():
    async with websockets.serve(counter, "localhost", 5000):
        await asyncio.Future()  # run forever


if __name__ == "__main__":
    asyncio.run(main())
