"""
Price Extraction API
Dynamic price extraction configuration endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from pydantic import BaseModel

from database import get_db
from dependencies.auth import get_current_active_user
from models.user import User
from services.smart_price_extractor import smart_price_extractor
from core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(
    prefix="/api/price-extraction",
    tags=["price-extraction"]
)

class PriceRangeUpdate(BaseModel):
    product_type: str
    min_price: int
    max_price: int

class CurrencySymbolAdd(BaseModel):
    symbol: str
    pattern: str

class PriceKeywordAdd(BaseModel):
    language: str
    keyword: str

class ExclusionPatternAdd(BaseModel):
    name: str
    pattern: str

class PriceExtractionTest(BaseModel):
    text: str
    product_type: str = "default"

@router.get("/config")
async def get_price_extraction_config(
    current_user: User = Depends(get_current_active_user)
):
    """Get current price extraction configuration"""
    try:
        return {
            "currency_symbols": smart_price_extractor.currency_symbols,
            "price_keywords": smart_price_extractor.price_keywords,
            "exclusion_patterns": smart_price_extractor.exclusion_patterns,
            "price_ranges": smart_price_extractor.price_ranges,
        }
    except Exception as e:
        logger.error(f"Error getting price extraction config: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.put("/price-ranges")
async def update_price_ranges(
    price_range: PriceRangeUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Update price ranges for a product type"""
    try:
        smart_price_extractor.update_price_ranges(
            price_range.product_type,
            price_range.min_price,
            price_range.max_price
        )
        
        return {
            "success": True,
            "message": f"Price range updated for {price_range.product_type}: {price_range.min_price}-{price_range.max_price}"
        }
    except Exception as e:
        logger.error(f"Error updating price ranges: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/currency-symbols")
async def add_currency_symbol(
    currency: CurrencySymbolAdd,
    current_user: User = Depends(get_current_active_user)
):
    """Add new currency symbol"""
    try:
        smart_price_extractor.add_currency_symbol(currency.symbol, currency.pattern)
        
        return {
            "success": True,
            "message": f"Currency symbol '{currency.symbol}' added successfully"
        }
    except Exception as e:
        logger.error(f"Error adding currency symbol: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/price-keywords")
async def add_price_keyword(
    keyword: PriceKeywordAdd,
    current_user: User = Depends(get_current_active_user)
):
    """Add new price keyword"""
    try:
        smart_price_extractor.add_price_keyword(keyword.language, keyword.keyword)
        
        return {
            "success": True,
            "message": f"Price keyword '{keyword.keyword}' added for language '{keyword.language}'"
        }
    except Exception as e:
        logger.error(f"Error adding price keyword: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/exclusion-patterns")
async def add_exclusion_pattern(
    pattern: ExclusionPatternAdd,
    current_user: User = Depends(get_current_active_user)
):
    """Add new exclusion pattern"""
    try:
        smart_price_extractor.add_exclusion_pattern(pattern.name, pattern.pattern)
        
        return {
            "success": True,
            "message": f"Exclusion pattern '{pattern.name}' added successfully"
        }
    except Exception as e:
        logger.error(f"Error adding exclusion pattern: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/test")
async def test_price_extraction(
    test_data: PriceExtractionTest,
    current_user: User = Depends(get_current_active_user)
):
    """Test price extraction with sample text"""
    try:
        price = await smart_price_extractor.extract_price(
            test_data.text, 
            test_data.product_type
        )
        
        return {
            "success": True,
            "extracted_price": price,
            "product_type": test_data.product_type,
            "input_text": test_data.text[:200] + "..." if len(test_data.text) > 200 else test_data.text
        }
    except Exception as e:
        logger.error(f"Error testing price extraction: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/product-types")
async def get_product_types(
    current_user: User = Depends(get_current_active_user)
):
    """Get available product types and their price ranges"""
    try:
        return {
            "product_types": list(smart_price_extractor.price_ranges.keys()),
            "price_ranges": smart_price_extractor.price_ranges
        }
    except Exception as e:
        logger.error(f"Error getting product types: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/reset-config")
async def reset_price_extraction_config(
    current_user: User = Depends(get_current_active_user)
):
    """Reset price extraction configuration to defaults"""
    try:
        # Reinitialize the smart price extractor
        from services.smart_price_extractor import SmartPriceExtractor
        global smart_price_extractor
        smart_price_extractor = SmartPriceExtractor()
        
        return {
            "success": True,
            "message": "Price extraction configuration reset to defaults"
        }
    except Exception as e:
        logger.error(f"Error resetting price extraction config: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
