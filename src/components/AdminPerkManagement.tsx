import { useState, useEffect } from 'react';
import {
  dbOperations,
  PerkTemplate,
  PerkCategory
} from '../lib/supabase';
import { Plus, Edit, Trash2, Eye, EyeOff, Save, X, Search } from 'lucide-react';

interface AdminPerkManagementProps {
  adminUserId: string;
}

export function AdminPerkManagement({ adminUserId }: AdminPerkManagementProps) {
  const [activeTab, setActiveTab] = useState<'templates' | 'categories' | 'analytics'>('templates');
  const [templates, setTemplates] = useState<PerkTemplate[]>([]);
  const [categories, setCategories] = useState<PerkCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Template form states
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PerkTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    perk_type: '',
    default_value: 0,
    category: '',
    icon: '',
    is_active: true
  });

  // Category form states
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<PerkCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    display_order: 0,
    is_active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [templatesData, categoriesData] = await Promise.all([
        dbOperations.getAllPerkTemplates(),
        dbOperations.getAllPerkCategories()
      ]);
      setTemplates(templatesData);
      setCategories(categoriesData);
    } catch (err) {
      console.error('Error loading perk data:', err);
      setError('Failed to load perk management data');
    } finally {
      setLoading(false);
    }
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      name: '',
      description: '',
      perk_type: '',
      default_value: 0,
      category: '',
      icon: '',
      is_active: true
    });
    setEditingTemplate(null);
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      name: '',
      description: '',
      display_order: 0,
      is_active: true
    });
    setEditingCategory(null);
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await dbOperations.createPerkTemplate({
        ...templateForm,
        created_by_admin_id: adminUserId,
        is_system_default: false
      });

      setSuccess('Perk template created successfully! It will be automatically mirrored to all active clinics.');
      setShowTemplateForm(false);
      resetTemplateForm();
      loadData();
    } catch (err) {
      console.error('Error creating template:', err);
      setError('Failed to create perk template');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await dbOperations.updatePerkTemplate(editingTemplate.id, templateForm);
      setSuccess('Perk template updated successfully!');
      setShowTemplateForm(false);
      resetTemplateForm();
      loadData();
    } catch (err) {
      console.error('Error updating template:', err);
      setError('Failed to update perk template');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (template: PerkTemplate) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await dbOperations.deletePerkTemplate(template.id);
      setSuccess('Perk template deleted successfully!');
      loadData();
    } catch (err: any) {
      console.error('Error deleting template:', err);
      setError(err.message || 'Failed to delete perk template');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTemplateStatus = async (template: PerkTemplate) => {
    setLoading(true);
    setError('');
    try {
      await dbOperations.updatePerkTemplate(template.id, {
        is_active: !template.is_active
      });
      setSuccess(`Perk template ${template.is_active ? 'disabled' : 'enabled'} successfully!`);
      loadData();
    } catch (err) {
      console.error('Error toggling template status:', err);
      setError('Failed to update perk template status');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTemplate = (template: PerkTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      description: template.description || '',
      perk_type: template.perk_type,
      default_value: template.default_value,
      category: template.category || '',
      icon: template.icon || '',
      is_active: template.is_active
    });
    setShowTemplateForm(true);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await dbOperations.createPerkCategory(categoryForm);
      setSuccess('Category created successfully!');
      setShowCategoryForm(false);
      resetCategoryForm();
      loadData();
    } catch (err) {
      console.error('Error creating category:', err);
      setError('Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await dbOperations.updatePerkCategory(editingCategory.id, categoryForm);
      setSuccess('Category updated successfully!');
      setShowCategoryForm(false);
      resetCategoryForm();
      loadData();
    } catch (err) {
      console.error('Error updating category:', err);
      setError('Failed to update category');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = (category: PerkCategory) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      display_order: category.display_order,
      is_active: category.is_active
    });
    setShowCategoryForm(true);
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getIconDisplay = (iconName?: string) => {
    if (!iconName) return '📋';
    const iconMap: Record<string, string> = {
      'stethoscope': '🩺',
      'sparkles': '✨',
      'scissors': '✂️',
      'shield': '🛡️',
      'sun': '☀️',
      'camera': '📷',
      'smile': '😊',
      'grid': '⚿',
      'disc': '💿',
      'activity': '📊'
    };
    return iconMap[iconName] || '📋';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Perk Management</h3>
            <p className="text-sm text-gray-600 mt-1">
              Create and manage perk templates that will be mirrored to all clinics
            </p>
          </div>
          <div className="flex gap-3">
            {activeTab === 'templates' && (
              <button
                onClick={() => setShowTemplateForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus size={16} />
                New Template
              </button>
            )}
            {activeTab === 'categories' && (
              <button
                onClick={() => setShowCategoryForm(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Plus size={16} />
                New Category
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'templates'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Perk Templates
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'categories'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Categories
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'analytics'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Usage Analytics
          </button>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm mb-4 border border-red-100">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-600 p-4 rounded-lg text-sm mb-4 border border-green-100">
            {success}
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Templates List */}
            <div className="space-y-3">
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchQuery ? 'No templates match your search.' : 'No perk templates found.'}
                </div>
              ) : (
                filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className={`border rounded-lg p-4 transition-colors ${
                      template.is_active ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{getIconDisplay(template.icon)}</span>
                          <div>
                            <h4 className="font-medium text-gray-900">{template.name}</h4>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span>Type: {template.perk_type}</span>
                              <span>Value: ₱{template.default_value.toLocaleString()}</span>
                              {template.category && <span>Category: {template.category}</span>}
                            </div>
                          </div>
                        </div>
                        {template.description && (
                          <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                        )}
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            template.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {template.is_active ? 'Active' : 'Inactive'}
                          </span>
                          {template.is_system_default && (
                            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                              System Default
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleTemplateStatus(template)}
                          className={`p-2 rounded-lg transition-colors ${
                            template.is_active
                              ? 'text-gray-600 hover:bg-gray-100'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={template.is_active ? 'Disable template' : 'Enable template'}
                        >
                          {template.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button
                          onClick={() => handleEditTemplate(template)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit template"
                        >
                          <Edit size={16} />
                        </button>
                        {!template.is_system_default && (
                          <button
                            onClick={() => handleDeleteTemplate(template)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete template"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div className="space-y-4">
            <div className="space-y-3">
              {categories.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No categories found.
                </div>
              ) : (
                categories.map((category) => (
                  <div
                    key={category.id}
                    className="border border-gray-200 rounded-lg p-4 bg-white"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{category.name}</h4>
                        {category.description && (
                          <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                          <span>Order: {category.display_order}</span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            category.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {category.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleEditCategory(category)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit category"
                      >
                        <Edit size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-4">
            <div className="text-center py-8 text-gray-500">
              Perk usage analytics will be displayed here.
              <br />
              This will show redemption statistics across all clinics.
            </div>
          </div>
        )}
      </div>

      {/* Template Form Modal */}
      {showTemplateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingTemplate ? 'Edit Perk Template' : 'Create Perk Template'}
              </h3>
              <button
                onClick={() => {
                  setShowTemplateForm(false);
                  resetTemplateForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={editingTemplate ? handleUpdateTemplate : handleCreateTemplate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({...templateForm, name: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Perk Type *</label>
                  <input
                    type="text"
                    value={templateForm.perk_type}
                    onChange={(e) => setTemplateForm({...templateForm, perk_type: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    placeholder="e.g., consultation, cleaning"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({...templateForm, description: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Value (₱) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={templateForm.default_value}
                    onChange={(e) => setTemplateForm({...templateForm, default_value: parseFloat(e.target.value) || 0})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={templateForm.category}
                    onChange={(e) => setTemplateForm({...templateForm, category: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select a category</option>
                    {categories.filter(cat => cat.is_active).map(category => (
                      <option key={category.id} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                  <select
                    value={templateForm.icon}
                    onChange={(e) => setTemplateForm({...templateForm, icon: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select an icon</option>
                    <option value="stethoscope">🩺 Stethoscope</option>
                    <option value="sparkles">✨ Sparkles</option>
                    <option value="scissors">✂️ Scissors</option>
                    <option value="shield">🛡️ Shield</option>
                    <option value="sun">☀️ Sun</option>
                    <option value="camera">📷 Camera</option>
                    <option value="smile">😊 Smile</option>
                    <option value="grid">⚿ Grid</option>
                    <option value="disc">💿 Disc</option>
                    <option value="activity">📊 Activity</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={templateForm.is_active}
                      onChange={(e) => setTemplateForm({...templateForm, is_active: e.target.checked})}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">Active</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowTemplateForm(false);
                    resetTemplateForm();
                  }}
                  className="px-6 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Form Modal */}
      {showCategoryForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingCategory ? 'Edit Category' : 'Create Category'}
              </h3>
              <button
                onClick={() => {
                  setShowCategoryForm(false);
                  resetCategoryForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={editingCategory ? handleUpdateCategory : handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                  <input
                    type="number"
                    min="0"
                    value={categoryForm.display_order}
                    onChange={(e) => setCategoryForm({...categoryForm, display_order: parseInt(e.target.value) || 0})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={categoryForm.is_active}
                      onChange={(e) => setCategoryForm({...categoryForm, is_active: e.target.checked})}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">Active</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  {editingCategory ? 'Update Category' : 'Create Category'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryForm(false);
                    resetCategoryForm();
                  }}
                  className="px-6 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}