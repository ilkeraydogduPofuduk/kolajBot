import secrets
import string
from typing import Tuple


class PasswordGenerator:
    """Güvenli ve okunabilir şifre üretici"""
    
    # Karışık harfler ve rakamlar (karıştırılabilecek karakterler hariç)
    SAFE_LOWERCASE = "abcdefghijkmnpqrstuvwxyz"  # l, o hariç
    SAFE_UPPERCASE = "ABCDEFGHJKLMNPQRSTUVWXYZ"  # I, O hariç  
    SAFE_DIGITS = "23456789"  # 0, 1 hariç
    SAFE_SYMBOLS = "@#$%&*+"  # Güvenli semboller
    
    @staticmethod
    def generate_medium_password(length: int = 12) -> str:
        """
        Orta zorlukta şifre üretir
        - En az 1 büyük harf
        - En az 1 küçük harf  
        - En az 2 rakam
        - En az 1 sembol
        - Karıştırılabilecek karakterler yok (0, O, l, I, 1)
        """
        if length < 8:
            length = 8
        elif length > 20:
            length = 20
            
        # Minimum gereksinimler
        password_chars = [
            secrets.choice(PasswordGenerator.SAFE_UPPERCASE),  # 1 büyük harf
            secrets.choice(PasswordGenerator.SAFE_LOWERCASE),  # 1 küçük harf
            secrets.choice(PasswordGenerator.SAFE_DIGITS),     # 1 rakam
            secrets.choice(PasswordGenerator.SAFE_DIGITS),     # 2. rakam
            secrets.choice(PasswordGenerator.SAFE_SYMBOLS),    # 1 sembol
        ]
        
        # Kalan karakterleri rastgele doldur
        all_chars = (
            PasswordGenerator.SAFE_LOWERCASE + 
            PasswordGenerator.SAFE_UPPERCASE + 
            PasswordGenerator.SAFE_DIGITS + 
            PasswordGenerator.SAFE_SYMBOLS
        )
        
        for _ in range(length - len(password_chars)):
            password_chars.append(secrets.choice(all_chars))
        
        # Karıştır
        secrets.SystemRandom().shuffle(password_chars)
        
        return ''.join(password_chars)
    
    @staticmethod
    def generate_simple_password(length: int = 10) -> str:
        """
        Basit şifre üretir (sadece harf ve rakam)
        - En az 1 büyük harf
        - En az 1 küçük harf
        - En az 2 rakam
        """
        if length < 6:
            length = 6
        elif length > 16:
            length = 16
            
        # Minimum gereksinimler
        password_chars = [
            secrets.choice(PasswordGenerator.SAFE_UPPERCASE),  # 1 büyük harf
            secrets.choice(PasswordGenerator.SAFE_LOWERCASE),  # 1 küçük harf
            secrets.choice(PasswordGenerator.SAFE_DIGITS),     # 1 rakam
            secrets.choice(PasswordGenerator.SAFE_DIGITS),     # 2. rakam
        ]
        
        # Kalan karakterleri rastgele doldur
        all_chars = (
            PasswordGenerator.SAFE_LOWERCASE + 
            PasswordGenerator.SAFE_UPPERCASE + 
            PasswordGenerator.SAFE_DIGITS
        )
        
        for _ in range(length - len(password_chars)):
            password_chars.append(secrets.choice(all_chars))
        
        # Karıştır
        secrets.SystemRandom().shuffle(password_chars)
        
        return ''.join(password_chars)
    
    @staticmethod
    def check_password_strength(password: str) -> Tuple[int, str]:
        """
        Şifre gücünü kontrol eder
        Returns: (score 0-5, description)
        """
        score = 0
        issues = []
        
        if len(password) >= 8:
            score += 1
        else:
            issues.append("En az 8 karakter olmalı")
            
        if any(c in PasswordGenerator.SAFE_LOWERCASE for c in password):
            score += 1
        else:
            issues.append("Küçük harf içermeli")
            
        if any(c in PasswordGenerator.SAFE_UPPERCASE for c in password):
            score += 1
        else:
            issues.append("Büyük harf içermeli")
            
        if any(c in PasswordGenerator.SAFE_DIGITS for c in password):
            score += 1
        else:
            issues.append("Rakam içermeli")
            
        if any(c in PasswordGenerator.SAFE_SYMBOLS for c in password):
            score += 1
        else:
            issues.append("Sembol içermeli")
        
        if score >= 4:
            return score, "Güçlü şifre"
        elif score >= 3:
            return score, "Orta güçlükte şifre"
        elif score >= 2:
            return score, "Zayıf şifre"
        else:
            return score, f"Çok zayıf şifre: {', '.join(issues)}"


# Test fonksiyonu
if __name__ == "__main__":
    print("=== ŞİFRE ÜRETME TESTİ ===")
    
    print("\n1. Orta zorlukta şifreler:")
    for i in range(5):
        password = PasswordGenerator.generate_medium_password(12)
        score, desc = PasswordGenerator.check_password_strength(password)
        print(f"   {password} - {desc} ({score}/5)")
    
    print("\n2. Basit şifreler:")
    for i in range(3):
        password = PasswordGenerator.generate_simple_password(10)
        score, desc = PasswordGenerator.check_password_strength(password)
        print(f"   {password} - {desc} ({score}/5)")
