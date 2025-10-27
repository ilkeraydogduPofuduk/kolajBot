"""
Bunny CDN Storage Service
Handles file uploads to Bunny CDN with dynamic folder structure
"""

import os
import ftplib
import asyncio
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from io import BytesIO
import tempfile
from pathlib import Path

from core.logging import get_logger
from models.user import User
from models.brand import Brand

logger = get_logger('bunny_cdn_service')

class BunnyCDNService:
    """Service for handling Bunny CDN operations"""
    
    def __init__(self):
        # Bunny CDN FTP credentials
        self.hostname = "storage.bunnycdn.com"
        self.username = "kolajbot"
        self.password = "e65c54d3-f195-489e-a93e065a415a-caf5-406a"
        self.read_only_password = "0af62004-651e-4e32-8e5ee35ac5d3-50fd-4268"
        self.port = 21
        
        # CDN base URL for accessing files
        self.cdn_base_url = "https://kolajbot.b-cdn.net"
        
        logger.info("Bunny CDN Service initialized")
    
    def _get_ftp_connection(self, read_only: bool = False) -> ftplib.FTP:
        """Get FTP connection to Bunny CDN"""
        try:
            ftp = ftplib.FTP()
            ftp.connect(self.hostname, self.port)
            
            password = self.read_only_password if read_only else self.password
            ftp.login(self.username, password)
            
            # Set passive mode
            ftp.set_pasv(True)
            
            logger.info(f"FTP connection established (read_only: {read_only})")
            return ftp
            
        except Exception as e:
            logger.error(f"FTP connection failed: {e}")
            raise Exception(f"CDN connection failed: {e}")
    
    def _create_directory_structure(self, ftp: ftplib.FTP, path: str) -> bool:
        """Create directory structure on CDN"""
        try:
            # Split path and create each directory
            parts = path.strip('/').split('/')
            current_path = ""
            
            # Go to root first
            ftp.cwd("/")
            
            for part in parts:
                if not part:
                    continue
                    
                current_path = f"{current_path}/{part}" if current_path else part
                
                try:
                    # Try to change to directory
                    ftp.cwd(part)
                    logger.debug(f"Directory exists: {part}")
                except ftplib.error_perm:
                    # Directory doesn't exist, create it
                    try:
                        ftp.mkd(part)
                        ftp.cwd(part)
                        logger.info(f"Created directory: {part}")
                    except ftplib.error_perm as e:
                        if "exists" not in str(e).lower():
                            logger.error(f"Failed to create directory {part}: {e}")
                            # Try to continue anyway
                            try:
                                ftp.cwd(part)
                            except:
                                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Directory structure creation failed: {e}")
            return False
    
    def generate_folder_path(
        self, 
        brand: Brand, 
        user: User, 
        upload_date: datetime, 
        product_code: str, 
        color: str = None
    ) -> str:
        """
        Generate dynamic folder path: /marka/kullanıcı/tarih/ürün/renk/
        """
        try:
            # Sanitize brand name
            brand_name = self._sanitize_name(brand.name)
            
            # Get user identifier (use email or username)
            user_identifier = self._sanitize_name(user.email or user.username or str(user.id))
            
            # Format date as DD.MM.YYYY
            date_str = upload_date.strftime("%d.%m.%Y")
            
            # Sanitize product code
            product_code_clean = self._sanitize_name(product_code)
            
            # Build base path
            path_parts = [brand_name, user_identifier, date_str, product_code_clean]
            
            # Add color if provided
            if color:
                color_clean = self._sanitize_name(color)
                path_parts.append(color_clean)
            
            folder_path = "/".join(path_parts)
            logger.info(f"Generated folder path: {folder_path}")
            
            return folder_path
            
        except Exception as e:
            logger.error(f"Folder path generation failed: {e}")
            return f"uploads/{datetime.now().strftime('%Y%m%d')}"
    
    def _sanitize_name(self, name: str) -> str:
        """Sanitize name for use in file paths"""
        if not name:
            return "unknown"
        
        # Replace problematic characters
        sanitized = name.replace(" ", "_")
        sanitized = sanitized.replace("/", "_")
        sanitized = sanitized.replace("\\", "_")
        sanitized = sanitized.replace(":", "_")
        sanitized = sanitized.replace("*", "_")
        sanitized = sanitized.replace("?", "_")
        sanitized = sanitized.replace('"', "_")
        sanitized = sanitized.replace("<", "_")
        sanitized = sanitized.replace(">", "_")
        sanitized = sanitized.replace("|", "_")
        
        # Remove multiple underscores
        while "__" in sanitized:
            sanitized = sanitized.replace("__", "_")
        
        # Remove leading/trailing underscores
        sanitized = sanitized.strip("_")
        
        return sanitized or "unknown"
    
    async def upload_file(
        self, 
        file_content: bytes, 
        filename: str, 
        folder_path: str
    ) -> Tuple[bool, str, str]:
        """
        Upload single file to Bunny CDN
        Returns: (success, cdn_url, error_message)
        """
        try:
            # Get FTP connection
            ftp = self._get_ftp_connection()
            
            try:
                # Create directory structure
                if not self._create_directory_structure(ftp, folder_path):
                    return False, "", "Failed to create directory structure"
                
                # Navigate to target directory
                ftp.cwd(f"/{folder_path}")
                
                # Sanitize filename
                safe_filename = self._sanitize_name(filename)
                
                # Upload file using BytesIO
                file_buffer = BytesIO(file_content)
                ftp.storbinary(f'STOR {safe_filename}', file_buffer)
                
                # Generate CDN URL
                cdn_url = f"{self.cdn_base_url}/{folder_path}/{safe_filename}"
                
                logger.info(f"File uploaded successfully: {cdn_url}")
                return True, cdn_url, ""
                
            finally:
                ftp.quit()
                
        except Exception as e:
            logger.error(f"File upload failed: {e}")
            return False, "", str(e)
    
    async def upload_files_batch(
        self, 
        files_data: List[Dict[str, Any]], 
        brand: Brand, 
        user: User, 
        product_code: str, 
        color: str = None
    ) -> List[Dict[str, Any]]:
        """
        Upload multiple files to CDN
        files_data: [{"content": bytes, "filename": str}, ...]
        Returns: [{"success": bool, "filename": str, "cdn_url": str, "error": str}, ...]
        """
        try:
            upload_date = datetime.now()
            folder_path = self.generate_folder_path(brand, user, upload_date, product_code, color)
            
            results = []
            
            # Get FTP connection once for batch
            ftp = self._get_ftp_connection()
            
            try:
                # Create directory structure once
                if not self._create_directory_structure(ftp, folder_path):
                    # If directory creation fails, return errors for all files
                    return [{
                        "success": False,
                        "filename": file_data["filename"],
                        "cdn_url": "",
                        "error": "Failed to create directory structure"
                    } for file_data in files_data]
                
                # Navigate to target directory
                ftp.cwd(f"/{folder_path}")
                
                # Upload each file
                for file_data in files_data:
                    try:
                        filename = file_data["filename"]
                        content = file_data["content"]
                        
                        # Sanitize filename
                        safe_filename = self._sanitize_name(filename)
                        
                        # Upload file
                        file_buffer = BytesIO(content)
                        ftp.storbinary(f'STOR {safe_filename}', file_buffer)
                        
                        # Generate CDN URL
                        cdn_url = f"{self.cdn_base_url}/{folder_path}/{safe_filename}"
                        
                        results.append({
                            "success": True,
                            "filename": filename,
                            "safe_filename": safe_filename,
                            "cdn_url": cdn_url,
                            "folder_path": folder_path,
                            "error": ""
                        })
                        
                        logger.info(f"Batch upload success: {filename} -> {cdn_url}")
                        
                    except Exception as e:
                        logger.error(f"Batch upload failed for {file_data['filename']}: {e}")
                        results.append({
                            "success": False,
                            "filename": file_data["filename"],
                            "safe_filename": "",
                            "cdn_url": "",
                            "folder_path": folder_path,
                            "error": str(e)
                        })
                
            finally:
                ftp.quit()
            
            logger.info(f"Batch upload completed: {len([r for r in results if r['success']])}/{len(results)} successful")
            return results
            
        except Exception as e:
            logger.error(f"Batch upload failed: {e}")
            return [{
                "success": False,
                "filename": file_data["filename"],
                "cdn_url": "",
                "error": str(e)
            } for file_data in files_data]
    
    async def create_collage_folder(
        self, 
        brand: Brand, 
        user: User, 
        product_code: str, 
        color: str
    ) -> str:
        """
        Create collage folder and return path
        """
        try:
            upload_date = datetime.now()
            base_folder = self.generate_folder_path(brand, user, upload_date, product_code, color)
            collage_folder = f"{base_folder}/collages"
            
            # Create collage directory
            ftp = self._get_ftp_connection()
            try:
                if self._create_directory_structure(ftp, collage_folder):
                    logger.info(f"Collage folder created: {collage_folder}")
                    return collage_folder
                else:
                    logger.error(f"Failed to create collage folder: {collage_folder}")
                    return ""
            finally:
                ftp.quit()
                
        except Exception as e:
            logger.error(f"Collage folder creation failed: {e}")
            return ""
    
    def get_cdn_url(self, folder_path: str, filename: str) -> str:
        """Generate CDN URL for a file"""
        safe_filename = self._sanitize_name(filename)
        return f"{self.cdn_base_url}/{folder_path}/{safe_filename}"
    
    async def list_files(self, folder_path: str) -> List[str]:
        """List files in a CDN folder"""
        try:
            ftp = self._get_ftp_connection(read_only=True)
            try:
                ftp.cwd(f"/{folder_path}")
                files = ftp.nlst()
                logger.info(f"Listed {len(files)} files in {folder_path}")
                return files
            finally:
                ftp.quit()
        except Exception as e:
            logger.error(f"Failed to list files in {folder_path}: {e}")
            return []
    
    async def delete_file(self, folder_path: str, filename: str) -> bool:
        """Delete a file from CDN"""
        try:
            ftp = self._get_ftp_connection()
            try:
                ftp.cwd(f"/{folder_path}")
                safe_filename = self._sanitize_name(filename)
                ftp.delete(safe_filename)
                logger.info(f"Deleted file: {folder_path}/{safe_filename}")
                return True
            finally:
                ftp.quit()
        except Exception as e:
            logger.error(f"Failed to delete file {folder_path}/{filename}: {e}")
            return False

# Global instance
bunny_cdn_service = BunnyCDNService()
