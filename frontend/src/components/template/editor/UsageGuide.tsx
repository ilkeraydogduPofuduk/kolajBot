import React, { useState } from 'react';
import { 
  BookOpen, Play, ChevronRight, ChevronDown, 
  Lightbulb, Target, Zap, Users, Settings,
  Palette, Type, Image, Layers, Eye, Download
} from 'lucide-react';

interface UsageGuideProps {
  onClose: () => void;
}

const UsageGuide: React.FC<UsageGuideProps> = ({ onClose }) => {
  const [activeSection, setActiveSection] = useState<string | null>('getting-started');
  const [activeStep, setActiveStep] = useState<number>(0);

  const sections = [
    {
      id: 'getting-started',
      title: 'Başlangıç',
      icon: Play,
      color: 'bg-green-100 text-green-700',
      steps: [
        {
          title: 'Şablon Oluşturmaya Başlayın',
          description: 'Sol panelden "Kategoriler" sekmesine tıklayın ve bir kategori seçin.',
          details: [
            'E-ticaret, Moda, Yemek gibi 15+ kategori mevcut',
            'Her kategorinin alt kategorileri var',
            'Kategori seçimi şablonunuzun temelini oluşturur'
          ]
        },
        {
          title: 'Dinamik Alanlar Ekleyin',
          description: '"Alanlar" sekmesinden placeholder\'lar ekleyin.',
          details: [
            'Ürün bilgileri: {{product.name}}, {{product.price}}',
            'Marka bilgileri: {{brand.name}}, {{brand.logo}}',
            'İletişim bilgileri: {{contact.phone}}, {{contact.email}}',
            'Özel alanlar oluşturabilirsiniz'
          ]
        },
        {
          title: 'Tasarım Yapın',
          description: 'Canvas üzerinde şablonunuzu tasarlayın.',
          details: [
            'Metin, şekil, görsel ekleyin',
            'Renkler, fontlar, boyutlar ayarlayın',
            'Katmanları düzenleyin',
            'AI ile otomatik tasarım oluşturun'
          ]
        }
      ]
    },
    {
      id: 'dynamic-fields',
      title: 'Dinamik Alanlar',
      icon: Target,
      color: 'bg-blue-100 text-blue-700',
      steps: [
        {
          title: 'Placeholder Sistemi',
          description: 'Dinamik alanlar şablonunuzun değişken kısımlarını temsil eder.',
          details: [
            '{{product.name}} - Ürün adı',
            '{{product.price}} - Ürün fiyatı',
            '{{brand.logo}} - Marka logosu',
            '{{contact.phone}} - İletişim telefonu'
          ]
        },
        {
          title: 'Alan Kategorileri',
          description: 'Alanlar kategorilere ayrılmıştır.',
          details: [
            'Ürün: Ürünle ilgili tüm bilgiler',
            'Marka: Marka bilgileri ve logolar',
            'İletişim: Telefon, email, adres',
            'Genel: Tarih, kullanıcı adı vb.'
          ]
        },
        {
          title: 'Validasyon Kuralları',
          description: 'Her alan için doğrulama kuralları belirleyebilirsiniz.',
          details: [
            'Zorunlu alanlar işaretlenebilir',
            'Minimum/maksimum değerler',
            'Format kontrolü (email, telefon)',
            'Hata mesajları özelleştirilebilir'
          ]
        }
      ]
    },
    {
      id: 'brand-assignment',
      title: 'Marka Ataması',
      icon: Users,
      color: 'bg-purple-100 text-purple-700',
      steps: [
        {
          title: 'Marka Seçimi',
          description: '"Markalar" sekmesinden şablonunuzu atayacağınız markaları seçin.',
          details: [
            'Marka listesini görüntüleyin',
            'Kategoriye göre filtreleyin',
            'Arama yapın',
            'Çoklu seçim yapın'
          ]
        },
        {
          title: 'Atama İşlemi',
          description: 'Seçili markalara şablonunuzu atayın.',
          details: [
            'Markalar şablonu kullanabilir',
            'Kendi verilerini girebilir',
            'Otomatik içerik üretebilir',
            'İstatistikleri takip edebilir'
          ]
        },
        {
          title: 'Yetki Yönetimi',
          description: 'Hangi markaların şablonu görebileceğini kontrol edin.',
          details: [
            'Genel: Tüm markalar görebilir',
            'Özel: Sadece atanan markalar',
            'Marka Özel: Sadece belirli markalar',
            'Admin kontrolü'
          ]
        }
      ]
    },
    {
      id: 'data-binding',
      title: 'Veri Bağlama',
      icon: Zap,
      color: 'bg-yellow-100 text-yellow-700',
      steps: [
        {
          title: 'Veri Girişi',
          description: '"Veri" sekmesinden placeholder\'ları gerçek verilerle doldurun.',
          details: [
            'Her alan için değer girin',
            'Görsel URL\'leri ekleyin',
            'Tarih formatlarını kontrol edin',
            'Validasyon kurallarına uyun'
          ]
        },
        {
          title: 'Örnek Veri Oluşturma',
          description: 'Otomatik örnek veri oluşturun.',
          details: [
            'API\'den gerçek veri çekin',
            'Mock data oluşturun',
            'Kategorilere göre veri üretin',
            'Hızlı test yapın'
          ]
        },
        {
          title: 'Önizleme',
          description: 'Verilerle şablonunuzun nasıl görüneceğini kontrol edin.',
          details: [
            'Gerçek zamanlı önizleme',
            'Farklı cihaz boyutları',
            'Animasyon kontrolleri',
            'Export seçenekleri'
          ]
        }
      ]
    },
    {
      id: 'design-tools',
      title: 'Tasarım Araçları',
      icon: Palette,
      color: 'bg-pink-100 text-pink-700',
      steps: [
        {
          title: 'Temel Araçlar',
          description: 'Canvas üzerinde tasarım yapmak için kullanabileceğiniz araçlar.',
          details: [
            'Metin: Başlık, açıklama, etiket',
            'Şekiller: Dikdörtgen, daire, üçgen, yıldız',
            'Görseller: Logo, fotoğraf, ikon',
            'Çizgiler: Ayırıcı, dekoratif'
          ]
        },
        {
          title: 'Gelişmiş Özellikler',
          description: 'Profesyonel tasarım için gelişmiş özellikler.',
          details: [
            'Gölge efektleri',
            'Köşe yumuşatma',
            'Gradyan renkler',
            'Şeffaflık ayarları',
            'Döndürme ve ölçekleme'
          ]
        },
        {
          title: 'AI Tasarım',
          description: 'Yapay zeka ile otomatik tasarım oluşturun.',
          details: [
            'Prompt yazarak tasarım isteyin',
            'Stil seçenekleri',
            'Otomatik düzen',
            'Renk uyumu',
            'Tipografi önerileri'
          ]
        }
      ]
    },
    {
      id: 'export-share',
      title: 'Dışa Aktarma & Paylaşım',
      icon: Download,
      color: 'bg-indigo-100 text-indigo-700',
      steps: [
        {
          title: 'Export Formatları',
          description: 'Şablonunuzu farklı formatlarda dışa aktarın.',
          details: [
            'PNG: Yüksek kalite görsel',
            'JPG: Sıkıştırılmış görsel',
            'PDF: Vektör tabanlı',
            'JSON: Şablon verisi'
          ]
        },
        {
          title: 'Paylaşım Seçenekleri',
          description: 'Şablonunuzu başkalarıyla paylaşın.',
          details: [
            'Paylaşılabilir link',
            'Email ile gönderim',
            'Sosyal medya paylaşımı',
            'QR kod oluşturma'
          ]
        },
        {
          title: 'Şablon Galerisi',
          description: 'Hazır şablonları keşfedin ve kullanın.',
          details: [
            'Kategori bazlı şablonlar',
            'Popüler şablonlar',
            'Yeni şablonlar',
            'Favori şablonlar'
          ]
        }
      ]
    }
  ];

  const currentSection = sections.find(s => s.id === activeSection);
  const currentStep = currentSection?.steps[activeStep];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl h-[90vh] flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Kullanım Kılavuzu</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-full"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => {
                  setActiveSection(section.id);
                  setActiveStep(0);
                }}
                className={`w-full p-3 rounded-lg text-left transition-colors ${
                  activeSection === section.id
                    ? 'bg-white shadow-sm border border-gray-200'
                    : 'hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${section.color}`}>
                    <section.icon size={16} />
                  </div>
                  <span className="font-medium text-gray-900">{section.title}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Quick Tips */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <Lightbulb size={16} />
              Hızlı İpuçları
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Ctrl+Z ile geri alın</li>
              <li>• Shift+Click ile çoklu seçim</li>
              <li>• Space+Click ile pan yapın</li>
              <li>• Ctrl+S ile otomatik kaydedin</li>
            </ul>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${currentSection?.color}`}>
                {currentSection && <currentSection.icon size={20} />}
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{currentSection?.title}</h1>
            </div>
            <p className="text-gray-600">Adım adım rehber ile şablon oluşturmayı öğrenin</p>
          </div>

          {/* Steps Navigation */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              {currentSection?.steps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveStep(index)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    activeStep === index
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {currentStep && (
              <div className="max-w-4xl">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {currentStep.title}
                </h2>
                <p className="text-lg text-gray-700 mb-6">
                  {currentStep.description}
                </p>

                <div className="space-y-4">
                  {currentStep.details.map((detail, index) => (
                    <div key={index} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                      <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                        {index + 1}
                      </div>
                      <p className="text-gray-700">{detail}</p>
                    </div>
                  ))}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8">
                  <button
                    onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                    disabled={activeStep === 0}
                    className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} className="rotate-180" />
                    Önceki
                  </button>

                  <div className="text-sm text-gray-500">
                    {activeStep + 1} / {currentSection?.steps.length}
                  </div>

                  <button
                    onClick={() => setActiveStep(Math.min((currentSection?.steps.length || 1) - 1, activeStep + 1))}
                    disabled={activeStep === (currentSection?.steps.length || 1) - 1}
                    className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sonraki
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsageGuide;
