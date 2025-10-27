#!/usr/bin/env python3
"""
Dinamik e-posta gönderim servisi
Ayarları veritabanından alır, yoksa config'den fallback yapar
"""
import smtplib
import ssl
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict, Any
from datetime import datetime
from jinja2 import Environment, FileSystemLoader, Template
from sqlalchemy.orm import Session

# Türkçe karakterleri UTF-8 ile koru (HTML için)
def encode_turkish_html(text):
    if not text:
        return text
    # Türkçe karakterleri olduğu gibi bırak, UTF-8 encoding ile gönder
    return text

# Türkçe karakterleri UTF-8 ile koru (Text için de)
def encode_turkish_ascii(text):
    if not text:
        return text
    # Türkçe karakterleri olduğu gibi bırak, UTF-8 encoding ile gönder
    return text

class EmailService:
    def __init__(self, db: Optional[Session] = None):
        self.db = db
        self.jinja_env = Environment(
            loader=FileSystemLoader("templates"),
            autoescape=True
        )
        # Cache için
        self._settings_cache = None
        self._cache_timestamp = None
        self._cache_duration = 300  # 5 dakika cache
        
    def get_email_settings(self) -> Dict[str, Any]:
        """E-posta ayarlarını cache'den al veya veritabanından al"""
        
        # Cache kontrolü
        if self._settings_cache and self._cache_timestamp:
            from time import time
            if time() - self._cache_timestamp < self._cache_duration:
                return self._settings_cache
        
        # Cache yoksa veya süresi dolmuşsa veritabanından al
        settings = self._load_email_settings_from_db()
        
        # Cache'e kaydet
        self._settings_cache = settings
        from time import time
        self._cache_timestamp = time()
        
        return settings
    
    def _load_email_settings_from_db(self) -> Dict[str, Any]:
        """E-posta ayarlarını veritabanından yükle"""
        if self.db:
            try:
                from models.settings import Settings
                
                # Email kategorisindeki tüm ayarları al
                email_settings = self.db.query(Settings).filter(
                    Settings.category == 'email',
                    Settings.is_active == True
                ).all()
                
                settings_map = {}
                for setting in email_settings:
                    value = setting.value
                    # Şifrelenmiş veriler için decrypt
                    if setting.is_sensitive and value:
                        try:
                            from utils.security import decrypt_sensitive_data
                            value = decrypt_sensitive_data(value)
                        except:
                            value = setting.value  # Decrypt başarısızsa orijinal değeri kullan
                    settings_map[setting.key] = value
                        
                # Eğer temel ayarlar varsa kullan
                if all(key in settings_map for key in ['smtp_server', 'smtp_username', 'smtp_password', 'from_email']) and settings_map['smtp_server']:
                    email_config = {
                        'smtp_server': settings_map.get('smtp_server'),
                        'smtp_port': int(settings_map.get('smtp_port', 587)),
                        'smtp_username': settings_map.get('smtp_username'),
                        'smtp_password': settings_map.get('smtp_password'),
                        'smtp_use_tls': settings_map.get('smtp_use_tls', 'true').lower() == 'true',
                        'smtp_use_ssl': settings_map.get('smtp_use_ssl', 'false').lower() == 'true',
                        'from_email': settings_map.get('from_email'),
                        'from_name': settings_map.get('from_name', 'Pofuduk Dijital'),
                        'company_name': settings_map.get('company_name', 'Pofuduk Dijital'),
                        'support_email': settings_map.get('support_email', 'info@pofudukdijital.com'),
                        'support_phone': settings_map.get('support_phone', '+90 551 376 12 17'),
                        'enabled': settings_map.get('enabled', 'true').lower() == 'true',
                        'source': 'database'
                    }
                    
                    # Debug bilgisi - sadece ilk yüklemede göster
                    if not self._settings_cache:
                        print("VERITABANINDAN E-POSTA AYARLARI ALINDI:")
                        print(f"   Server: {email_config['smtp_server']}")
                        print(f"   Port: {email_config['smtp_port']}")
                        print(f"   Username: {email_config['smtp_username']}")
                        print(f"   From Email: {email_config['from_email']}")
                        print(f"   TLS: {email_config['smtp_use_tls']}")
                        print(f"   SSL: {email_config['smtp_use_ssl']}")
                    
                    return email_config
            except Exception as e:
                print(f"WARNING - Veritabanindan e-posta ayarlari alinamadi: {e}")
        
        # Fallback: Environment variables veya default değerler
        from config.settings import settings
        return {
            'smtp_server': getattr(settings, 'SMTP_SERVER', None),
            'smtp_port': getattr(settings, 'SMTP_PORT', 587),
            'smtp_username': getattr(settings, 'SMTP_USERNAME', None),
            'smtp_password': getattr(settings, 'SMTP_PASSWORD', None),
            'from_email': getattr(settings, 'FROM_EMAIL', None),
            'from_name': 'Pofuduk Dijital',
            'company_name': 'Pofuduk Dijital',
            'support_email': 'destek@pofuduk.digital',
            'support_phone': '+90 551 376 12 17',
            'source': 'config'
        }
        
    def is_configured(self) -> bool:
        """E-posta ayarları yapılandırılmış mı?"""
        settings = self.get_email_settings()
        return all([
            settings.get('smtp_server'),
            settings.get('smtp_username'),
            settings.get('smtp_password'),
            settings.get('from_email')
        ])
    
    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """E-posta gönder"""
        
        settings = self.get_email_settings()
        
        if not self.is_configured():
            print("WARNING - E-posta ayarlari yapilandirilmamis, konsol ciktisi:")
            print("=" * 50)
            print(f"E-POSTA SIMULASYONU")
            print("=" * 50)
            print(f"Alici: {to_email}")
            print(f"Konu: {subject}")
            print(f"Gonderen: {settings.get('from_email', 'Yapilandirilmamis')}")
            print(f"Sirket: {settings.get('company_name', 'Pofuduk Dijital')}")
            print("=" * 50)
            print(f"HTML Icerik:\n{html_content[:200]}...")
            print("=" * 50)
            return True
        
        try:
            # E-posta mesajı oluştur
            msg = MIMEMultipart("alternative")
            msg.set_charset('utf-8')
            
            # UTF-8 encoding için header'ları düzgün ayarla
            from email.header import Header
            msg["Subject"] = Header(subject, 'utf-8')
            msg["From"] = Header(f"{settings['from_name']} <{settings['from_email']}>", 'utf-8')
            msg["To"] = to_email
            
            # Text kısmı
            if text_content:
                part1 = MIMEText(text_content, "plain", "utf-8")
                part1.set_charset('utf-8')
                msg.attach(part1)
            
            # HTML kısmı
            part2 = MIMEText(html_content, "html", "utf-8")
            part2.set_charset('utf-8')
            msg.attach(part2)
            
            # SSL/TLS bağlantısı kur ve gönder
            context = ssl.create_default_context()
            # Kendiliğinden imzalı sertifikalar için doğrulamayı devre dışı bırak
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE
            
            # Port bazlı otomatik seçim
            port = settings['smtp_port']
            print(f"Email gonderimi baslatiliyor...")
            print(f"   Sunucu: {settings['smtp_server']}:{port}")
            print(f"   Kullanici: {settings['smtp_username']}")
            print(f"   Alici: {to_email}")
            
            if port == 465 or settings.get('smtp_use_ssl', False):
                # SSL ile bağlan (port 465)
                print(f"SSL baglantisi kuruluyor: {settings['smtp_server']}:{port}")
                with smtplib.SMTP_SSL(settings['smtp_server'], port, context=context, timeout=30) as server:
                    print("Kimlik dogrulama yapiliyor...")
                    server.login(settings['smtp_username'], settings['smtp_password'])
                    print("Email gonderiliyor...")
                    server.sendmail(settings['from_email'], to_email, msg.as_string())
            else:
                # TLS ile bağlan (port 587) veya plain (port 25)
                print(f"Baglanti kuruluyor: {settings['smtp_server']}:{port}")
                with smtplib.SMTP(settings['smtp_server'], port, timeout=30) as server:
                    if settings.get('smtp_use_tls', False):
                        print("TLS baslatiliyor...")
                        server.starttls(context=context)
                    print("Kimlik dogrulama yapiliyor...")
                    server.login(settings['smtp_username'], settings['smtp_password'])
                    print("Email gonderiliyor...")
                    server.sendmail(settings['from_email'], to_email, msg.as_string())
            
            print(f"OK - E-posta basariyla gonderildi: {to_email}")
            return True
            
        except Exception as e:
            print(f"ERROR - E-posta gonderim hatasi: {e}")
            print(f"   Hata turu: {type(e).__name__}")
            return False
    
    def send_welcome_employee_email(
        self, 
        email: str, 
        first_name: str, 
        last_name: str, 
        password: str, 
        brand_name: str = "Pofuduk Dijital",
        role_name: str = "Çalışan",
        manager_name: str = "Sistem Yöneticisi",
        approver_name: str = "Sistem Yöneticisi"
    ) -> bool:
        """Yeni çalışana hoş geldin e-postası - Modern template ile"""
        
        settings = self.get_email_settings()
        subject = f"Pofuduk Dijital - Hoş Geldiniz!"
        
        try:
            # HTML template dosyasını kullan
            template = self.jinja_env.get_template('welcome_employee.html')
            
            # Template değişkenleri
            template_vars = {
                'first_name': first_name,
                'last_name': last_name,
                'email': email,
                'password': password,
                'brand_names': brand_name,  # Template'de brand_names kullanılıyor
                'role_name': role_name,
                'manager_name': manager_name,  # Talep eden kişi
                'approver_name': approver_name,  # Onaylayan kişi
                'support_phone': settings.get('support_phone', ''),
                'current_year': datetime.now().year
            }
            
            html_content = template.render(**template_vars).encode('utf-8').decode('utf-8')
            
            # Text versiyonu
            text_content = f"""
Hoş Geldiniz {first_name} {last_name}!

Pofuduk Dijital ailesine hoş geldiniz! {manager_name} tarafından {brand_name} markasına {role_name} olarak atandınız.
Bu atama {approver_name} tarafından onaylanmıştır.

Giriş Bilgileriniz:
E-posta: {email}
Geçici Şifre: {password}
Marka: {brand_name}
Rol: {role_name}

Bu geçici şifreyi ilk giriş yaptıktan sonra mutlaka değiştirin. Şifrenizi kimseyle paylaşmayın.

Herhangi bir sorunuz varsa sistem yöneticisi ile iletişime geçebilirsiniz.

Bu e-posta Pofuduk Dijital tarafından otomatik olarak gönderilmiştir.
© {datetime.now().year} Pofuduk Dijital. Tüm hakları saklıdır.
            """
            
            return self.send_email(email, subject, html_content, text_content.strip())
            
        except Exception as e:
            print(f"❌ Welcome email template hatası: {e}")
            return False
    
    def send_invitation_email(self, email: str, first_name: str, invitation_link: str) -> bool:
        """Davet e-postası gönder"""
        
        subject = "Pofuduk Dijital - Davet"
        
        html_template = Template("""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>{{ subject }}</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f0fdf4; padding: 30px; border-radius: 0 0 8px 8px; }
                .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📬 Davet</h1>
                    <p>Pofuduk Dijital'e katılmaya davetlisiniz</p>
                </div>
                
                <div class="content">
                    <h2>Merhaba {{ first_name }}!</h2>
                    
                    <p>Pofuduk Dijital sistemine katılmanız için davet edildıniz. Aşağıdaki linke tıklayarak hesabınızı oluşturabilirsiniz.</p>
                    
                    <a href="{{ invitation_link }}" class="button">🎯 Daveti Kabul Et</a>
                    
                    <p><strong>⏰ Önemli:</strong> Bu davet linki sınırlı süre geçerlidir. Lütfen en kısa sürede daveti kabul edin.</p>
                    
                    <p>Herhangi bir sorunuz varsa lütfen davet eden kişi ile iletişime geçin.</p>
                </div>
                
                <div class="footer">
                    <p>Bu e-posta otomatik olarak gönderilmiştir.</p>
                    <p>© {{ current_year }} Pofuduk Dijital. Tüm hakları saklıdır.</p>
                </div>
            </div>
        </body>
        </html>
        """)
        
        text_content = f"""
Merhaba {first_name}!

Pofuduk Dijital sistemine katılmanız için davet edildıniz.

Davet Linki: {invitation_link}

Bu davet linki sınırlı süre geçerlidir. Lütfen en kısa sürede daveti kabul edin.

Herhangi bir sorunuz varsa lütfen davet eden kişi ile iletişime geçin.

Bu e-posta otomatik olarak gönderilmiştir.
© 2025 Pofuduk Dijital. Tüm hakları saklıdır.
        """
        
        from datetime import datetime
        html_content = html_template.render(
            subject=subject,
            first_name=first_name,
            invitation_link=invitation_link,
            current_year=datetime.now().year
        )
        
        return self.send_email(email, subject, html_content, text_content)
    
    def send_password_reset_email(self, email: str, first_name: str, reset_link: str) -> bool:
        """Şifre sıfırlama e-postası"""
        
        subject = "Pofuduk Dijital - Şifre Sıfırlama"
        
        html_template = Template("""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>{{ subject }}</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #fef2f2; padding: 30px; border-radius: 0 0 8px 8px; }
                .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 Şifre Sıfırlama</h1>
                    <p>Şifrenizi sıfırlama talebiniz</p>
                </div>
                
                <div class="content">
                    <h2>Merhaba {{ first_name }}!</h2>
                    
                    <p>Hesabınız için şifre sıfırlama talebinde bulundunuz. Aşağıdaki linke tıklayarak yeni şifrenizi belirleyebilirsiniz.</p>
                    
                    <a href="{{ reset_link }}" class="button">🔄 Şifremi Sıfırla</a>
                    
                    <p><strong>⏰ Önemli:</strong> Bu link 1 saat geçerlidir. Süre dolmadan şifrenizi sıfırlamanız gerekmektedir.</p>
                    
                    <p><strong>🔒 Güvenlik:</strong> Eğer bu talebi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz. Hesabınız güvende kalacaktır.</p>
                </div>
                
                <div class="footer">
                    <p>Bu e-posta otomatik olarak gönderilmiştir.</p>
                    <p>© {{ current_year }} Pofuduk Dijital. Tüm hakları saklıdır.</p>
                </div>
            </div>
        </body>
        </html>
        """)
        
        text_content = f"""
Merhaba {first_name}!

Hesabınız için şifre sıfırlama talebinde bulundunuz.

Şifre Sıfırlama Linki: {reset_link}

Bu link 1 saat geçerlidir. Süre dolmadan şifrenizi sıfırlamanız gerekmektedir.

Eğer bu talebi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz. Hesabınız güvende kalacaktır.

Bu e-posta otomatik olarak gönderilmiştir.
© 2025 Pofuduk Dijital. Tüm hakları saklıdır.
        """
        
        from datetime import datetime
        html_content = html_template.render(
            subject=subject,
            first_name=first_name,
            reset_link=reset_link,
            current_year=datetime.now().year
        )
        
        return self.send_email(email, subject, html_content, text_content)

    def send_welcome_employee_email_old(self, email: str, first_name: str, last_name: str, password: str, brand_name: str, role_name: str) -> bool:
        """Yeni çalışan hoşgeldin e-postası - DEPRECATED"""
        
        subject = "Pofuduk Dijital - Hesabınız Onaylandı!"
        
        html_template = Template("""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>{{ subject }}</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f0fdf4; padding: 30px; border-radius: 0 0 8px 8px; }
                .credentials { background: #ecfdf5; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #059669; }
                .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
                .warning { background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Hoş Geldiniz!</h1>
                    <p>Çalışan talebiniz onaylandı</p>
                </div>
                
                <div class="content">
                    <h2>Merhaba {{ first_name }} {{ last_name }}!</h2>
                    
                    <p><strong>{{ brand_name }}</strong> markası için <strong>{{ role_name }}</strong> rolünde çalışan talebiniz başarıyla onaylandı!</p>
                    
                    <div class="credentials">
                        <h3>🔑 Giriş Bilgileriniz:</h3>
                        <p><strong>E-posta:</strong> {{ email }}</p>
                        <p><strong>Geçici Şifre:</strong> <code style="background: #e5e7eb; padding: 4px 8px; border-radius: 4px;">{{ password }}</code></p>
                    </div>
                    
                    <div class="warning">
                        <p><strong>⚠️ Önemli Güvenlik Uyarısı:</strong></p>
                        <p>İlk giriş yaptığınızda şifrenizi mutlaka değiştirin! Bu geçici şifre güvenlik amacıyla oluşturulmuştur.</p>
                    </div>
                    
                    <p>Sisteme giriş yapmak için aşağıdaki linke tıklayabilirsiniz:</p>
                    
                    <a href="#" class="button">🚀 Sisteme Giriş Yap</a>
                    
                    <p><strong>📋 Görevleriniz:</strong></p>
                    <ul>
                        <li>İlk giriş yaptığınızda şifrenizi değiştirin</li>
                        <li>Profil bilgilerinizi güncelleyin</li>
                        <li>Size atanan markaları inceleyin</li>
                        <li>Sosyal medya hesaplarınızı bağlayın</li>
                    </ul>
                    
                    <p>Herhangi bir sorunuz olursa, yöneticinizle iletişime geçebilirsiniz.</p>
                </div>
                
                <div class="footer">
                    <p>Bu e-posta otomatik olarak gönderilmiştir.</p>
                    <p>© {{ current_year }} Pofuduk Dijital. Tüm hakları saklıdır.</p>
                </div>
            </div>
        </body>
        </html>
        """)
        
        text_content = f"""
Merhaba {first_name} {last_name}!

{brand_name} markası için {role_name} rolünde çalışan talebiniz başarıyla onaylandı!

Giriş Bilgileriniz:
E-posta: {email}
Geçici Şifre: {password}

ÖNEMLİ: İlk giriş yaptığınızda şifrenizi mutlaka değiştirin!

Görevleriniz:
- İlk giriş yaptığınızda şifrenizi değiştirin
- Profil bilgilerinizi güncelleyin
- Size atanan markaları inceleyin
- Sosyal medya hesaplarınızı bağlayın

Herhangi bir sorunuz olursa, yöneticinizle iletişime geçebilirsiniz.

© {datetime.now().year} Pofuduk Dijital. Tüm hakları saklıdır.
        """
        
        from datetime import datetime
        html_content = html_template.render(
            subject=subject,
            first_name=first_name,
            last_name=last_name,
            email=email,
            password=password,
            brand_name=brand_name,
            role_name=role_name,
            current_year=datetime.now().year
        )
        
        return self.send_email(email, subject, html_content, text_content)

    def send_request_rejected_email(self, email: str, first_name: str, last_name: str, brand_name: str, rejection_reason: str) -> bool:
        """Çalışan talebi reddedildi e-postası"""
        
        subject = "Pofuduk Dijital - Çalışan Talebi Hakkında"
        
        html_template = Template("""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>{{ subject }}</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #fef2f2; padding: 30px; border-radius: 0 0 8px 8px; }
                .reason-box { background: #fef3c7; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b; }
                .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📋 Talep Durumu</h1>
                    <p>Çalışan talebiniz hakkında bilgi</p>
                </div>
                
                <div class="content">
                    <h2>Merhaba {{ first_name }} {{ last_name }}!</h2>
                    
                    <p><strong>{{ brand_name }}</strong> markası için çalışan talebiniz hakkında sizinle iletişime geçmek istiyoruz.</p>
                    
                    <div class="reason-box">
                        <h3>📝 Değerlendirme Sonucu:</h3>
                        <p><strong>Neden:</strong> {{ rejection_reason }}</p>
                    </div>
                    
                    <p>Bu karar, mevcut iş yükü, pozisyon gereksinimleri ve diğer faktörler göz önünde bulundurularak alınmıştır.</p>
                    
                    <p>Gelecekte farklı pozisyonlar için tekrar başvurabilirsiniz. İlginiz için teşekkür ederiz.</p>
                    
                    <p>Herhangi bir sorunuz olursa, yöneticimizle iletişime geçebilirsiniz.</p>
                </div>
                
                <div class="footer">
                    <p>Bu e-posta otomatik olarak gönderilmiştir.</p>
                    <p>© {{ current_year }} Pofuduk Dijital. Tüm hakları saklıdır.</p>
                </div>
            </div>
        </body>
        </html>
        """)
        
        text_content = f"""
Merhaba {first_name} {last_name}!

{brand_name} markası için çalışan talebiniz hakkında sizinle iletişime geçmek istiyoruz.

Değerlendirme Sonucu:
Neden: {rejection_reason}

Bu karar, mevcut iş yükü, pozisyon gereksinimleri ve diğer faktörler göz önünde bulundurularak alınmıştır.

Gelecekte farklı pozisyonlar için tekrar başvurabilirsiniz. İlginiz için teşekkür ederiz.

Herhangi bir sorunuz olursa, yöneticimizle iletişime geçebilirsiniz.

© {datetime.now().year} Pofuduk Dijital. Tüm hakları saklıdır.
        """
        
        from datetime import datetime
        html_content = html_template.render(
            subject=subject,
            first_name=first_name,
            last_name=last_name,
            brand_name=brand_name,
            rejection_reason=rejection_reason,
            current_year=datetime.now().year
        )
        
        return self.send_email(email, subject, html_content, text_content)
    
    def send_password_changed_email(
        self, 
        email: str, 
        first_name: str, 
        last_name: str,
        change_date: str,
        change_time: str,
        ip_address: str = "Bilinmiyor",
        user_agent: str = "Bilinmiyor"
    ) -> bool:
        """Şifre değişikliği bildirim e-postası"""
        
        settings = self.get_email_settings()
        subject = "Pofuduk Dijital - Şifre Değişikliği Bildirimi"
        
        try:
            # HTML template dosyasını kullan
            template = self.jinja_env.get_template('password_changed.html')
            
            # Template değişkenleri
            template_vars = {
                'first_name': first_name,  # Türkçe karakterleri olduğu gibi bırak
                'last_name': last_name,    # Türkçe karakterleri olduğu gibi bırak
                'email': email,
                'change_date': change_date,
                'change_time': change_time,
                'ip_address': ip_address,
                'user_agent': user_agent,
                'support_phone': settings.get('support_phone', ''),
                'current_year': datetime.now().year
            }
            
            html_content = template.render(**template_vars).encode('utf-8').decode('utf-8')
            
            # Text versiyonu
            text_content = f"""
Şifre Değişikliği Bildirimi

Merhaba {first_name} {last_name}!

Hesabınızda şifre değişikliği yapıldığını bildirmek istiyoruz.

Değişiklik Detayları:
- Tarih: {change_date}
- Saat: {change_time}
- IP Adresi: {ip_address}
- Cihaz: {user_agent}

GÜVENLİK UYARISI:
Bu değişikliği siz yapmadıysanız:
- Hemen sistem yöneticisi ile iletişime geçin
- Hesabınızın güvenliğini kontrol edin
- Şüpheli aktiviteleri bildirin

Güvenlik Önlemleri:
- Tüm açık oturumlarınız sonlandırıldı
- Yeni şifrenizle tekrar giriş yapmanız gerekiyor
- Şifrenizi kimseyle paylaşmayın
- Güçlü ve benzersiz şifreler kullanın

Herhangi bir sorunuz olursa, sistem yöneticisi ile iletişime geçebilirsiniz.

Bu e-posta otomatik olarak gönderilmiştir.
© {datetime.now().year} Pofuduk Dijital. Tüm hakları saklıdır.
            """
            
            return self.send_email(email, subject, html_content, text_content.strip())
            
        except Exception as e:
            print(f"❌ Password changed email template hatası: {e}")
            return False

# Global instance
email_service = EmailService()
