"""
Background Processor
Arka plan işlemlerini yöneten servis
"""

import asyncio
import threading
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
from typing import Callable, Any, Dict, List, Optional
from datetime import datetime, timedelta
from queue import Queue, Empty
from core.logging import get_logger
from core.exceptions import BaseAppException

logger = get_logger('background_processor')

class BackgroundTask:
    """Arka plan görevi"""
    
    def __init__(self, task_id: str, func: Callable, args: tuple = (), kwargs: dict = None, priority: int = 0):
        self.task_id = task_id
        self.func = func
        self.args = args
        self.kwargs = kwargs or {}
        self.priority = priority
        self.created_at = datetime.now()
        self.started_at: Optional[datetime] = None
        self.completed_at: Optional[datetime] = None
        self.status = 'pending'  # pending, running, completed, failed
        self.result: Any = None
        self.error: Optional[Exception] = None
        self.retry_count = 0
        self.max_retries = 3

    def __lt__(self, other):
        """Öncelik sıralaması için"""
        return self.priority > other.priority

class BackgroundProcessor:
    """Arka plan işlemci"""
    
    def __init__(self, max_workers: int = 4, max_processes: int = 2):
        self.max_workers = max_workers
        self.max_processes = max_processes
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.process_executor = ProcessPoolExecutor(max_workers=max_processes)
        self.task_queue = Queue()
        self.running_tasks: Dict[str, BackgroundTask] = {}
        self.completed_tasks: Dict[str, BackgroundTask] = {}
        self.failed_tasks: Dict[str, BackgroundTask] = {}
        self.is_running = False
        self.worker_thread: Optional[threading.Thread] = None
        self.stats = {
            'total_tasks': 0,
            'completed_tasks': 0,
            'failed_tasks': 0,
            'running_tasks': 0,
            'queue_size': 0
        }

    def start(self):
        """İşlemciyi başlat"""
        if self.is_running:
            return
        
        self.is_running = True
        self.worker_thread = threading.Thread(target=self._worker_loop, daemon=True)
        self.worker_thread.start()
        logger.info("Background processor started")

    def stop(self):
        """İşlemciyi durdur"""
        self.is_running = False
        if self.worker_thread:
            self.worker_thread.join(timeout=5)
        
        self.executor.shutdown(wait=True)
        self.process_executor.shutdown(wait=True)
        logger.info("Background processor stopped")

    def add_task(self, task_id: str, func: Callable, args: tuple = (), kwargs: dict = None, priority: int = 0) -> bool:
        """Görev ekle"""
        try:
            task = BackgroundTask(task_id, func, args, kwargs, priority)
            self.task_queue.put(task)
            self.stats['total_tasks'] += 1
            self.stats['queue_size'] = self.task_queue.qsize()
            
            logger.info(f"Task added: {task_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error adding task {task_id}: {e}")
            return False

    def add_async_task(self, task_id: str, coro, priority: int = 0) -> bool:
        """Asenkron görev ekle"""
        try:
            def async_wrapper():
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    return loop.run_until_complete(coro)
                finally:
                    loop.close()
            
            return self.add_task(task_id, async_wrapper, priority=priority)
            
        except Exception as e:
            logger.error(f"Error adding async task {task_id}: {e}")
            return False

    def add_process_task(self, task_id: str, func: Callable, args: tuple = (), kwargs: dict = None, priority: int = 0) -> bool:
        """İşlem görevi ekle"""
        try:
            def process_wrapper():
                future = self.process_executor.submit(func, *args, **kwargs)
                return future.result()
            
            return self.add_task(task_id, process_wrapper, priority=priority)
            
        except Exception as e:
            logger.error(f"Error adding process task {task_id}: {e}")
            return False

    def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Görev durumunu al"""
        if task_id in self.running_tasks:
            task = self.running_tasks[task_id]
            return {
                'task_id': task.task_id,
                'status': task.status,
                'created_at': task.created_at.isoformat(),
                'started_at': task.started_at.isoformat() if task.started_at else None,
                'priority': task.priority,
                'retry_count': task.retry_count
            }
        
        if task_id in self.completed_tasks:
            task = self.completed_tasks[task_id]
            return {
                'task_id': task.task_id,
                'status': task.status,
                'created_at': task.created_at.isoformat(),
                'started_at': task.started_at.isoformat() if task.started_at else None,
                'completed_at': task.completed_at.isoformat() if task.completed_at else None,
                'priority': task.priority,
                'retry_count': task.retry_count
            }
        
        if task_id in self.failed_tasks:
            task = self.failed_tasks[task_id]
            return {
                'task_id': task.task_id,
                'status': task.status,
                'created_at': task.created_at.isoformat(),
                'started_at': task.started_at.isoformat() if task.started_at else None,
                'completed_at': task.completed_at.isoformat() if task.completed_at else None,
                'priority': task.priority,
                'retry_count': task.retry_count,
                'error': str(task.error) if task.error else None
            }
        
        return None

    def get_stats(self) -> Dict[str, Any]:
        """İstatistikleri al"""
        return {
            **self.stats,
            'running_tasks': len(self.running_tasks),
            'completed_tasks': len(self.completed_tasks),
            'failed_tasks': len(self.failed_tasks),
            'queue_size': self.task_queue.qsize()
        }

    def _worker_loop(self):
        """Çalışan döngüsü"""
        while self.is_running:
            try:
                # Görev al
                task = self.task_queue.get(timeout=1)
                
                # Görevi çalıştır
                self._execute_task(task)
                
            except Empty:
                continue
            except Exception as e:
                logger.error(f"Worker loop error: {e}")

    def _execute_task(self, task: BackgroundTask):
        """Görevi çalıştır"""
        try:
            # Görevi çalışan listesine ekle
            self.running_tasks[task.task_id] = task
            task.status = 'running'
            task.started_at = datetime.now()
            self.stats['running_tasks'] = len(self.running_tasks)
            
            # Görevi çalıştır
            future = self.executor.submit(task.func, *task.args, **task.kwargs)
            result = future.result()
            
            # Başarılı tamamlandı
            task.result = result
            task.status = 'completed'
            task.completed_at = datetime.now()
            
            # Tamamlanan listesine ekle
            self.completed_tasks[task.task_id] = task
            del self.running_tasks[task.task_id]
            
            self.stats['completed_tasks'] += 1
            self.stats['running_tasks'] = len(self.running_tasks)
            
            logger.info(f"Task completed: {task.task_id}")
            
        except Exception as e:
            # Hata oluştu
            task.error = e
            task.status = 'failed'
            task.completed_at = datetime.now()
            
            # Yeniden deneme
            if task.retry_count < task.max_retries:
                task.retry_count += 1
                task.status = 'pending'
                task.started_at = None
                task.completed_at = None
                task.error = None
                
                # Kuyruğa tekrar ekle
                self.task_queue.put(task)
                del self.running_tasks[task.task_id]
                
                logger.warning(f"Task failed, retrying: {task.task_id} (attempt {task.retry_count})")
            else:
                # Maksimum deneme sayısına ulaşıldı
                self.failed_tasks[task.task_id] = task
                del self.running_tasks[task.task_id]
                
                self.stats['failed_tasks'] += 1
                self.stats['running_tasks'] = len(self.running_tasks)
                
                logger.error(f"Task failed permanently: {task.task_id} - {e}")

    def cancel_task(self, task_id: str) -> bool:
        """Görevi iptal et"""
        if task_id in self.running_tasks:
            task = self.running_tasks[task_id]
            task.status = 'cancelled'
            task.completed_at = datetime.now()
            
            # Tamamlanan listesine ekle
            self.completed_tasks[task_id] = task
            del self.running_tasks[task_id]
            
            self.stats['running_tasks'] = len(self.running_tasks)
            logger.info(f"Task cancelled: {task_id}")
            return True
        
        return False

    def clear_completed_tasks(self, older_than_hours: int = 24):
        """Tamamlanan görevleri temizle"""
        cutoff_time = datetime.now() - timedelta(hours=older_than_hours)
        
        # Eski tamamlanan görevleri sil
        old_tasks = [
            task_id for task_id, task in self.completed_tasks.items()
            if task.completed_at and task.completed_at < cutoff_time
        ]
        
        for task_id in old_tasks:
            del self.completed_tasks[task_id]
        
        # Eski başarısız görevleri sil
        old_failed_tasks = [
            task_id for task_id, task in self.failed_tasks.items()
            if task.completed_at and task.completed_at < cutoff_time
        ]
        
        for task_id in old_failed_tasks:
            del self.failed_tasks[task_id]
        
        logger.info(f"Cleared {len(old_tasks)} completed tasks and {len(old_failed_tasks)} failed tasks")

# Singleton instance
background_processor = BackgroundProcessor()

# Background task decorators
def background_task(task_id: str = None, priority: int = 0):
    """Arka plan görevi dekoratörü"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            task_id_final = task_id or f"{func.__name__}_{datetime.now().timestamp()}"
            return background_processor.add_task(task_id_final, func, args, kwargs, priority)
        return wrapper
    return decorator

def async_background_task(task_id: str = None, priority: int = 0):
    """Asenkron arka plan görevi dekoratörü"""
    def decorator(coro):
        def wrapper(*args, **kwargs):
            task_id_final = task_id or f"{coro.__name__}_{datetime.now().timestamp()}"
            return background_processor.add_async_task(task_id_final, coro(*args, **kwargs), priority)
        return wrapper
    return decorator