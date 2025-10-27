"""
Background Collage Scheduler
Otomatik kolaj işleme için background task scheduler
"""

import asyncio
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session

from database import get_db
from services.smart_collage_service import smart_collage_service
from core.logging import get_logger

logger = get_logger('background_collage_scheduler')

class BackgroundCollageScheduler:
    """Background kolaj scheduler"""
    
    def __init__(self):
        self.is_running = False
        self.task: Optional[asyncio.Task] = None
        logger.info("Background Collage Scheduler initialized")
    
    async def start_scheduler(self, interval_seconds: int = 30):
        """Scheduler'ı başlat"""
        if self.is_running:
            logger.warning("Scheduler already running")
            return
        
        self.is_running = True
        self.task = asyncio.create_task(self._scheduler_loop(interval_seconds))
        logger.info(f"Background scheduler started with {interval_seconds}s interval")
    
    async def stop_scheduler(self):
        """Scheduler'ı durdur"""
        if not self.is_running:
            return
        
        self.is_running = False
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
        
        logger.info("Background scheduler stopped")
    
    async def _scheduler_loop(self, interval_seconds: int):
        """Ana scheduler döngüsü"""
        try:
            while self.is_running:
                try:
                    # Database session al
                    db = next(get_db())
                    
                    try:
                        # Kolaj kuyruğunu işle
                        await smart_collage_service.process_collage_queue(
                            db, max_concurrent=3
                        )
                        
                        # Eski cache'leri temizle (her 10 dakikada bir)
                        if datetime.now().minute % 10 == 0:
                            smart_collage_service.clear_old_cache(max_age_hours=24)
                        
                        # Queue durumunu logla (her 5 dakikada bir)
                        if datetime.now().minute % 5 == 0:
                            status = smart_collage_service.get_queue_status()
                            if status['queue_size'] > 0:
                                logger.info(f"[SCHEDULER] Queue: {status['queue_size']} items, Processing: {status['processing_count']}")
                    
                    finally:
                        db.close()
                    
                except Exception as e:
                    logger.error(f"[SCHEDULER] Error in loop: {e}")
                
                # Interval bekle
                await asyncio.sleep(interval_seconds)
                
        except asyncio.CancelledError:
            logger.info("Scheduler loop cancelled")
        except Exception as e:
            logger.error(f"[SCHEDULER] Fatal error: {e}")
        finally:
            self.is_running = False

# Global instance
background_collage_scheduler = BackgroundCollageScheduler()
