"""
Label Extraction API
Comprehensive label information extraction endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from pydantic import BaseModel

from database import get_db
from dependencies.auth import get_current_active_user
from models.user import User
from services.smart_label_extractor import smart_label_extractor
from core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(
    prefix="/api/label-extraction",
    tags=["label-extraction"]
)

class LabelExtractionTest(BaseModel):
    text: str
    product_type: str = "default"

class LabelFieldUpdate(BaseModel):
    field_type: str
    patterns: List[str]
    keywords: List[str]

@router.post("/extract")
async def extract_label_info(
    test_data: LabelExtractionTest,
    current_user: User = Depends(get_current_active_user)
):
    """Extract all label information from text"""
    try:
        label_info = await smart_label_extractor.extract_all_fields(
            test_data.text, 
            test_data.product_type
        )
        
        return {
            "success": True,
            "label_info": {
                "brand": label_info.brand,
                "product_code": label_info.product_code,
                "color": label_info.color,
                "size_range": label_info.size_range,
                "price": label_info.price,
                "product_type": label_info.product_type,
                "material": label_info.material,
                "season": label_info.season,
                "barcode": label_info.barcode,
                "country": label_info.country,
                "care_instructions": label_info.care_instructions,
                "composition": label_info.composition,
                "confidence": label_info.confidence,
                "missing_fields": label_info.missing_fields,
            },
            "input_text": test_data.text[:200] + "..." if len(test_data.text) > 200 else test_data.text
        }
    except Exception as e:
        logger.error(f"Error extracting label info: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/config")
async def get_label_extraction_config(
    current_user: User = Depends(get_current_active_user)
):
    """Get current label extraction configuration"""
    try:
        return {
            "brand_patterns": smart_label_extractor.brand_patterns,
            "product_code_patterns": smart_label_extractor.product_code_patterns,
            "color_patterns": smart_label_extractor.color_patterns,
            "size_patterns": smart_label_extractor.size_patterns,
            "price_patterns": smart_label_extractor.price_patterns,
            "product_type_patterns": smart_label_extractor.product_type_patterns,
            "material_patterns": smart_label_extractor.material_patterns,
            "season_patterns": smart_label_extractor.season_patterns,
            "barcode_patterns": smart_label_extractor.barcode_patterns,
            "country_patterns": smart_label_extractor.country_patterns,
            "care_patterns": smart_label_extractor.care_patterns,
            "composition_patterns": smart_label_extractor.composition_patterns,
        }
    except Exception as e:
        logger.error(f"Error getting label extraction config: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/field-types")
async def get_field_types(
    current_user: User = Depends(get_current_active_user)
):
    """Get available field types"""
    try:
        from services.smart_label_extractor import LabelField
        
        return {
            "field_types": [
                {
                    "name": field.value,
                    "display_name": field.value.replace("_", " ").title(),
                    "description": f"Extract {field.value.replace('_', ' ')} information"
                }
                for field in LabelField
            ]
        }
    except Exception as e:
        logger.error(f"Error getting field types: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/test-field")
async def test_field_extraction(
    field_type: str,
    test_data: LabelExtractionTest,
    current_user: User = Depends(get_current_active_user)
):
    """Test extraction of a specific field"""
    try:
        from services.smart_label_extractor import LabelField
        
        if field_type not in [field.value for field in LabelField]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid field type: {field_type}"
            )
        
        # Extract specific field
        if field_type == "brand":
            result = await smart_label_extractor._extract_brand(test_data.text)
        elif field_type == "product_code":
            result = await smart_label_extractor._extract_product_code(test_data.text)
        elif field_type == "color":
            result = await smart_label_extractor._extract_color(test_data.text)
        elif field_type == "size_range":
            result = await smart_label_extractor._extract_size_range(test_data.text)
        elif field_type == "price":
            result = await smart_label_extractor._extract_price(test_data.text, test_data.product_type)
        elif field_type == "product_type":
            result = await smart_label_extractor._extract_product_type(test_data.text)
        elif field_type == "material":
            result = await smart_label_extractor._extract_material(test_data.text)
        elif field_type == "season":
            result = await smart_label_extractor._extract_season(test_data.text)
        elif field_type == "barcode":
            result = await smart_label_extractor._extract_barcode(test_data.text)
        elif field_type == "country":
            result = await smart_label_extractor._extract_country(test_data.text)
        elif field_type == "care_instructions":
            result = await smart_label_extractor._extract_care_instructions(test_data.text)
        elif field_type == "composition":
            result = await smart_label_extractor._extract_composition(test_data.text)
        else:
            result = None
        
        return {
            "success": True,
            "field_type": field_type,
            "extracted_value": result,
            "input_text": test_data.text[:200] + "..." if len(test_data.text) > 200 else test_data.text
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error testing field extraction: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/statistics")
async def get_extraction_statistics(
    current_user: User = Depends(get_current_active_user)
):
    """Get extraction statistics and performance metrics"""
    try:
        # This would typically come from a database or cache
        # For now, return mock statistics
        return {
            "total_extractions": 0,
            "successful_extractions": 0,
            "failed_extractions": 0,
            "average_confidence": 0.0,
            "most_common_missing_fields": [],
            "extraction_methods_performance": {
                "brand": {"success_rate": 0.0, "average_confidence": 0.0},
                "product_code": {"success_rate": 0.0, "average_confidence": 0.0},
                "color": {"success_rate": 0.0, "average_confidence": 0.0},
                "size_range": {"success_rate": 0.0, "average_confidence": 0.0},
                "price": {"success_rate": 0.0, "average_confidence": 0.0},
                "product_type": {"success_rate": 0.0, "average_confidence": 0.0},
            }
        }
    except Exception as e:
        logger.error(f"Error getting extraction statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/validate")
async def validate_extraction(
    test_data: LabelExtractionTest,
    expected_fields: Dict[str, Any],
    current_user: User = Depends(get_current_active_user)
):
    """Validate extraction results against expected values"""
    try:
        label_info = await smart_label_extractor.extract_all_fields(
            test_data.text, 
            test_data.product_type
        )
        
        validation_results = {}
        for field, expected_value in expected_fields.items():
            actual_value = getattr(label_info, field, None)
            validation_results[field] = {
                "expected": expected_value,
                "actual": actual_value,
                "match": str(actual_value).lower() == str(expected_value).lower() if actual_value and expected_value else False,
                "confidence": 1.0 if str(actual_value).lower() == str(expected_value).lower() else 0.0
            }
        
        overall_accuracy = sum(1 for result in validation_results.values() if result["match"]) / len(validation_results) if validation_results else 0.0
        
        return {
            "success": True,
            "overall_accuracy": overall_accuracy,
            "validation_results": validation_results,
            "label_info": {
                "brand": label_info.brand,
                "product_code": label_info.product_code,
                "color": label_info.color,
                "size_range": label_info.size_range,
                "price": label_info.price,
                "product_type": label_info.product_type,
                "material": label_info.material,
                "season": label_info.season,
                "barcode": label_info.barcode,
                "country": label_info.country,
                "care_instructions": label_info.care_instructions,
                "composition": label_info.composition,
                "confidence": label_info.confidence,
                "missing_fields": label_info.missing_fields,
            }
        }
    except Exception as e:
        logger.error(f"Error validating extraction: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
