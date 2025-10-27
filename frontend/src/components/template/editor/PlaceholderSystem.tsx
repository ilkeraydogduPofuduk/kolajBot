import React, { useState } from 'react';
import { Image, Type, Hash, Calendar, MapPin, Phone, Mail, User, Tag } from 'lucide-react';

interface Placeholder {
  id: string;
  type: 'text' | 'image' | 'number' | 'date' | 'location' | 'contact' | 'user' | 'tag';
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  defaultValue: string;
  required: boolean;
  category: 'product' | 'brand' | 'contact' | 'general';
}

interface PlaceholderSystemProps {
  onAddPlaceholder: (placeholder: Placeholder) => void;
  onEditPlaceholder: (id: string, placeholder: Placeholder) => void;
  onDeletePlaceholder: (id: string) => void;
  placeholders: Placeholder[];
}

const PlaceholderSystem: React.FC<PlaceholderSystemProps> = ({
  onAddPlaceholder,
  onEditPlaceholder,
  onDeletePlaceholder,
  placeholders
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'product' | 'brand' | 'contact' | 'general'>('product');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlaceholder, setEditingPlaceholder] = useState<Placeholder | null>(null);

  const predefinedPlaceholders: Placeholder[] = [
    // Product placeholders
    { id: 'product-name', type: 'text', name: 'Ürün Adı', description: 'Ürünün adı', icon: Tag, defaultValue: '{{product.name}}', required: true, category: 'product' },
    { id: 'product-code', type: 'text', name: 'Ürün Kodu', description: 'Ürün kodu', icon: Hash, defaultValue: '{{product.code}}', required: true, category: 'product' },
    { id: 'product-price', type: 'number', name: 'Fiyat', description: 'Ürün fiyatı', icon: Hash, defaultValue: '{{product.price}}', required: true, category: 'product' },
    { id: 'product-image', type: 'image', name: 'Ürün Görseli', description: 'Ana ürün görseli', icon: Image, defaultValue: '{{product.mainImage}}', required: true, category: 'product' },
    { id: 'product-gallery', type: 'image', name: 'Ürün Galerisi', description: 'Ürün görselleri', icon: Image, defaultValue: '{{product.gallery}}', required: false, category: 'product' },
    { id: 'product-color', type: 'text', name: 'Renk', description: 'Ürün rengi', icon: Tag, defaultValue: '{{product.color}}', required: false, category: 'product' },
    { id: 'product-size', type: 'text', name: 'Beden', description: 'Ürün bedeni', icon: Tag, defaultValue: '{{product.size}}', required: false, category: 'product' },
    { id: 'product-description', type: 'text', name: 'Açıklama', description: 'Ürün açıklaması', icon: Type, defaultValue: '{{product.description}}', required: false, category: 'product' },

    // Brand placeholders
    { id: 'brand-name', type: 'text', name: 'Marka Adı', description: 'Marka adı', icon: Tag, defaultValue: '{{brand.name}}', required: true, category: 'brand' },
    { id: 'brand-logo', type: 'image', name: 'Marka Logosu', description: 'Marka logosu', icon: Image, defaultValue: '{{brand.logo}}', required: true, category: 'brand' },
    { id: 'brand-slogan', type: 'text', name: 'Marka Sloganı', description: 'Marka sloganı', icon: Type, defaultValue: '{{brand.slogan}}', required: false, category: 'brand' },

    // Contact placeholders
    { id: 'contact-phone', type: 'contact', name: 'Telefon', description: 'İletişim telefonu', icon: Phone, defaultValue: '{{contact.phone}}', required: false, category: 'contact' },
    { id: 'contact-email', type: 'contact', name: 'E-posta', description: 'İletişim e-postası', icon: Mail, defaultValue: '{{contact.email}}', required: false, category: 'contact' },
    { id: 'contact-address', type: 'location', name: 'Adres', description: 'İletişim adresi', icon: MapPin, defaultValue: '{{contact.address}}', required: false, category: 'contact' },
    { id: 'contact-website', type: 'text', name: 'Website', description: 'Website adresi', icon: Type, defaultValue: '{{contact.website}}', required: false, category: 'contact' },

    // General placeholders
    { id: 'current-date', type: 'date', name: 'Tarih', description: 'Güncel tarih', icon: Calendar, defaultValue: '{{date.current}}', required: false, category: 'general' },
    { id: 'user-name', type: 'user', name: 'Kullanıcı Adı', description: 'Kullanıcı adı', icon: User, defaultValue: '{{user.name}}', required: false, category: 'general' },
  ];

  const categories = [
    { id: 'product', name: 'Ürün', color: 'bg-blue-100 text-blue-800' },
    { id: 'brand', name: 'Marka', color: 'bg-green-100 text-green-800' },
    { id: 'contact', name: 'İletişim', color: 'bg-purple-100 text-purple-800' },
    { id: 'general', name: 'Genel', color: 'bg-gray-100 text-gray-800' }
  ];

  const filteredPlaceholders = predefinedPlaceholders.filter(p => p.category === selectedCategory);

  const handleAddPlaceholder = (placeholder: Placeholder) => {
    onAddPlaceholder(placeholder);
    setShowAddModal(false);
  };

  const handleEditPlaceholder = (placeholder: Placeholder) => {
    setEditingPlaceholder(placeholder);
    setShowAddModal(true);
  };

  const handleSaveEdit = (placeholder: Placeholder) => {
    if (editingPlaceholder) {
      onEditPlaceholder(editingPlaceholder.id, placeholder);
    } else {
      onAddPlaceholder(placeholder);
    }
    setShowAddModal(false);
    setEditingPlaceholder(null);
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Dinamik Alanlar</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
        >
          + Ekle
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id as any)}
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              selectedCategory === category.id
                ? category.color
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Placeholder List */}
      <div className="space-y-2">
        {filteredPlaceholders.map(placeholder => (
          <div
            key={placeholder.id}
            className="p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <placeholder.icon size={16} className="text-gray-600" />
                <div>
                  <div className="font-medium text-sm">{placeholder.name}</div>
                  <div className="text-xs text-gray-500">{placeholder.description}</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleEditPlaceholder(placeholder)}
                  className="p-1 hover:bg-gray-100 rounded"
                  title="Düzenle"
                >
                  ✏️
                </button>
                <button
                  onClick={() => onDeletePlaceholder(placeholder.id)}
                  className="p-1 hover:bg-red-100 rounded text-red-600"
                  title="Sil"
                >
                  🗑️
                </button>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-400 font-mono bg-gray-50 p-1 rounded">
              {placeholder.defaultValue}
            </div>
            {placeholder.required && (
              <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded">
                Zorunlu
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <PlaceholderModal
          placeholder={editingPlaceholder}
          onSave={handleSaveEdit}
          onClose={() => {
            setShowAddModal(false);
            setEditingPlaceholder(null);
          }}
        />
      )}
    </div>
  );
};

// Placeholder Modal Component
interface PlaceholderModalProps {
  placeholder?: Placeholder | null;
  onSave: (placeholder: Placeholder) => void;
  onClose: () => void;
}

const PlaceholderModal: React.FC<PlaceholderModalProps> = ({
  placeholder,
  onSave,
  onClose
}) => {
  const [formData, setFormData] = useState({
    name: placeholder?.name || '',
    description: placeholder?.description || '',
    defaultValue: placeholder?.defaultValue || '',
    required: placeholder?.required || false,
    category: placeholder?.category || 'product' as const,
    type: placeholder?.type || 'text' as const
  });

  const handleSave = () => {
    if (!formData.name || !formData.defaultValue) return;

    const newPlaceholder: Placeholder = {
      id: placeholder?.id || `custom-${Date.now()}`,
      type: formData.type,
      name: formData.name,
      description: formData.description,
      icon: Type, // Default icon
      defaultValue: formData.defaultValue,
      required: formData.required,
      category: formData.category
    };

    onSave(newPlaceholder);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-semibold mb-4">
          {placeholder ? 'Placeholder Düzenle' : 'Yeni Placeholder'}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ad</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="Placeholder adı"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="Placeholder açıklaması"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Varsayılan Değer</label>
            <input
              type="text"
              value={formData.defaultValue}
              onChange={(e) => setFormData({ ...formData, defaultValue: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded font-mono"
              placeholder="{{data.field}}"
            />
          </div>

          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="p-2 border border-gray-300 rounded"
              >
                <option value="product">Ürün</option>
                <option value="brand">Marka</option>
                <option value="contact">İletişim</option>
                <option value="general">Genel</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tip</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="p-2 border border-gray-300 rounded"
              >
                <option value="text">Metin</option>
                <option value="image">Görsel</option>
                <option value="number">Sayı</option>
                <option value="date">Tarih</option>
                <option value="location">Konum</option>
                <option value="contact">İletişim</option>
                <option value="user">Kullanıcı</option>
                <option value="tag">Etiket</option>
              </select>
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="required"
              checked={formData.required}
              onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="required" className="text-sm text-gray-700">Zorunlu alan</label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlaceholderSystem;
