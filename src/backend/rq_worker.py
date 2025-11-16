import os
from redis import Redis
from redis.exceptions import ConnectionError as RedisConnectionError
from rq import Worker, Queue, Connection
from contextlib import contextmanager
try:
    # SimpleWorker avoids forking and works on Windows
    from rq import SimpleWorker
except Exception:
    SimpleWorker = None


listen = ['default']


def main():
    redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    # Print the resolved REDIS_URL so it's obvious which URL the worker will use
    print(f"Using REDIS_URL={redis_url}")
    try:
        conn = Redis.from_url(redis_url)
        # Try a quick ping to fail fast if Redis isn't reachable
        conn.ping()
    except RedisConnectionError as e:
        print(f"Error connecting to Redis at {redis_url}: {e}")
        print("Tips:")
        print(" - Set the REDIS_URL environment variable to a reachable Redis (e.g., Upstash).")
        print("   Example: export REDIS_URL='rediss://:<token>@eu1-upstash-xxxxx.upstash.io:6379/0'")
        print(" - Or run a local Redis for testing: `docker run -p 6379:6379 redis:7` and use redis://localhost:6379/0")
        raise
    with Connection(conn):
        # Use SimpleWorker on platforms without fork (Windows), otherwise use Worker
        supports_fork = hasattr(os, 'fork')
        if not supports_fork and SimpleWorker is not None:
            # On Windows the default RQ death-penalty uses SIGALRM which doesn't exist.
            # Create a small subclass that disables the signal-based death penalty by
            # providing a no-op context manager so jobs run normally on Windows.
            class WindowsSafeWorker(SimpleWorker):
                def death_penalty_class(self, timeout, exc_class, job_id=None):
                    @contextmanager
                    def _noop():
                        yield
                    return _noop()

            queues = [Queue(name, connection=conn) for name in listen]
            worker = WindowsSafeWorker(queues, connection=conn)
        else:
            worker = Worker(list(map(Queue, listen)))
        worker.work()


if __name__ == '__main__':
    main()
