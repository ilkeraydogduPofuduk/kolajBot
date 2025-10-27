import React, { useState } from 'react';
import { 
  ShoppingBag, Heart, Calendar, Camera, Music, Gamepad2, 
  Car, Home, Utensils, Shirt, Book, Briefcase, 
  GraduationCap, Stethoscope, Wrench, Palette 
} from 'lucide-react';

interface TemplateCategory {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  description: string;
  color: string;
  subcategories: string[];
}

interface TemplateCategoriesProps {
  selectedCategory: string;
  onCategorySelect: (categoryId: string) => void;
  onSubcategorySelect: (subcategory: string) => void;
}

const TemplateCategories: React.FC<TemplateCategoriesProps> = ({
  selectedCategory,
  onCategorySelect,
  onSubcategorySelect
}) => {
  const categories: TemplateCategory[] = [
    {
      id: 'ecommerce',
      name: 'E-Ticaret',
      icon: ShoppingBag,
      description: 'Online satış şablonları',
      color: 'bg-blue-100 text-blue-800',
      subcategories: ['Ürün Tanıtım', 'Kampanya', 'Katalog', 'Fiyat Listesi', 'İndirim']
    },
    {
      id: 'fashion',
      name: 'Moda & Giyim',
      icon: Shirt,
      description: 'Moda ve giyim şablonları',
      color: 'bg-pink-100 text-pink-800',
      subcategories: ['Koleksiyon', 'Lookbook', 'Kampanya', 'Sezon', 'Marka']
    },
    {
      id: 'food',
      name: 'Yemek & Restoran',
      icon: Utensils,
      description: 'Restoran ve yemek şablonları',
      color: 'bg-orange-100 text-orange-800',
      subcategories: ['Menü', 'Kampanya', 'Yemek Tanıtım', 'Restoran', 'Catering']
    },
    {
      id: 'real-estate',
      name: 'Emlak',
      icon: Home,
      description: 'Emlak şablonları',
      color: 'bg-green-100 text-green-800',
      subcategories: ['Emlak Tanıtım', 'Proje', 'Kampanya', 'Portföy', 'Satış']
    },
    {
      id: 'automotive',
      name: 'Otomotiv',
      icon: Car,
      description: 'Otomotiv şablonları',
      color: 'bg-gray-100 text-gray-800',
      subcategories: ['Araç Tanıtım', 'Servis', 'Kampanya', 'Yedek Parça', 'Satış']
    },
    {
      id: 'healthcare',
      name: 'Sağlık',
      icon: Stethoscope,
      description: 'Sağlık şablonları',
      color: 'bg-red-100 text-red-800',
      subcategories: ['Hizmet Tanıtım', 'Kampanya', 'Bilgilendirme', 'Randevu', 'Uzman']
    },
    {
      id: 'education',
      name: 'Eğitim',
      icon: GraduationCap,
      description: 'Eğitim şablonları',
      color: 'bg-indigo-100 text-indigo-800',
      subcategories: ['Kurs', 'Kampanya', 'Başarı', 'Etkinlik', 'Öğrenci']
    },
    {
      id: 'technology',
      name: 'Teknoloji',
      icon: Gamepad2,
      description: 'Teknoloji şablonları',
      color: 'bg-purple-100 text-purple-800',
      subcategories: ['Ürün Tanıtım', 'Kampanya', 'Yazılım', 'Donanım', 'Hizmet']
    },
    {
      id: 'beauty',
      name: 'Güzellik',
      icon: Heart,
      description: 'Güzellik şablonları',
      color: 'bg-rose-100 text-rose-800',
      subcategories: ['Ürün Tanıtım', 'Kampanya', 'Hizmet', 'Koleksiyon', 'Marka']
    },
    {
      id: 'photography',
      name: 'Fotoğrafçılık',
      icon: Camera,
      description: 'Fotoğrafçılık şablonları',
      color: 'bg-yellow-100 text-yellow-800',
      subcategories: ['Portföy', 'Kampanya', 'Hizmet', 'Etkinlik', 'Stüdyo']
    },
    {
      id: 'entertainment',
      name: 'Eğlence',
      icon: Music,
      description: 'Eğlence şablonları',
      color: 'bg-emerald-100 text-emerald-800',
      subcategories: ['Etkinlik', 'Kampanya', 'Konser', 'Festival', 'Sanat']
    },
    {
      id: 'business',
      name: 'İş & Kurumsal',
      icon: Briefcase,
      description: 'İş ve kurumsal şablonları',
      color: 'bg-slate-100 text-slate-800',
      subcategories: ['Sunum', 'Rapor', 'Kampanya', 'Hizmet', 'Kurumsal']
    },
    {
      id: 'events',
      name: 'Etkinlik',
      icon: Calendar,
      description: 'Etkinlik şablonları',
      color: 'bg-cyan-100 text-cyan-800',
      subcategories: ['Davet', 'Kampanya', 'Program', 'Bilet', 'Organizasyon']
    },
    {
      id: 'services',
      name: 'Hizmetler',
      icon: Wrench,
      description: 'Hizmet şablonları',
      color: 'bg-amber-100 text-amber-800',
      subcategories: ['Hizmet Tanıtım', 'Kampanya', 'Fiyat', 'Randevu', 'Uzman']
    },
    {
      id: 'creative',
      name: 'Yaratıcı',
      icon: Palette,
      description: 'Yaratıcı şablonlar',
      color: 'bg-violet-100 text-violet-800',
      subcategories: ['Sanat', 'Tasarım', 'Kampanya', 'Portföy', 'Kreatif']
    }
  ];

  const selectedCategoryData = categories.find(cat => cat.id === selectedCategory);

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Şablon Kategorileri</h3>

      {/* Category Grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => onCategorySelect(category.id)}
            className={`p-3 rounded-lg border transition-colors ${
              selectedCategory === category.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex flex-col items-center text-center">
              <category.icon 
                size={24} 
                className={`mb-2 ${
                  selectedCategory === category.id ? 'text-blue-600' : 'text-gray-600'
                }`} 
              />
              <span className={`text-xs font-medium ${
                selectedCategory === category.id ? 'text-blue-800' : 'text-gray-700'
              }`}>
                {category.name}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Selected Category Details */}
      {selectedCategoryData && (
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <selectedCategoryData.icon size={20} className="text-gray-600" />
            <h4 className="font-medium text-gray-900">{selectedCategoryData.name}</h4>
          </div>
          <p className="text-sm text-gray-600 mb-3">{selectedCategoryData.description}</p>
          
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2">Alt Kategoriler:</h5>
            <div className="flex flex-wrap gap-1">
              {selectedCategoryData.subcategories.map(subcategory => (
                <button
                  key={subcategory}
                  onClick={() => onSubcategorySelect(subcategory)}
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  {subcategory}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="border-t border-gray-200 pt-4 mt-4">
        <h5 className="text-sm font-medium text-gray-700 mb-2">Hızlı İşlemler:</h5>
        <div className="space-y-2">
          <button className="w-full p-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors">
            Bu Kategoriye Özel Şablon Oluştur
          </button>
          <button className="w-full p-2 text-sm bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors">
            Kategori Şablonlarını Görüntüle
          </button>
          <button className="w-full p-2 text-sm bg-purple-50 text-purple-700 rounded hover:bg-purple-100 transition-colors">
            AI ile Kategori Şablonu Oluştur
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateCategories;
