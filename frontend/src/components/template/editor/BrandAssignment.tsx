import React, { useState, useEffect } from 'react';
import { Building2, Users, Tag, Settings, Plus, Search, Filter } from 'lucide-react';
import { brandsAPI, Brand } from '../../../services/api/brands';
import toast from 'react-hot-toast';

// Brand interface is now imported from brandsAPI

interface BrandAssignmentProps {
  selectedBrands: number[];
  onBrandSelect: (brandIds: number[]) => void;
  onTemplateAssign: (templateId: string, brandIds: number[]) => void;
  templateId?: string;
}

const BrandAssignment: React.FC<BrandAssignmentProps> = ({
  selectedBrands,
  onBrandSelect,
  onTemplateAssign,
  templateId
}) => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showAssignModal, setShowAssignModal] = useState(false);

  // Load brands from API
  useEffect(() => {
    const loadBrands = async () => {
      try {
        const response = await brandsAPI.getBrands(1, 100, searchTerm, filterCategory, true);
        setBrands(response.brands);
      } catch (error) {
        console.error('Error loading brands:', error);
        toast.error('Markalar yüklenirken hata oluştu');
        
        // Fallback to mock data
        const mockBrands: Brand[] = [
          {
            id: 1,
            name: 'Nike',
            logo: '/logos/nike.png',
            description: 'Spor giyim markası',
            category: 'Fashion',
            isActive: true,
            userCount: 15,
            templateCount: 8,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 2,
            name: 'Apple',
            logo: '/logos/apple.png',
            description: 'Teknoloji markası',
            category: 'Technology',
            isActive: true,
            userCount: 25,
            templateCount: 12,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];
        setBrands(mockBrands);
      }
    };

    loadBrands();
  }, [searchTerm, filterCategory]);

  const categories = ['all', 'Fashion', 'Technology', 'Food', 'Automotive', 'Beauty', 'Healthcare', 'Education'];

  const filteredBrands = brands.filter(brand => {
    const matchesSearch = brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         brand.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || brand.category === filterCategory;
    return matchesSearch && matchesCategory && brand.isActive;
  });

  const handleBrandToggle = (brandId: number) => {
    const newSelection = selectedBrands.includes(brandId)
      ? selectedBrands.filter(id => id !== brandId)
      : [...selectedBrands, brandId];
    onBrandSelect(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedBrands.length === filteredBrands.length) {
      onBrandSelect([]);
    } else {
      onBrandSelect(filteredBrands.map(brand => brand.id));
    }
  };

  const handleAssignTemplate = async () => {
    if (templateId && selectedBrands.length > 0) {
      try {
        await brandsAPI.assignTemplateToBrands(templateId, selectedBrands);
        toast.success(`Şablon ${selectedBrands.length} markaya atandı`);
        onTemplateAssign(templateId, selectedBrands);
        setShowAssignModal(false);
      } catch (error) {
        console.error('Error assigning template:', error);
        toast.error('Şablon atanırken hata oluştu');
      }
    }
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Marka Ataması</h3>
        <button
          onClick={() => setShowAssignModal(true)}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
        >
          <Plus size={14} className="inline mr-1" />
          Ata
        </button>
      </div>

      {/* Search and Filter */}
      <div className="space-y-3 mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Marka ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="flex-1 p-2 border border-gray-300 rounded text-sm"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'Tüm Kategoriler' : category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selection Summary */}
      {selectedBrands.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-800">
              {selectedBrands.length} marka seçildi
            </span>
            <button
              onClick={() => onBrandSelect([])}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Temizle
            </button>
          </div>
        </div>
      )}

      {/* Brand List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Markalar ({filteredBrands.length})
          </span>
          <button
            onClick={handleSelectAll}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            {selectedBrands.length === filteredBrands.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
          </button>
        </div>

        {filteredBrands.map(brand => (
          <div
            key={brand.id}
            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
              selectedBrands.includes(brand.id)
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleBrandToggle(brand.id)}
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedBrands.includes(brand.id)}
                onChange={() => handleBrandToggle(brand.id)}
                className="w-4 h-4 text-blue-600"
              />
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {brand.logo ? (
                    <img
                      src={brand.logo}
                      alt={brand.name}
                      className="w-8 h-8 rounded object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                      <Building2 size={16} className="text-gray-500" />
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-sm">{brand.name}</div>
                    <div className="text-xs text-gray-500">{brand.description}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1">
                    <Tag size={12} className="text-gray-400" />
                    <span className="text-xs text-gray-500">{brand.category}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users size={12} className="text-gray-400" />
                    <span className="text-xs text-gray-500">{brand.userCount} kullanıcı</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Settings size={12} className="text-gray-400" />
                    <span className="text-xs text-gray-500">{brand.templateCount} şablon</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">Şablonu Markalara Ata</h3>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Bu şablon seçili markalara atanacak. Markalar bu şablonu kullanarak 
                kendi içeriklerini oluşturabilecek.
              </p>
              
              {selectedBrands.length > 0 ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h4 className="font-medium text-blue-800 mb-2">Seçili Markalar:</h4>
                  <div className="space-y-1">
                    {selectedBrands.map(brandId => {
                      const brand = brands.find(b => b.id === brandId);
                      return brand ? (
                        <div key={brandId} className="text-sm text-blue-700">
                          • {brand.name}
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    Lütfen en az bir marka seçin.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                İptal
              </button>
              <button
                onClick={handleAssignTemplate}
                disabled={selectedBrands.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Ata
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrandAssignment;
