"""
Enterprise-Level Directory Management Service
Gelişmiş klasör yapısı yönetimi
"""
import os
from datetime import datetime
from typing import Dict, Tuple
from models.user import User
from models.brand import Brand

class DirectoryManager:
    """
    Klasör yapısı:
    uploads/
        {brand_manager_username}/
            {brand_name}/
                {employee_username}/
                    {upload_date}/
                        {product_code}/
                            {color}/
                                tag.jpg
                                1.jpg
                                2.jpg
                            templates/
    """
    
    def __init__(self, base_path: str = None):
        if base_path is None:
            # Get project root directory (two levels up from backend/services)
            project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
            base_path = os.path.join(project_root, "uploads")
        self.base_path = base_path
        # Don't create directory on initialization, only when needed
        # self._ensure_base_exists()
    
    def _ensure_base_exists(self):
        """Base uploads dizinini oluştur (sadece gerektiğinde)"""
        if not os.path.exists(self.base_path):
            os.makedirs(self.base_path, exist_ok=True)
    
    def _sanitize_name(self, name: str) -> str:
        """Klasör adı için güvenli string"""
        # Türkçe karakterleri dönüştür
        replacements = {
            'ı': 'i', 'İ': 'I', 'ş': 's', 'Ş': 'S',
            'ğ': 'g', 'Ğ': 'G', 'ü': 'u', 'Ü': 'U',
            'ö': 'o', 'Ö': 'O', 'ç': 'c', 'Ç': 'C'
        }
        for old, new in replacements.items():
            name = name.replace(old, new)
        
        # Sadece alphanumeric ve - _ karakterleri
        return ''.join(c if c.isalnum() or c in '-_' else '_' for c in name)
    
    def create_upload_structure(
        self, 
        brand: Brand, 
        uploader: User, 
        brand_manager: User = None
    ) -> Tuple[str, str]:
        """
        Upload için klasör yapısını oluştur
        
        Returns:
            (base_path, upload_date)
        """
        # Tarih (DDMMYYYY)
        upload_date = datetime.now().strftime("%d%m%Y")
        
        # Brand manager (yoksa uploader kendisi)
        manager = brand_manager if brand_manager else uploader
        manager_username = self._sanitize_name(manager.username)
        
        # Brand name
        brand_name = self._sanitize_name(brand.name)
        
        # Employee username
        employee_username = self._sanitize_name(uploader.username)
        
        # Tam path
        path_parts = [
            self.base_path,
            manager_username,
            brand_name,
            employee_username,
            upload_date
        ]
        
        base_path = os.path.join(*path_parts)
        os.makedirs(base_path, exist_ok=True)
        
        return base_path, upload_date
    
    def create_product_directory(
        self, 
        base_path: str, 
        product_code: str, 
        color: str
    ) -> str:
        """
        Ürün için klasör oluştur (renk bazlı)
        
        Returns:
            product_color_path
        """
        product_code_clean = self._sanitize_name(product_code)
        color_clean = self._sanitize_name(color)
        
        product_path = os.path.join(base_path, product_code_clean, color_clean)
        os.makedirs(product_path, exist_ok=True)
        
        return product_path
    
    def create_template_directory(
        self, 
        base_path: str, 
        product_code: str
    ) -> str:
        """
        Şablon klasörü oluştur
        
        Returns:
            template_path
        """
        product_code_clean = self._sanitize_name(product_code)
        template_path = os.path.join(base_path, product_code_clean, "templates")
        os.makedirs(template_path, exist_ok=True)
        
        return template_path
    
    def get_relative_path(self, full_path: str) -> str:
        """
        Tam path'ten relative path al (DB'ye kaydetmek için)
        """
        if self.base_path in full_path:
            return full_path.replace(self.base_path, "").lstrip("/\\").replace("\\", "/")
        return full_path
    
    def organize_uploaded_files(
        self,
        uploaded_files: list,
        grouped_products: dict,
        base_path: str
    ) -> Dict:
        """
        Yüklenen dosyaları organize et
        
        Returns:
            {
                product_key: {
                    'path': product_color_path,
                    'files': [organized files]
                }
            }
        """
        organized = {}
        
        for product_key, product_group in grouped_products.items():
            code = product_group['code']
            color = product_group['color']
            
            # Ürün klasörü oluştur (renk bazlı)
            product_path = self.create_product_directory(base_path, code, color)
            
            # Dosyaları organize et
            organized_files = []
            
            # Etiket görseli
            if product_group['tag_images']:
                tag_file = product_group['tag_images'][0]
                # Dosyayı bul ve taşı
                for uf in uploaded_files:
                    if uf['original_filename'] == tag_file['filename']:
                        new_path = os.path.join(product_path, "tag.jpg")
                        if os.path.exists(uf['file_path']):
                            os.rename(uf['file_path'], new_path)
                        organized_files.append({
                            'type': 'tag',
                            'path': new_path,
                            'relative_path': self.get_relative_path(new_path),
                            'original_name': uf['original_filename']
                        })
                        break
            
            # Ürün görselleri
            for idx, img_data in enumerate(product_group['product_images'], 1):
                for uf in uploaded_files:
                    if uf['original_filename'] == img_data['filename']:
                        ext = os.path.splitext(uf['original_filename'])[1]
                        new_path = os.path.join(product_path, f"{idx}{ext}")
                        if os.path.exists(uf['file_path']):
                            os.rename(uf['file_path'], new_path)
                        organized_files.append({
                            'type': 'product',
                            'path': new_path,
                            'relative_path': self.get_relative_path(new_path),
                            'original_name': uf['original_filename'],
                            'angle': img_data['info']['angle']
                        })
                        break
            
            organized[product_key] = {
                'path': product_path,
                'relative_path': self.get_relative_path(product_path),
                'files': organized_files,
                'code': code,
                'color': color
            }
        
        return organized

