# kolajBot

Pofuduk Dijital otomatik kolaj botu.

## Yeni MVC Uygulama Katmanı

`backend_mvc` dizini altında projenin yeniden yapılandırılmış MVC/OOP mimarisi bulunmaktadır. Uygulama FastAPI ile yazılmış olup yeni `ApplicationBuilder` sınıfı sayesinde modern bağımlılık yönetimi, CORS/TrustedHost ayarları ve mevcut legacy modüllerin entegrasyonu tek merkezden yönetilir.

Uygulamayı çalıştırmak için:

```bash
uvicorn backend_mvc.app.main:app --reload
```

Yeni katman, kimlik doğrulama uçlarını yeni MVC yapısı ile sunarken diğer domain modülleri legacy uygulama üzerinden sorunsuz şekilde çalışmaya devam eder.
