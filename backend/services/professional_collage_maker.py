"""
Professional Collage Maker V2.0
Revize edilmiş profesyonel kolaj oluşturucu
"""

import os
from typing import List, Optional
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from core.logging import get_logger

logger = get_logger('professional_collage')

class ProfessionalCollageMaker:
    """Profesyonel kolaj oluşturucu - revize edilmiş tasarım"""
    
    def __init__(self):
        self.width = 720
        self.height = 1280
        self.fonts = self._initialize_fonts()
        
        # Renkler
        self.bg_color = (255, 255, 255)  # Beyaz
        self.text_color = (0, 0, 0)  # Siyah
        self.accent_color = (220, 53, 69)  # Kırmızı (fiyat için)
        self.border_color = (240, 240, 240)  # Açık gri
        
        # Layout değerleri - ŞABLON ÖRNEKLERİNE GÖRE
        self.header_height = 60  # Üst başlık (marka için)
        self.bottom_height = 110  # Alt bilgi (büyük logo ve fiyat kutuları için)
        self.padding = 5  # Kenar boşluğu (minimal)
        self.image_gap = 3  # Görseller arası boşluk (minimal)
    
    def _initialize_fonts(self):
        """Font'ları yükle"""
        try:
            font_path = "C:/Windows/Fonts/arial.ttf"
            bold_font_path = "C:/Windows/Fonts/arialbd.ttf"
            
            if os.path.exists(bold_font_path):
                logger.info(f"[FONTS] Loaded from: {bold_font_path}")
                return {
                    'regular': font_path,
                    'bold': bold_font_path
                }
            else:
                logger.info(f"[FONTS] Loaded from: {font_path}")
                return {
                    'regular': font_path,
                    'bold': font_path
                }
        except Exception as e:
            logger.error(f"[FONTS] Error: {e}")
            return {'regular': None, 'bold': None}
    
    def _get_font(self, size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
        """Font al"""
        try:
            font_type = 'bold' if bold else 'regular'
            font_path = self.fonts.get(font_type)
            
            if font_path and os.path.exists(font_path):
                return ImageFont.truetype(font_path, size)
            else:
                return ImageFont.load_default()
        except:
            return ImageFont.load_default()
    
    def create_professional_collage(
        self,
        product_code: str,
        color: str,
        brand: str,
        product_type: str,
        size_range: str,
        price: Optional[float],
        product_images: List[str],
        output_path: str,
        product_code_2: Optional[str] = None,
        color_2: Optional[str] = None,
        product_type_2: Optional[str] = None,
        size_range_2: Optional[str] = None,
        price_2: Optional[float] = None,
        badge: Optional[str] = None,
        logo: Optional[str] = None
    ) -> bool:
        """Profesyonel kolaj oluştur"""
        try:
            logger.info(f"[COLLAGE] Creating for {product_code} - {brand}")
            
            # Canvas
            canvas = Image.new('RGB', (self.width, self.height), self.bg_color)
            draw = ImageDraw.Draw(canvas)
            
            # 1. Üst Marka Başlığı (Ortalanmış, Kalın, Büyük) - KOMPAKT
            self._draw_brand_header(canvas, draw, brand)
            
            # 2. Badge (varsa, sağ üst)
            if badge:
                self._draw_badge(canvas, draw, badge)
            
            # 3. Ürün Görselleri - MAKSIMUM ALAN KULLAN
            image_area_top = self.header_height
            image_area_height = self.height - self.header_height - self.bottom_height
            self._draw_product_images(canvas, product_images, image_area_top, image_area_height)
            
            # 4. Alt Bilgi Alanı - KOMPAKT VE SIKIŞIK
            bottom_area_top = self.height - self.bottom_height
            self._draw_bottom_info(canvas, draw, bottom_area_top, 
                                   product_code, color, product_type, size_range, price,
                                   product_code_2, color_2, product_type_2, size_range_2, price_2, brand)
            
            # 5. Marka Logosu (Alt sağ köşe, küçük) - DİSABLED (fiyatın üzerinde görünüyor)
            # self._draw_brand_logo(canvas, draw, brand)
            
            # Kaydet
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            canvas.save(output_path, 'JPEG', quality=95)
            logger.info(f"[COLLAGE] Saved: {output_path}")
            
            return True
            
        except Exception as e:
            logger.error(f"[COLLAGE] Error: {e}")
            return False
    
    def _draw_brand_header(self, canvas, draw, brand: str):
        """Marka başlığı - ŞABLON ÖRNEKLERİNE GÖRE (hafif gri üzerinde, ortalanmış)"""
        try:
            # Arka plan - açık gri (örneklerdeki gibi)
            draw.rectangle((0, 0, self.width, self.header_height), fill=(235, 235, 235))
            
            # Marka metni - ince, zarif (örneklerdeki gibi)
            font = self._get_font(42, bold=True)
            text = brand.upper()
            
            # Metni tam ortala
            bbox = draw.textbbox((0, 0), text, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
            
            x = (self.width - text_width) // 2
            y = (self.header_height - text_height) // 2
            
            # Hafif gri/kahverengi metin (örneklerdeki gibi)
            draw.text((x, y), text, font=font, fill=(150, 140, 130))
            
        except Exception as e:
            logger.error(f"[BRAND HEADER] Error: {e}")
    
    def _draw_badge(self, canvas, draw, badge: str):
        """Badge - sağ üst köşe"""
        try:
            font = self._get_font(20, bold=True)
            
            # Badge boyutları
            padding = 15
            bbox = draw.textbbox((0, 0), badge, font=font)
            badge_width = bbox[2] - bbox[0] + padding * 2
            badge_height = bbox[3] - bbox[1] + padding * 2
            
            # Sağ üst köşe
            x = self.width - badge_width - 20
            y = 30
            
            # Arka plan (kırmızı, yuvarlatılmış)
            self._draw_rounded_rectangle(draw, (x, y, x + badge_width, y + badge_height), 
                                         15, fill=(220, 53, 69))
            
            # Metin (beyaz)
            text_x = x + padding
            text_y = y + padding
            draw.text((text_x, text_y), badge, font=font, fill=(255, 255, 255))
            
        except Exception as e:
            logger.error(f"[BADGE] Error: {e}")
    
    def _draw_product_images(self, canvas, images: List[str], top: int, height: int):
        """Ürün görsellerini çiz - dosya adındaki en küçük sayı ana görsel"""
        try:
            if not images:
                return
            
            # Dosya adlarından sayıları çıkar ve sırala
            def get_image_number(img_path):
                import re
                # Dosya adından sayıyı bul (örn: "VV-6124 B BROWN 11.jpg" -> 11)
                match = re.search(r'(\d+)\.jpg$', img_path, re.IGNORECASE)
                if match:
                    return int(match.group(1))
                return 999  # Sayı yoksa en sona koy
            
            # Görselleri sırala - en küçük sayı ilk
            sorted_images = sorted(images, key=get_image_number)
            logger.info(f"[IMAGES] Sorted {len(sorted_images)} images by number")
            
            if len(sorted_images) == 1:
                # Tek görsel - tam boyut
                self._draw_single_image(canvas, sorted_images[0], top, height)
            elif len(sorted_images) == 2:
                # 2 görsel - yan yana
                self._draw_two_images(canvas, sorted_images, top, height)
            else:
                # 3+ görsel - büyük + küçükler
                self._draw_multiple_images(canvas, sorted_images, top, height)
                
        except Exception as e:
            logger.error(f"[IMAGES] Error: {e}")
    
    def _draw_single_image(self, canvas, img_path: str, top: int, height: int):
        """Tek görsel çiz - MAKSIMUM ALAN"""
        try:
            img = Image.open(img_path)
            
            # Boyutlandır - çok az padding
            target_width = self.width - (self.padding * 2)
            target_height = height - (self.padding * 2)
            
            img_resized = self._resize_with_aspect(img, target_width, target_height)
            
            # Ortala
            x = (self.width - img_resized.width) // 2
            y = top + (height - img_resized.height) // 2
            
            # Border radius ekle (küçük)
            img_rounded = self._add_rounded_corners(img_resized, 8)
            
            canvas.paste(img_rounded, (x, y), img_rounded if img_rounded.mode == 'RGBA' else None)
            
        except Exception as e:
            logger.error(f"[SINGLE IMAGE] Error: {e}")
    
    def _draw_two_images(self, canvas, images: List[str], top: int, height: int):
        """2 görsel yan yana - KOMPAKT"""
        try:
            gap = 5  # Çok küçük aralık
            img_width = (self.width - (self.padding * 2) - gap) // 2
            img_height = height - (self.padding * 2)
            
            for i, img_path in enumerate(images[:2]):
                img = Image.open(img_path)
                img_resized = self._resize_with_aspect(img, img_width, img_height)
                img_rounded = self._add_rounded_corners(img_resized, 6)
                
                x = self.padding + i * (img_width + gap)
                y = top + (height - img_resized.height) // 2
                
                canvas.paste(img_rounded, (x, y), img_rounded if img_rounded.mode == 'RGBA' else None)
                
        except Exception as e:
            logger.error(f"[TWO IMAGES] Error: {e}")
    
    def _draw_multiple_images(self, canvas, images: List[str], top: int, height: int):
        """3+ görsel - sol büyük TAM YÜKSEKLİK, sağ 2 küçük TAM BİTİŞİK"""
        try:
            # Sol büyük görsel - %60 genişlik, TAM YÜKSEKLİK
            left_width = int((self.width - (self.padding * 2) - self.image_gap) * 0.6)
            left_height = height - (self.padding * 2)
            
            # Sağ küçük görseller - kalan genişlik, TAM YÜKSEKLİK / 2
            right_width = self.width - left_width - (self.padding * 2) - self.image_gap
            right_height = (left_height - self.image_gap) // 2
            
            # Sol büyük görsel - TAM YÜKSEKLİK, cover fit
            main_img = Image.open(images[0])
            main_resized = self._resize_cover_fit(main_img, left_width, left_height)
            main_rounded = self._add_rounded_corners(main_resized, 8)
            
            main_x = self.padding
            main_y = top + self.padding
            canvas.paste(main_rounded, (main_x, main_y), main_rounded if main_rounded.mode == 'RGBA' else None)
            
            # Sağ üst görsel - TAM ÜSTE YASLANIR, cover fit
            if len(images) > 1:
                top_img = Image.open(images[1])
                top_resized = self._resize_cover_fit(top_img, right_width, right_height)
                top_rounded = self._add_rounded_corners(top_resized, 6)
                
                top_x = main_x + left_width + self.image_gap
                top_y = top + self.padding
                canvas.paste(top_rounded, (top_x, top_y), top_rounded if top_rounded.mode == 'RGBA' else None)
            
            # Sağ alt görsel - TAM ALTA YASLANIR, cover fit
            if len(images) > 2:
                bottom_img = Image.open(images[2])
                bottom_resized = self._resize_cover_fit(bottom_img, right_width, right_height)
                bottom_rounded = self._add_rounded_corners(bottom_resized, 6)
                
                bottom_x = main_x + left_width + self.image_gap
                bottom_y = top_y + right_height + self.image_gap
                canvas.paste(bottom_rounded, (bottom_x, bottom_y), bottom_rounded if bottom_rounded.mode == 'RGBA' else None)
                    
        except Exception as e:
            logger.error(f"[MULTIPLE IMAGES] Error: {e}")
    
    def _draw_bottom_info(self, canvas, draw, top: int, 
                           code: str, color: str, ptype: str, size: str, price: Optional[float],
                           code2: Optional[str], color2: Optional[str], ptype2: Optional[str], 
                           size2: Optional[str], price2: Optional[float], brand: str = ""):
        """Alt bilgi alanı - ŞABLON ÖRNEKLERİNE GÖRE TAM UYUMLU"""
        try:
            # ARKA PLAN - Açık gri (örneklerdeki gibi)
            draw.rectangle((0, top, self.width, self.height), fill=(245, 245, 245))
            
            # Font'lar
            font_logo = self._get_font(20, bold=True)    # Sol logo için BÜYÜK
            font_info = self._get_font(16, bold=True)     # Orta bilgiler için
            font_price = self._get_font(32, bold=True)    # Sağ fiyat için BÜYÜK
            
            padding = 12
            y_center = top + (self.bottom_height // 2)
            
            # 1. SOL: MARKA LOGOSU (büyük yuvarlatılmış çerçeve - örneklerdeki gibi)
            # Marka adını kullan (sabit "DZYN Line" yerine)
            if brand:
                # Marka adını kısalt (çok uzunsa)
                brand_words = brand.upper().split()
                if len(brand_words) >= 2:
                    logo_text = brand_words[0]
                    logo_subtext = " ".join(brand_words[1:])
                else:
                    logo_text = brand.upper()[:8]  # İlk 8 karakter
                    logo_subtext = ""
            else:
                logo_text = "BRAND"
                logo_subtext = ""
            
            bbox_logo = draw.textbbox((0, 0), logo_text, font=font_logo)
            logo_width = bbox_logo[2] - bbox_logo[0]
            logo_height = bbox_logo[3] - bbox_logo[1]
            
            # Logo kutusu - BÜYÜK (örneklerdeki gibi)
            box_size = 85  # Sabit boyut
            box_x1 = padding
            box_y1 = top + (self.bottom_height - box_size) // 2
            box_x2 = box_x1 + box_size
            box_y2 = box_y1 + box_size
            
            # Yuvarlatılmış beyaz çerçeve (siyah kenarlık)
            self._draw_rounded_rectangle(draw, (box_x1, box_y1, box_x2, box_y2), 
                                        25, fill=(255, 255, 255))
            # Siyah kenarlık
            self._draw_rounded_rectangle_outline(draw, (box_x1, box_y1, box_x2, box_y2), 
                                                 15, outline=(0, 0, 0), width=2)
            
            # Logo metni (ortalanmış)
            logo_font = self._get_font(18, bold=True)
            sub_font = self._get_font(10, bold=False)
            
            bbox_logo = draw.textbbox((0, 0), logo_text, font=logo_font)
            logo_w = bbox_logo[2] - bbox_logo[0]
            logo_x = box_x1 + (box_size - logo_w) // 2
            logo_y = box_y1 + 25
            
            draw.text((logo_x, logo_y), logo_text, font=logo_font, fill=(0, 0, 0))
            
            bbox_sub = draw.textbbox((0, 0), logo_subtext, font=sub_font)
            sub_w = bbox_sub[2] - bbox_sub[0]
            sub_x = box_x1 + (box_size - sub_w) // 2
            sub_y = logo_y + 22
            
            draw.text((sub_x, sub_y), logo_subtext, font=sub_font, fill=(80, 80, 80))
            
            # 2. ORTA: ÜRÜN BİLGİLERİ (TİP:KOD RENK BEDEN formatında)
            # Örnek: "JACKET:4121 ECRU 36-42" veya "SET:AN-8980 B BLACK-WHITE 42-48"
            info_parts = []
            
            if ptype and code:
                # TİP:KOD formatı
                info_parts.append(f"{ptype.upper()}:{code}")
            
            if color:
                info_parts.append(color.upper())
            
            if size:
                info_parts.append(size)
            
            info_text = " ".join(info_parts)
            
            # Metni ortala
            bbox_info = draw.textbbox((0, 0), info_text, font=font_info)
            info_width = bbox_info[2] - bbox_info[0]
            info_height = bbox_info[3] - bbox_info[1]
            
            info_x = (self.width - info_width) // 2
            info_y = y_center - (info_height // 2)
            
            draw.text((info_x, info_y), info_text, font=font_info, fill=(60, 60, 60))
            
            # Fiyat kutusu (sağ taraf)
            if price:
                price_text = f"{int(price)}$"
                price_box_size = 70
                price_box_x2 = self.width - padding
                price_box_x1 = price_box_x2 - price_box_size
                price_box_y1 = top + (self.bottom_height - price_box_size) // 2
                price_box_y2 = price_box_y1 + price_box_size
                
                # Fiyat kutusu arka planı
                self._draw_rounded_rectangle(draw, 
                                            (price_box_x1, price_box_y1, price_box_x2, price_box_y2),
                                            30, fill=(160, 142, 115))
                
                # Fiyat metni
                bbox_price = draw.textbbox((0, 0), price_text, font=font_price)
                price_w = bbox_price[2] - bbox_price[0]
                price_h = bbox_price[3] - bbox_price[1]
                
                price_x = price_box_x1 + (price_box_size - price_w) // 2
                price_y = price_box_y1 + (price_box_size - price_h) // 2
                
                draw.text((price_x, price_y), price_text, font=font_price, fill=(255, 255, 255))
                
        except Exception as e:
            logger.error(f"[BOTTOM INFO] Error: {e}")
    
    def _draw_brand_logo(self, canvas, draw, brand: str):
        """Marka logosu - alt sağ köşe, küçük"""
        try:
            font = self._get_font(14, bold=True)
            
            # Sadece marka adını küçük göster
            logo_text = brand.upper()
            
            bbox = draw.textbbox((0, 0), logo_text, font=font)
            text_width = bbox[2] - bbox[0]
            
            x = self.width - text_width - 30
            y = self.height - 50
            
            # Hafif gri
            draw.text((x, y), logo_text, font=font, fill=(150, 150, 150))
            
        except Exception as e:
            logger.error(f"[BRAND LOGO] Error: {e}")
    
    def _resize_with_aspect(self, img: Image.Image, max_width: int, max_height: int) -> Image.Image:
        """Aspect ratio koruyarak yeniden boyutlandır"""
        img_ratio = img.width / img.height
        target_ratio = max_width / max_height
        
        if img_ratio > target_ratio:
            # Genişlik sınırlayıcı
            new_width = max_width
            new_height = int(max_width / img_ratio)
        else:
            # Yükseklik sınırlayıcı
            new_height = max_height
            new_width = int(max_height * img_ratio)
        
        return img.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    def _resize_cover_fit(self, img: Image.Image, target_width: int, target_height: int) -> Image.Image:
        """Görseli TAM DOLDUR (cover fit) - kenarlardan kırpılır ama tam dolar"""
        img_ratio = img.width / img.height
        target_ratio = target_width / target_height
        
        if img_ratio > target_ratio:
            # Yüksekliğe göre ölçeklendir, genişlikten kırp
            new_height = target_height
            new_width = int(target_height * img_ratio)
        else:
            # Genişliğe göre ölçeklendir, yükseklikten kırp
            new_width = target_width
            new_height = int(target_width / img_ratio)
        
        img_resized = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # Merkezi kırp
        left = (new_width - target_width) // 2
        top = (new_height - target_height) // 2
        right = left + target_width
        bottom = top + target_height
        
        return img_resized.crop((left, top, right, bottom))
    
    def _add_rounded_corners(self, img: Image.Image, radius: int) -> Image.Image:
        """Yuvarlatılmış köşeler ekle"""
        try:
            # Mask oluştur
            mask = Image.new('L', img.size, 0)
            draw = ImageDraw.Draw(mask)
            draw.rounded_rectangle([(0, 0), img.size], radius, fill=255)
            
            # RGBA'ya çevir ve mask uygula
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            
            output = Image.new('RGBA', img.size, (255, 255, 255, 0))
            output.paste(img, (0, 0))
            output.putalpha(mask)
            
            return output
            
        except:
            return img
    
    def _draw_rounded_rectangle(self, draw, coords, radius: int, fill):
        """Yuvarlatılmış dikdörtgen çiz"""
        try:
            draw.rounded_rectangle(coords, radius, fill=fill)
        except:
            # Eski PIL versiyonları için fallback
            draw.rectangle(coords, fill=fill)
    
    def _draw_rounded_rectangle_outline(self, draw, coords, radius: int, outline, width: int):
        """Yuvarlatılmış dikdörtgen kenarlık çiz"""
        try:
            draw.rounded_rectangle(coords, radius, outline=outline, width=width)
        except:
            # Eski PIL versiyonları için fallback
            draw.rectangle(coords, outline=outline, width=width)


# Global instance
professional_collage_maker = ProfessionalCollageMaker()
