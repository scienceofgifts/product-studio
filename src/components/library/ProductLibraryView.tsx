/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  ProductRecord,
  GiftGuide,
  ProductType
} from '../../types';
import {
  Search,
  Filter,
  Download,
  Upload,
  Trash2,
  Copy,
  ExternalLink,
  Sparkles,
  Layers,
  Calendar,
  User,
  ArrowUpDown,
  FileText,
  AlertCircle,
  FileSpreadsheet,
  Scale
} from 'lucide-react';
import { formatWritingBriefMarkdown, downloadFile, exportCatalogueToCSV } from '../../utils/exportUtils';
import { ProductComparisonModal } from '../modals/ProductComparisonModal';

interface ProductLibraryViewProps {
  products: ProductRecord[];
  giftGuides: GiftGuide[];
  onOpenProduct: (product: ProductRecord) => void;
  onDuplicateProduct: (id: string) => void;
  onDeleteProduct: (id: string) => void;
  onImportBackup: (jsonString: string) => Promise<void>;
  onExportBackup: () => void;
}

export const ProductLibraryView: React.FC<ProductLibraryViewProps> = ({
  products,
  giftGuides,
  onOpenProduct,
  onDuplicateProduct,
  onDeleteProduct,
  onImportBackup,
  onExportBackup
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGuide, setSelectedGuide] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sortField, setSortField] = useState<'updatedAt' | 'createdAt' | 'name'>('updatedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Compare pair modal
  const [comparisonTarget, setComparisonTarget] = useState<{
    productA: ProductRecord;
    productB: ProductRecord;
  } | null>(null);

  const importInputRef = useRef<HTMLInputElement>(null);

  const filteredAndSortedProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const nameMatch = (p.details.workingName || '').toLowerCase().includes(q);
          const recipientMatch = (p.details.primaryRecipient || '').toLowerCase().includes(q);
          const nicheMatch = (p.details.audienceInterest || '').toLowerCase().includes(q);
          const profileMatch = (p.contextProfileName || '').toLowerCase().includes(q);
          const titleMatch = (p.analysisResult?.titleLaboratory?.recommendedTitle || '').toLowerCase().includes(q);
          if (!nameMatch && !recipientMatch && !nicheMatch && !profileMatch && !titleMatch) return false;
        }

        // Guide filter
        if (selectedGuide !== 'all' && p.details.giftGuideId !== selectedGuide) {
          return false;
        }

        // Publication Status filter
        if (selectedStatus !== 'all') {
          const pubStatus = p.publicationStatus || (p.status === 'completed' ? 'published' : 'draft');
          if (pubStatus !== selectedStatus && p.status !== selectedStatus) {
            return false;
          }
        }

        // Product type filter
        if (selectedType !== 'all' && p.details.productType !== selectedType) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        let comp = 0;
        if (sortField === 'name') {
          comp = (a.details.workingName || '').localeCompare(b.details.workingName || '');
        } else if (sortField === 'createdAt') {
          comp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        } else {
          comp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        }
        return sortDirection === 'desc' ? -comp : comp;
      });
  }, [products, searchQuery, selectedGuide, selectedStatus, selectedType, sortField, sortDirection]);

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const text = evt.target?.result as string;
        if (text) {
          await onImportBackup(text);
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    }
  };

  const handleExportIndividualBrief = (product: ProductRecord) => {
    if (!product.analysisResult?.writingBrief) {
      alert('This product does not have a completed analysis brief yet.');
      return;
    }
    const md = formatWritingBriefMarkdown(product.analysisResult.writingBrief);
    const titleSlug = (product.details.workingName || 'brief').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    downloadFile(md, `${titleSlug}_brief.md`, 'text/markdown;charset=utf-8;');
  };

  const handleExportIndividualJSON = (product: ProductRecord) => {
    const jsonStr = JSON.stringify(product, null, 2);
    const titleSlug = (product.details.workingName || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    downloadFile(jsonStr, `${titleSlug}_record.json`, 'application/json;charset=utf-8;');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Catalogue Actions */}
      <div className="bg-white border border-[#E8E4DC] rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl font-bold text-stone-900">
            Product Intelligence Library
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            IndexedDB storage with versioned editorial analyses, specifications, and writing briefs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportCatalogueToCSV(products)}
            disabled={products.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-white border border-[#E8E4DC] hover:bg-stone-50 disabled:opacity-50 rounded-md transition-colors"
            title="Export entire catalogue index as CSV spreadsheet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>Catalogue (.csv)</span>
          </button>

          <button
            onClick={onExportBackup}
            disabled={products.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-white border border-[#E8E4DC] hover:bg-stone-50 disabled:opacity-50 rounded-md transition-colors"
            title="Export full database backup (JSON)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Full Backup (.json)</span>
          </button>

          <button
            onClick={() => importInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-white border border-[#E8E4DC] hover:bg-stone-50 rounded-md transition-colors"
            title="Import from a previously exported JSON backup"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Backup</span>
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E8E4DC] rounded-xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products, recipients, niches..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF8F5] border border-[#E8E4DC] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
            />
          </div>

          {/* Guide Filter */}
          <div>
            <select
              value={selectedGuide}
              onChange={(e) => setSelectedGuide(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#E8E4DC] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
            >
              <option value="all">All Gift Guides</option>
              {giftGuides.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#E8E4DC] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed Analysis</option>
              <option value="draft">Drafts Only</option>
            </select>
          </div>

          {/* Sort Control */}
          <div className="flex items-center gap-2">
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as any)}
              className="flex-1 px-3 py-2 text-xs bg-[#FAF8F5] border border-[#E8E4DC] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
            >
              <option value="updatedAt">Sort by: Last Modified</option>
              <option value="createdAt">Sort by: Creation Date</option>
              <option value="name">Sort by: Product Name</option>
            </select>

            <button
              onClick={() => setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')}
              className="p-2 border border-[#E8E4DC] bg-[#FAF8F5] hover:bg-stone-100 rounded-md text-stone-600 transition-colors"
              title={`Currently: ${sortDirection.toUpperCase()}`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Product List */}
      {filteredAndSortedProducts.length === 0 ? (
        <div className="bg-white border border-[#E8E4DC] rounded-xl p-12 text-center">
          <Layers className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <h3 className="font-serif text-base font-semibold text-stone-800">No matching products found</h3>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            {products.length === 0
              ? 'Your product library is currently empty. Run an analysis in the Workspace to populate records.'
              : 'Try adjusting your search query or filters to find what you are looking for.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSortedProducts.map((product) => {
            const hasAnalysis = Boolean(product.analysisResult);
            const recommendedTitle = product.analysisResult?.titleLaboratory?.recommendedTitle;

            return (
              <div
                key={product.id}
                className="bg-white border border-[#E8E4DC] rounded-xl overflow-hidden shadow-xs hover:border-stone-400 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Card Header & Thumbnail */}
                  <div className="p-4 bg-[#FAF8F5] border-b border-[#E8E4DC] flex items-start gap-3">
                    <div className="w-16 h-16 bg-white border border-stone-200 rounded-md overflow-hidden shrink-0 flex items-center justify-center">
                      {product.imageDataUrl ? (
                        <img
                          src={product.imageDataUrl}
                          alt={product.details.workingName || 'Product thumbnail'}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-xl text-stone-300">📦</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[11px] font-mono text-stone-500 uppercase">
                          {product.details.productType}
                        </span>
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            product.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-800'
                              : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          {product.status}
                        </span>
                      </div>

                      <h3
                        onClick={() => onOpenProduct(product)}
                        className="font-serif text-sm font-bold text-stone-900 truncate hover:text-[#1E3A8A] cursor-pointer"
                        title={product.details.workingName}
                      >
                        {product.details.workingName || 'Untitled Product'}
                      </h3>

                      <p className="text-[11px] text-stone-500 truncate mt-0.5">
                        {product.details.giftGuideName || 'No guide assigned'}
                      </p>
                    </div>
                  </div>

                  {/* Body Metadata */}
                  <div className="p-4 text-xs space-y-2">
                    {product.contextProfileName && (
                      <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-[10px] font-medium text-[#1E3A8A] border border-blue-200/60 max-w-full truncate">
                        <span className="font-semibold uppercase tracking-wider text-[9px]">Profile:</span>
                        <span className="truncate">{product.contextProfileName}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-stone-400 font-medium block">Primary Recipient:</span>
                      <p className="text-stone-700 truncate">{product.details.primaryRecipient || 'Unspecified'}</p>
                    </div>

                    {recommendedTitle && (
                      <div>
                        <span className="text-stone-400 font-medium block">Recommended Title:</span>
                        <p className="font-serif text-[#1E3A8A] font-semibold truncate">&ldquo;{recommendedTitle}&rdquo;</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1 border-t border-stone-100">
                      <span>Modified: {new Date(product.updatedAt).toLocaleDateString()}</span>
                      {product.analysisResult && (
                        <span>Brain v{product.analysisResult.businessBrainVersion}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="px-4 py-3 bg-[#FAF8F5] border-t border-[#E8E4DC] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onDuplicateProduct(product.id)}
                      className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-200/50 rounded transition-colors"
                      title="Duplicate Product Record"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {hasAnalysis && (
                      <>
                        <button
                          onClick={() => handleExportIndividualBrief(product)}
                          className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-200/50 rounded transition-colors"
                          title="Download ChatGPT Brief (.md)"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleExportIndividualJSON(product)}
                          className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-200/50 rounded transition-colors"
                          title="Export Record JSON"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}

                    {products.length > 1 && (
                      <button
                        onClick={() => {
                          const other = products.find((p) => p.id !== product.id) || products[0];
                          setComparisonTarget({ productA: product, productB: other });
                        }}
                        className="p-1.5 text-stone-500 hover:text-[#1E3A8A] hover:bg-blue-50 rounded transition-colors"
                        title="Compare with another product"
                      >
                        <Scale className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => setDeleteConfirmId(product.id)}
                      className="p-1.5 text-stone-400 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                      title="Delete Record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => onOpenProduct(product)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#1E3A8A] hover:bg-[#172554] rounded-md transition-colors shadow-2xs"
                  >
                    <span>Open</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Comparison Pair Modal */}
      {comparisonTarget && (
        <ProductComparisonModal
          productA={comparisonTarget.productA}
          productB={comparisonTarget.productB}
          allProducts={products}
          onClose={() => setComparisonTarget(null)}
          onSelectProductB={(newB) =>
            setComparisonTarget((prev) => (prev ? { ...prev, productB: newB } : null))
          }
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-[#E8E4DC] rounded-xl p-6 max-w-sm w-full shadow-xl animate-in fade-in duration-150">
            <h4 className="font-serif text-base font-bold text-stone-900 mb-2">Delete Product Record?</h4>
            <p className="text-xs text-stone-600 leading-relaxed mb-5">
              Are you sure you want to delete this product and its associated intelligence analysis? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteProduct(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
