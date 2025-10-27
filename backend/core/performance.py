"""
Performans Optimizasyon Sistemi
Tüm performans iyileştirmeleri tek yerden yönetilir
"""

import time
import asyncio
import functools
import threading
from typing import Any, Callable, Dict, List, Optional, Union
from dataclasses import dataclass
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
from core.logging import get_logger, log_performance_metric
from core.config import settings

logger = get_logger('performance')

@dataclass
class PerformanceMetric:
    """Performans metriği"""
    name: str
    duration: float
    timestamp: datetime
    metadata: Dict[str, Any]
    success: bool
    error: Optional[str] = None

class PerformanceMonitor:
    """Performans izleyici"""
    
    def __init__(self):
        self.metrics: List[PerformanceMetric] = []
        self.max_metrics = 10000
        self.slow_threshold = 2.0  # seconds
        self.very_slow_threshold = 5.0  # seconds
        
    def record_metric(self, name: str, duration: float, metadata: Dict[str, Any] = None, success: bool = True, error: str = None):
        """Performans metriği kaydet"""
        metric = PerformanceMetric(
            name=name,
            duration=duration,
            timestamp=datetime.now(),
            metadata=metadata or {},
            success=success,
            error=error
        )
        
        self.metrics.append(metric)
        
        # Maintain max metrics
        if len(self.metrics) > self.max_metrics:
            self.metrics.pop(0)
        
        # Log slow operations
        if duration > self.very_slow_threshold:
            logger.warning(f"Very slow operation: {name} took {duration:.2f}s", extra=metadata)
        elif duration > self.slow_threshold:
            logger.info(f"Slow operation: {name} took {duration:.2f}s", extra=metadata)
        
        # Log performance metric
        log_performance_metric(name, duration, metadata=metadata)
    
    def get_metrics(self, name: Optional[str] = None, limit: int = 100) -> List[PerformanceMetric]:
        """Performans metriklerini al"""
        metrics = self.metrics
        
        if name:
            metrics = [m for m in metrics if m.name == name]
        
        return metrics[-limit:]
    
    def get_stats(self, name: Optional[str] = None) -> Dict[str, Any]:
        """Performans istatistiklerini al"""
        metrics = self.get_metrics(name)
        
        if not metrics:
            return {}
        
        durations = [m.duration for m in metrics]
        success_count = sum(1 for m in metrics if m.success)
        error_count = len(metrics) - success_count
        
        return {
            'count': len(metrics),
            'success_count': success_count,
            'error_count': error_count,
            'success_rate': success_count / len(metrics) if metrics else 0,
            'avg_duration': sum(durations) / len(durations),
            'min_duration': min(durations),
            'max_duration': max(durations),
            'total_duration': sum(durations),
            'slow_count': sum(1 for d in durations if d > self.slow_threshold),
            'very_slow_count': sum(1 for d in durations if d > self.very_slow_threshold),
        }
    
    def clear_metrics(self):
        """Metrikleri temizle"""
        self.metrics.clear()

# Global performance monitor
performance_monitor = PerformanceMonitor()

def measure_performance(name: Optional[str] = None, metadata: Dict[str, Any] = None):
    """Performans ölçüm dekoratörü"""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            success = True
            error = None
            
            try:
                result = func(*args, **kwargs)
                return result
            except Exception as e:
                success = False
                error = str(e)
                raise
            finally:
                duration = time.time() - start_time
                metric_name = name or f"{func.__module__}.{func.__name__}"
                performance_monitor.record_metric(
                    metric_name, duration, metadata, success, error
                )
        
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            success = True
            error = None
            
            try:
                result = await func(*args, **kwargs)
                return result
            except Exception as e:
                success = False
                error = str(e)
                raise
            finally:
                duration = time.time() - start_time
                metric_name = name or f"{func.__module__}.{func.__name__}"
                performance_monitor.record_metric(
                    metric_name, duration, metadata, success, error
                )
        
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator

class ConnectionPool:
    """Bağlantı havuzu yöneticisi"""
    
    def __init__(self, max_connections: int = 20):
        self.max_connections = max_connections
        self.connections: List[Any] = []
        self.lock = threading.Lock()
        
    def get_connection(self) -> Any:
        """Bağlantı al"""
        with self.lock:
            if self.connections:
                return self.connections.pop()
            return None
    
    def return_connection(self, connection: Any):
        """Bağlantıyı geri ver"""
        with self.lock:
            if len(self.connections) < self.max_connections:
                self.connections.append(connection)
    
    def close_all(self):
        """Tüm bağlantıları kapat"""
        with self.lock:
            for connection in self.connections:
                try:
                    connection.close()
                except:
                    pass
            self.connections.clear()

class AsyncTaskPool:
    """Asenkron görev havuzu"""
    
    def __init__(self, max_workers: int = 10):
        self.max_workers = max_workers
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.semaphore = asyncio.Semaphore(max_workers)
        
    async def submit(self, func: Callable, *args, **kwargs) -> Any:
        """Görev gönder"""
        async with self.semaphore:
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(self.executor, func, *args, **kwargs)
    
    async def submit_batch(self, tasks: List[tuple]) -> List[Any]:
        """Toplu görev gönder"""
        results = []
        for task in tasks:
            if len(task) == 2:
                func, args = task
                kwargs = {}
            else:
                func, args, kwargs = task
            
            result = await self.submit(func, *args, **kwargs)
            results.append(result)
        
        return results
    
    def shutdown(self):
        """Havuzu kapat"""
        self.executor.shutdown(wait=True)

class CacheOptimizer:
    """Cache optimizasyonu"""
    
    def __init__(self):
        self.cache_stats = {
            'hits': 0,
            'misses': 0,
            'evictions': 0,
            'size': 0,
        }
    
    def optimize_cache_key(self, key: str, prefix: str = "") -> str:
        """Cache anahtarını optimize et"""
        # Remove special characters and normalize
        normalized = key.lower().replace(' ', '_').replace('-', '_')
        normalized = ''.join(c for c in normalized if c.isalnum() or c == '_')
        
        if prefix:
            return f"{prefix}:{normalized}"
        return normalized
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Cache istatistiklerini al"""
        total_requests = self.cache_stats['hits'] + self.cache_stats['misses']
        hit_rate = self.cache_stats['hits'] / total_requests if total_requests > 0 else 0
        
        return {
            **self.cache_stats,
            'hit_rate': hit_rate,
            'miss_rate': 1 - hit_rate,
        }

class QueryOptimizer:
    """Sorgu optimizasyonu"""
    
    def __init__(self):
        self.query_stats = {}
        self.slow_queries = []
    
    def optimize_query(self, query: str) -> str:
        """Sorguyu optimize et"""
        # Remove extra whitespace
        query = ' '.join(query.split())
        
        # Add hints for common patterns
        if 'SELECT' in query.upper() and 'LIMIT' not in query.upper():
            # Add default limit for SELECT queries
            query += ' LIMIT 1000'
        
        return query
    
    def record_slow_query(self, query: str, duration: float, params: Dict[str, Any] = None):
        """Yavaş sorguyu kaydet"""
        self.slow_queries.append({
            'query': query,
            'duration': duration,
            'params': params or {},
            'timestamp': datetime.now(),
        })
        
        # Keep only last 100 slow queries
        if len(self.slow_queries) > 100:
            self.slow_queries.pop(0)
        
        logger.warning(f"Slow query detected: {duration:.2f}s", extra={
            'query': query,
            'params': params,
        })
    
    def get_slow_queries(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Yavaş sorguları al"""
        return self.slow_queries[-limit:]

class MemoryOptimizer:
    """Bellek optimizasyonu"""
    
    def __init__(self):
        self.memory_stats = {
            'allocations': 0,
            'deallocations': 0,
            'peak_usage': 0,
            'current_usage': 0,
        }
    
    def get_memory_usage(self) -> Dict[str, Any]:
        """Bellek kullanımını al"""
        try:
            import psutil
            process = psutil.Process()
            memory_info = process.memory_info()
            
            return {
                'rss': memory_info.rss,  # Resident Set Size
                'vms': memory_info.vms,  # Virtual Memory Size
                'percent': process.memory_percent(),
                'available': psutil.virtual_memory().available,
                'total': psutil.virtual_memory().total,
            }
        except ImportError:
            return {'error': 'psutil not available'}
    
    def optimize_memory(self):
        """Belleği optimize et"""
        try:
            import gc
            gc.collect()
            logger.info("Memory optimization completed")
        except Exception as e:
            logger.error(f"Memory optimization failed: {e}")

class PerformanceProfiler:
    """Performans profiler"""
    
    def __init__(self):
        self.profiles = {}
        self.active_profiles = set()
    
    def start_profile(self, name: str):
        """Profil başlat"""
        self.active_profiles.add(name)
        self.profiles[name] = {
            'start_time': time.time(),
            'calls': 0,
            'total_time': 0,
            'min_time': float('inf'),
            'max_time': 0,
        }
    
    def end_profile(self, name: str):
        """Profil bitir"""
        if name in self.active_profiles:
            self.active_profiles.remove(name)
            
            if name in self.profiles:
                profile = self.profiles[name]
                duration = time.time() - profile['start_time']
                
                profile['calls'] += 1
                profile['total_time'] += duration
                profile['min_time'] = min(profile['min_time'], duration)
                profile['max_time'] = max(profile['max_time'], duration)
                profile['avg_time'] = profile['total_time'] / profile['calls']
    
    def get_profile_stats(self) -> Dict[str, Any]:
        """Profil istatistiklerini al"""
        return self.profiles.copy()

# Global instances
connection_pool = ConnectionPool()
async_task_pool = AsyncTaskPool()
cache_optimizer = CacheOptimizer()
query_optimizer = QueryOptimizer()
memory_optimizer = MemoryOptimizer()
performance_profiler = PerformanceProfiler()

def get_performance_stats() -> Dict[str, Any]:
    """Genel performans istatistiklerini al"""
    return {
        'performance_monitor': performance_monitor.get_stats(),
        'cache_optimizer': cache_optimizer.get_cache_stats(),
        'memory_optimizer': memory_optimizer.get_memory_usage(),
        'query_optimizer': {
            'slow_queries_count': len(query_optimizer.slow_queries),
            'recent_slow_queries': query_optimizer.get_slow_queries(10),
        },
        'performance_profiler': performance_profiler.get_profile_stats(),
    }
