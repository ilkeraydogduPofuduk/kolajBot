import React, { useState, useEffect } from 'react';
import { Database, Link, Eye, Code, Play, Pause, RefreshCw } from 'lucide-react';
import { templatesAPI, Template, Placeholder } from '../../../services/api/templates';
import toast from 'react-hot-toast';

// DataField interface is now using Placeholder from templatesAPI
type DataField = Placeholder & { value: any };

interface DataBindingSystemProps {
  templateId: string;
  onDataChange: (data: Record<string, any>) => void;
  onPreview: (data: Record<string, any>) => void;
}

const DataBindingSystem: React.FC<DataBindingSystemProps> = ({
  templateId,
  onDataChange,
  onPreview
}) => {
  const [dataFields, setDataFields] = useState<DataField[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, any>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  // Load template data fields from API
  useEffect(() => {
    const loadTemplateFields = async () => {
      try {
        const template = await templatesAPI.getTemplate(templateId);
        const fields: DataField[] = template.placeholders.map(placeholder => ({
          ...placeholder,
          value: placeholder.value || ''
        }));
        setDataFields(fields);
      } catch (error) {
        console.error('Error loading template fields:', error);
        toast.error('Şablon alanları yüklenirken hata oluştu');
        
        // Fallback to mock data
        const mockFields: DataField[] = [
          {
            id: 'product-name',
            name: 'Ürün Adı',
            type: 'text',
            value: '',
            placeholder: '{{product.name}}',
            required: true,
            validation: {
              min: 2,
              max: 100,
              message: 'Ürün adı 2-100 karakter arasında olmalıdır'
            },
            category: 'product'
          },
          {
            id: 'product-price',
            name: 'Fiyat',
            type: 'number',
            value: '',
            placeholder: '{{product.price}}',
            required: true,
            validation: {
              min: 0,
              message: 'Fiyat 0\'dan büyük olmalıdır'
            },
            category: 'product'
          },
          {
            id: 'product-image',
            name: 'Ürün Görseli',
            type: 'image',
            value: '',
            placeholder: '{{product.mainImage}}',
            required: true,
            category: 'product'
          },
          {
            id: 'brand-name',
            name: 'Marka Adı',
            type: 'text',
            value: '',
            placeholder: '{{brand.name}}',
            required: true,
            category: 'brand'
          },
          {
            id: 'brand-logo',
            name: 'Marka Logosu',
            type: 'image',
            value: '',
            placeholder: '{{brand.logo}}',
            required: true,
            category: 'brand'
          }
        ];
        setDataFields(mockFields);
      }
    };

    if (templateId) {
      loadTemplateFields();
    }
  }, [templateId]);

  const handleFieldChange = (fieldId: string, value: any) => {
    const updatedFields = dataFields.map(field => 
      field.id === fieldId ? { ...field, value } : field
    );
    setDataFields(updatedFields);

    // Create data object for parent
    const data: Record<string, any> = {};
    updatedFields.forEach(field => {
      if (field.value) {
        data[field.id] = field.value;
      }
    });
    onDataChange(data);
  };

  const validateField = (field: DataField, value: any): string | null => {
    if (field.required && (!value || value.toString().trim() === '')) {
      return `${field.name} zorunludur`;
    }

    if (field.validation && value) {
      const { min, max, pattern, message } = field.validation;
      
      if (field.type === 'number') {
        const numValue = parseFloat(value);
        if (min !== undefined && numValue < min) {
          return message || `${field.name} en az ${min} olmalıdır`;
        }
        if (max !== undefined && numValue > max) {
          return message || `${field.name} en fazla ${max} olmalıdır`;
        }
      }

      if (field.type === 'text' && pattern) {
        const regex = new RegExp(pattern);
        if (!regex.test(value)) {
          return message || `${field.name} formatı geçersizdir`;
        }
      }
    }

    return null;
  };

  const generateMockData = async () => {
    setIsGenerating(true);
    
    try {
      // Try to generate from API first
      const data: Record<string, any> = {};
      dataFields.forEach(field => {
        if (field.category === 'product') {
          data[field.id] = 'Örnek Ürün';
        } else if (field.category === 'brand') {
          data[field.id] = 'Örnek Marka';
        } else {
          data[field.id] = 'Örnek Veri';
        }
      });

      const result = await templatesAPI.generateTemplate(templateId, data);
      
      if (result.success) {
        // Update fields with generated data
        const updatedFields = dataFields.map(field => ({
          ...field,
          value: data[field.id] || field.value
        }));
        setDataFields(updatedFields);
        setPreviewData(data);
        onDataChange(data);
        toast.success('Örnek veri oluşturuldu!');
      } else {
        throw new Error(result.error || 'Veri oluşturulamadı');
      }
    } catch (error) {
      console.error('Error generating mock data:', error);
      
      // Fallback to static mock data
      const mockData: Record<string, any> = {
        'product-name': 'Nike Air Max 270',
        'product-price': 1299.99,
        'product-image': 'https://via.placeholder.com/400x400/000000/FFFFFF?text=Nike+Air+Max',
        'brand-name': 'Nike',
        'brand-logo': 'https://via.placeholder.com/200x100/000000/FFFFFF?text=Nike+Logo',
        'discount-percentage': 25,
        'campaign-end-date': '2024-12-31'
      };

      // Update fields with mock data
      const updatedFields = dataFields.map(field => ({
        ...field,
        value: mockData[field.id] || field.value
      }));
      setDataFields(updatedFields);
      setPreviewData(mockData);
      onDataChange(mockData);
      toast.success('Örnek veri oluşturuldu!');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreview = () => {
    const data: Record<string, any> = {};
    dataFields.forEach(field => {
      if (field.value) {
        data[field.id] = field.value;
      }
    });
    setPreviewData(data);
    onPreview(data);
    setIsPreviewMode(true);
  };

  const renderFieldInput = (field: DataField) => {
    const error = validateField(field, field.value);

    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={field.value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className={`w-full p-2 border rounded ${
              error ? 'border-red-300' : 'border-gray-300'
            }`}
          />
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={field.value}
            onChange={(e) => handleFieldChange(field.id, parseFloat(e.target.value) || '')}
            placeholder={field.placeholder}
            className={`w-full p-2 border rounded ${
              error ? 'border-red-300' : 'border-gray-300'
            }`}
          />
        );
      
      case 'date':
        return (
          <input
            type="date"
            value={field.value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className={`w-full p-2 border rounded ${
              error ? 'border-red-300' : 'border-gray-300'
            }`}
          />
        );
      
      case 'image':
        return (
          <div className="space-y-2">
            <input
              type="url"
              value={field.value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              className={`w-full p-2 border rounded ${
                error ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {field.value && (
              <img
                src={field.value}
                alt={field.name}
                className="w-20 h-20 object-cover rounded border"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
          </div>
        );
      
      default:
        return (
          <input
            type="text"
            value={field.value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className={`w-full p-2 border rounded ${
              error ? 'border-red-300' : 'border-gray-300'
            }`}
          />
        );
    }
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Veri Bağlama</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={generateMockData}
            disabled={isGenerating}
            className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
            title="Örnek Veri Oluştur"
          >
            {isGenerating ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Database size={16} />
            )}
          </button>
          <button
            onClick={handlePreview}
            className="p-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            title="Önizleme"
          >
            <Eye size={16} />
          </button>
        </div>
      </div>

      {/* Preview Mode Toggle */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setIsPreviewMode(!isPreviewMode)}
          className={`flex items-center gap-2 px-3 py-1 rounded text-sm ${
            isPreviewMode
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          {isPreviewMode ? <Pause size={14} /> : <Play size={14} />}
          {isPreviewMode ? 'Düzenleme Modu' : 'Önizleme Modu'}
        </button>
      </div>

      {/* Data Fields */}
      <div className="space-y-4">
        {dataFields.map(field => {
          const error = validateField(field, field.value);
          
          return (
            <div key={field.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">
                  {field.name}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <span className="text-xs text-gray-400 font-mono bg-gray-100 px-1 rounded">
                  {field.placeholder}
                </span>
              </div>
              
              {isPreviewMode ? (
                <div className="p-2 bg-gray-50 border rounded">
                  {field.value ? (
                    field.type === 'image' ? (
                      <img
                        src={field.value}
                        alt={field.name}
                        className="w-20 h-20 object-cover rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-sm">{field.value}</span>
                    )
                  ) : (
                    <span className="text-sm text-gray-400 italic">
                      {field.placeholder}
                    </span>
                  )}
                </div>
              ) : (
                <>
                  {renderFieldInput(field)}
                  {error && (
                    <p className="text-xs text-red-600">{error}</p>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Data Summary */}
      <div className="border-t border-gray-200 pt-4 mt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Veri Özeti</h4>
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>Toplam Alan:</span>
            <span>{dataFields.length}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>Doldurulan:</span>
            <span>{dataFields.filter(f => f.value).length}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>Zorunlu:</span>
            <span>{dataFields.filter(f => f.required).length}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>Tamamlanan Zorunlu:</span>
            <span>{dataFields.filter(f => f.required && f.value).length}</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="border-t border-gray-200 pt-4 mt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Hızlı İşlemler</h4>
        <div className="space-y-2">
          <button className="w-full p-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors">
            <Code size={14} className="inline mr-1" />
            JSON Olarak Dışa Aktar
          </button>
          <button className="w-full p-2 text-sm bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors">
            <Link size={14} className="inline mr-1" />
            API Bağlantısı Kur
          </button>
          <button className="w-full p-2 text-sm bg-purple-50 text-purple-700 rounded hover:bg-purple-100 transition-colors">
            <Database size={14} className="inline mr-1" />
            Veritabanı Şeması Oluştur
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataBindingSystem;
