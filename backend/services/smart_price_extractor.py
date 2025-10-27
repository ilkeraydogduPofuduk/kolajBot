"""
Smart Price Extractor
AI-powered, modular price extraction system
"""

import re
import logging
from typing import Optional, List, Dict, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import asyncio
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

class PriceContext(Enum):
    """Price context types"""
    CURRENCY_SYMBOL = "currency_symbol"
    PRICE_KEYWORD = "price_keyword"
    POSITIONAL = "positional"
    ISOLATED = "isolated"
    PATTERN_BASED = "pattern_based"

@dataclass
class PriceCandidate:
    """Price candidate with metadata"""
    value: str
    confidence: float
    context: PriceContext
    position: int
    line_number: int
    surrounding_text: str
    reasoning: str

class SmartPriceExtractor:
    """AI-powered, modular price extraction system"""
    
    def __init__(self):
        self.executor = ThreadPoolExecutor(max_workers=4)
        
        # Dynamic price patterns (can be updated)
        self.currency_symbols = {
            'TL': r'\b(\d+)[,.]?\d*\s*TL\b',
            '₺': r'\b(\d+)[,.]?\d*\s*₺\b',
            'USD': r'\b(\d+)[,.]?\d*\s*USD\b',
            'EUR': r'\b(\d+)[,.]?\d*\s*EUR\b',
            '$': r'\b(\d+)[,.]?\d*\s*\$\b',
            'TRY': r'\b(\d+)[,.]?\d*\s*TRY\b',
            'LIRA': r'\b(\d+)[,.]?\d*\s*LIRA\b',
        }
        
        # Dynamic price keywords (can be updated)
        self.price_keywords = {
            'tr': ['fiyat', 'price', 'tutar', 'ücret', 'bedel', 'maliyet', 'değer'],
            'en': ['price', 'cost', 'amount', 'value', 'fee', 'charge'],
            'ar': ['سعر', 'ثمن', 'تكلفة', 'قيمة'],
        }
        
        # Dynamic exclusion patterns (can be updated)
        self.exclusion_patterns = {
            'size_ranges': r'\d{2,3}[-/]\d{2,3}',
            'phone_numbers': r'\+90|0\d{3}|5\d{2}',
            'dates': r'\d{1,2}\.\d{1,2}\.\d{4}',
            'barcodes': r'\d{10,}',
            'product_codes': r'\b\d{6,9}\b',
            'measurements': r'\d+\s*(cm|mm|kg|gr|gram|metre|meter)',
            'percentages': r'\d+\s*%',
            'seasons': r'f/w|s/s|a/w|fw|ss|aw|season',
        }
        
        # Dynamic price ranges (can be updated based on product type)
        self.price_ranges = {
            'clothing': (20, 500),
            'accessories': (10, 200),
            'shoes': (50, 800),
            'bags': (30, 1000),
            'jewelry': (100, 5000),
            'default': (10, 1000),
        }
        
        # Position-based patterns
        self.positional_patterns = [
            r'^\s*(\d{2,4})\s*$',  # Standalone number
            r'^(\d{2,4})\s*TL\s*$',  # Number + TL
            r'^(\d{2,4})\s*₺\s*$',  # Number + ₺
            r'fiyat[:\s]*(\d{2,4})',  # Fiyat: 150
            r'price[:\s]*(\d{2,4})',  # Price: 150
        ]
    
    async def extract_price(self, text: str, product_type: str = 'default') -> Optional[str]:
        """Extract price using smart, modular approach"""
        try:
            logger.info(f"[SMART PRICE] Analyzing text for {product_type} product")
            
            # Get all price candidates
            candidates = await self._find_all_price_candidates(text, product_type)
            
            if not candidates:
                logger.info("[SMART PRICE] No price candidates found")
                return "Eksik"
            
            # Score and rank candidates
            scored_candidates = await self._score_candidates(candidates, product_type)
            
            # Select best candidate
            best_candidate = await self._select_best_candidate(scored_candidates)
            
            if best_candidate:
                logger.info(f"[SMART PRICE] Selected: {best_candidate.value} (confidence: {best_candidate.confidence:.2f}, context: {best_candidate.context.value})")
                return best_candidate.value
            
            logger.info("[SMART PRICE] No suitable price found")
            return "Eksik"
            
        except Exception as e:
            logger.error(f"[SMART PRICE] Error: {e}")
            return "Eksik"
    
    async def _find_all_price_candidates(self, text: str, product_type: str) -> List[PriceCandidate]:
        """Find all possible price candidates"""
        candidates = []
        lines = text.split('\n')
        
        # Method 1: Currency symbols
        candidates.extend(await self._find_currency_candidates(text, lines))
        
        # Method 2: Price keywords
        candidates.extend(await self._find_keyword_candidates(text, lines))
        
        # Method 3: Positional patterns
        candidates.extend(await self._find_positional_candidates(text, lines))
        
        # Method 4: Isolated numbers
        candidates.extend(await self._find_isolated_candidates(text, lines, product_type))
        
        # Method 5: Pattern-based extraction
        candidates.extend(await self._find_pattern_candidates(text, lines))
        
        return candidates
    
    async def _find_currency_candidates(self, text: str, lines: List[str]) -> List[PriceCandidate]:
        """Find prices with currency symbols"""
        candidates = []
        
        for symbol, pattern in self.currency_symbols.items():
            matches = re.finditer(pattern, text.upper())
            for match in matches:
                value = match.group(1)
                line_num = text[:match.start()].count('\n')
                surrounding = self._get_surrounding_text(text, match.start(), match.end())
                
                candidates.append(PriceCandidate(
                    value=value,
                    confidence=0.9,  # High confidence for currency symbols
                    context=PriceContext.CURRENCY_SYMBOL,
                    position=match.start(),
                    line_number=line_num,
                    surrounding_text=surrounding,
                    reasoning=f"Found with {symbol} symbol"
                ))
        
        return candidates
    
    async def _find_keyword_candidates(self, text: str, lines: List[str]) -> List[PriceCandidate]:
        """Find prices with price keywords"""
        candidates = []
        
        for lang, keywords in self.price_keywords.items():
            for keyword in keywords:
                # Case insensitive search
                pattern = rf'{re.escape(keyword)}\s*[:\-]?\s*(\d{{2,4}})'
                matches = re.finditer(pattern, text.lower())
                
                for match in matches:
                    value = match.group(1)
                    line_num = text[:match.start()].count('\n')
                    surrounding = self._get_surrounding_text(text, match.start(), match.end())
                    
                    candidates.append(PriceCandidate(
                        value=value,
                        confidence=0.8,  # High confidence for keywords
                        context=PriceContext.PRICE_KEYWORD,
                        position=match.start(),
                        line_number=line_num,
                        surrounding_text=surrounding,
                        reasoning=f"Found with '{keyword}' keyword"
                    ))
        
        return candidates
    
    async def _find_positional_candidates(self, text: str, lines: List[str]) -> List[PriceCandidate]:
        """Find prices based on position patterns"""
        candidates = []
        
        for pattern in self.positional_patterns:
            matches = re.finditer(pattern, text, re.MULTILINE)
            for match in matches:
                value = match.group(1)
                line_num = text[:match.start()].count('\n')
                surrounding = self._get_surrounding_text(text, match.start(), match.end())
                
                candidates.append(PriceCandidate(
                    value=value,
                    confidence=0.6,  # Medium confidence for positional
                    context=PriceContext.POSITIONAL,
                    position=match.start(),
                    line_number=line_num,
                    surrounding_text=surrounding,
                    reasoning=f"Found with positional pattern: {pattern}"
                ))
        
        return candidates
    
    async def _find_isolated_candidates(self, text: str, lines: List[str], product_type: str) -> List[PriceCandidate]:
        """Find isolated numbers that could be prices"""
        candidates = []
        min_price, max_price = self.price_ranges.get(product_type, self.price_ranges['default'])
        
        for i, line in enumerate(lines):
            line = line.strip()
            
            # Skip if line matches exclusion patterns
            if self._should_skip_line(line):
                continue
            
            # Look for standalone numbers (but NOT decimals like 102.2643)
            # CRITICAL FIX: Use negative lookahead to exclude numbers followed by decimal point
            numbers = re.findall(r'\b(\d{2,4})(?!\.\d)\b', line)
            for number in numbers:
                num_value = int(number)
                if min_price <= num_value <= max_price:
                    surrounding = self._get_surrounding_text(text, 0, len(text))
                    
                    candidates.append(PriceCandidate(
                        value=number,
                        confidence=0.4,  # Lower confidence for isolated
                        context=PriceContext.ISOLATED,
                        position=0,
                        line_number=i,
                        surrounding_text=surrounding,
                        reasoning=f"Isolated number in range {min_price}-{max_price}"
                    ))
        
        return candidates
    
    async def _find_pattern_candidates(self, text: str, lines: List[str]) -> List[PriceCandidate]:
        """Find prices using advanced patterns"""
        candidates = []
        
        # Pattern: Number followed by common price indicators
        price_indicators = ['tl', '₺', 'lira', 'fiyat', 'price', 'tutar']
        for indicator in price_indicators:
            pattern = rf'(\d{{2,4}})\s*{re.escape(indicator)}'
            matches = re.finditer(pattern, text.lower())
            
            for match in matches:
                value = match.group(1)
                line_num = text[:match.start()].count('\n')
                surrounding = self._get_surrounding_text(text, match.start(), match.end())
                
                candidates.append(PriceCandidate(
                    value=value,
                    confidence=0.7,  # Good confidence for pattern-based
                    context=PriceContext.PATTERN_BASED,
                    position=match.start(),
                    line_number=line_num,
                    surrounding_text=surrounding,
                    reasoning=f"Found with pattern: number + {indicator}"
                ))
        
        return candidates
    
    async def _score_candidates(self, candidates: List[PriceCandidate], product_type: str) -> List[PriceCandidate]:
        """Score and rank price candidates"""
        min_price, max_price = self.price_ranges.get(product_type, self.price_ranges['default'])
        
        for candidate in candidates:
            # Base score from confidence
            score = candidate.confidence
            
            # Adjust score based on value
            try:
                value = int(candidate.value)
                if min_price <= value <= max_price:
                    score += 0.2  # Bonus for being in expected range
                elif value < min_price:
                    score -= 0.3  # Penalty for being too low
                elif value > max_price:
                    score -= 0.2  # Penalty for being too high
            except ValueError:
                score -= 0.5  # Penalty for invalid number
            
            # Adjust score based on context
            if candidate.context == PriceContext.CURRENCY_SYMBOL:
                score += 0.1
            elif candidate.context == PriceContext.PRICE_KEYWORD:
                score += 0.05
            
            # Adjust score based on position
            if candidate.line_number < 5:  # Prefer prices near the top
                score += 0.05
            
            # Update confidence with calculated score
            candidate.confidence = min(1.0, max(0.0, score))
        
        # Sort by confidence (highest first)
        return sorted(candidates, key=lambda x: x.confidence, reverse=True)
    
    async def _select_best_candidate(self, candidates: List[PriceCandidate]) -> Optional[PriceCandidate]:
        """Select the best price candidate"""
        if not candidates:
            return None
        
        # Return the highest scoring candidate
        best = candidates[0]
        
        # Only return if confidence is above threshold
        if best.confidence >= 0.5:
            return best
        
        return None
    
    def _should_skip_line(self, line: str) -> bool:
        """Check if line should be skipped based on exclusion patterns"""
        line_lower = line.lower()
        
        for pattern_name, pattern in self.exclusion_patterns.items():
            if re.search(pattern, line_lower):
                logger.debug(f"[SMART PRICE] Skipping line due to {pattern_name}: {line}")
                return True
        
        return False
    
    def _get_surrounding_text(self, text: str, start: int, end: int, context: int = 50) -> str:
        """Get surrounding text for context"""
        context_start = max(0, start - context)
        context_end = min(len(text), end + context)
        return text[context_start:context_end]
    
    def update_price_ranges(self, product_type: str, min_price: int, max_price: int):
        """Update price ranges for a product type"""
        self.price_ranges[product_type] = (min_price, max_price)
        logger.info(f"[SMART PRICE] Updated price range for {product_type}: {min_price}-{max_price}")
    
    def add_currency_symbol(self, symbol: str, pattern: str):
        """Add new currency symbol"""
        self.currency_symbols[symbol] = pattern
        logger.info(f"[SMART PRICE] Added currency symbol: {symbol}")
    
    def add_price_keyword(self, language: str, keyword: str):
        """Add new price keyword"""
        if language not in self.price_keywords:
            self.price_keywords[language] = []
        self.price_keywords[language].append(keyword)
        logger.info(f"[SMART PRICE] Added price keyword: {keyword} ({language})")
    
    def add_exclusion_pattern(self, name: str, pattern: str):
        """Add new exclusion pattern"""
        self.exclusion_patterns[name] = pattern
        logger.info(f"[SMART PRICE] Added exclusion pattern: {name}")

# Global instance
smart_price_extractor = SmartPriceExtractor()
