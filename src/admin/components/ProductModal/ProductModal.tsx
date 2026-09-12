import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../../../components/common/Modal/Modal';
import ConfirmationModal from '../../../components/common/Modal/ConfirmationModal';
import { useAdminStore, type AdminProduct } from '../../store/adminStore';
import { getAuthToken } from '../../../utils/auth';
import { extractErrorMessage } from '../../../utils/errorMessage';
import { createProduct, updateProduct as updateProductApi } from '../../../services/productService';
import type { Specification, FAQ, SizeGuide, SizeGuideType } from '../../../types/product';
import { COLOR_MAP, parseColorOption } from '../../../utils/constants';
import { calculateDiscountPercentage, getProductPricing } from '../../../utils/pricing';
import { fetchCategoriesTree, createCategory, deleteCategory, type Category } from '../../../services/productService';
import { getNormalizedVariantOptions, getProductStockFromVariants, isSizeVariant, normalizeVariantOption, sanitizeProductVariants } from '../../../utils/productVariants';
import { Folder, FolderOpen, Dot, Plus, X, Images } from 'lucide-react';
import CloudinaryImagePicker from '../CloudinaryImagePicker/CloudinaryImagePicker';
import './ProductModal.css';
import './ProductModalStylesExtension.css';

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: AdminProduct | null;
    onSaved?: () => void;
}


const tabs = ['Datos Básicos', 'Variantes', 'Promociones', 'Descripción', 'Especificaciones', 'FAQ'];
const DEFAULT_VISIBLE_VARIANT_OPTIONS = 6;

const DEFAULT_SIZE_COLUMNS: Record<SizeGuideType, string[]> = {
    indumentaria: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    calzado: ['35', '36', '37', '38', '39', '40', '41', '42'],
};

const ProductModal = ({ isOpen, onClose, product, onSaved }: ProductModalProps) => {
    const { addProduct, updateProduct } = useAdminStore();

    const [activeTab, setActiveTab] = useState(tabs[0]);
    const [dbCategories, setDbCategories] = useState<Category[]>([]);

    // Datos Básicos
    const [name, setName] = useState('');
    const [category, setCategory] = useState('');
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [savingCategory, setSavingCategory] = useState(false);
    const [categoryError, setCategoryError] = useState('');
    const [newCatParentId, setNewCatParentId] = useState<string | null>(null);
    const [showManageCatModal, setShowManageCatModal] = useState(false);
    const [deletingCatId, setDeletingCatId] = useState<string | null>(null);
    const [manageCatError, setManageCatError] = useState('');
    const [deleteCatConfirm, setDeleteCatConfirm] = useState<{ id: string; name: string } | null>(null);
    const [catDropOpen, setCatDropOpen] = useState(false);
    const [expandedCatIds, setExpandedCatIds] = useState<Set<string>>(new Set());
    const [price, setPrice] = useState('');
    const [stock, setStock] = useState('');
    const [condition, setCondition] = useState<'new' | 'used'>('new');
    const [status, setStatus] = useState<'active' | 'inactive'>('active');
    const [images, setImages] = useState<string[]>([]);
    const [pickerOpen, setPickerOpen] = useState(false);

    // Promociones
    const [originalPrice, setOriginalPrice] = useState('');
    const [discount, setDiscount] = useState('');
    const [discountTouched, setDiscountTouched] = useState(false);
    const [freeShipping, setFreeShipping] = useState(false);

    // Descripción
    const [description, setDescription] = useState('');
    const [featuresText, setFeaturesText] = useState('');
    const [warranty, setWarranty] = useState('');
    const [returnPolicy, setReturnPolicy] = useState('');

    // Variantes
    const [variants, setVariants] = useState<{ name: string; optionsText: string; stockByOption?: Record<string, number>; colorsByOption?: Record<string, string[]> }[]>([]);
    const [sizeGuide, setSizeGuide] = useState<SizeGuide>({ type: 'indumentaria', columns: [...DEFAULT_SIZE_COLUMNS.indumentaria], rows: [] });
    const [newColInput, setNewColInput] = useState('');
    const [expandedVariantOptions, setExpandedVariantOptions] = useState<Record<number, boolean>>({});
    const [expandedTalleCbt, setExpandedTalleCbt] = useState<string | null>(null);
    const [customColorName, setCustomColorName] = useState('');
    const [customColorHex, setCustomColorHex] = useState('#000000');
    const [customPaletteColors, setCustomPaletteColors] = useState<Record<string, string>>(() => {
        try { return JSON.parse(localStorage.getItem('db-custom-palette-colors') || '{}'); }
        catch { return {}; }
    });

    const saveCustomPaletteColor = (name: string, hex: string) => {
        const updated = { ...customPaletteColors, [name]: hex };
        setCustomPaletteColors(updated);
        localStorage.setItem('db-custom-palette-colors', JSON.stringify(updated));
    };

    const deleteCustomPaletteColor = (name: string) => {
        const updated = { ...customPaletteColors };
        delete updated[name];
        setCustomPaletteColors(updated);
        localStorage.setItem('db-custom-palette-colors', JSON.stringify(updated));
    };

    // Especificaciones
    const [specifications, setSpecifications] = useState<Specification[]>([]);

    // FAQ
    const [faqs, setFaqs] = useState<FAQ[]>([]);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [outOfStockConfirmOpen, setOutOfStockConfirmOpen] = useState(false);
    const managesStockFromVariants = useMemo(
        () => variants.some((variant) => isSizeVariant(variant.name) && getNormalizedVariantOptions(variant.name, variant.optionsText.split(',')).length > 0),
        [variants]
    );
    const derivedVariantStock = useMemo(() => {
        const builtVariants = sanitizeProductVariants(
            variants.map((variant) => ({
                name: variant.name,
                options: variant.optionsText.split(','),
                stockByOption: variant.stockByOption,
            }))
        );

        return getProductStockFromVariants(builtVariants) ?? 0;
    }, [variants]);

    // Clear category error as soon as a category is selected
    React.useEffect(() => {
        if (category && fieldErrors.category) {
            setFieldErrors(prev => { const n = {...prev}; delete n.category; return n; });
        }
    }, [category]);

    const toggleCatExpand = (id: string) => {
        setExpandedCatIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    // Pre-compute tree once per dbCategories change — avoids O(n³) filters on every render
    const categoryTree = useMemo(() => (
        dbCategories
            .filter(c => c.level === 1)
            .map(cat => ({
                ...cat,
                children: dbCategories
                    .filter(c => c.parent_id === cat.id)
                    .map(sub => ({
                        ...sub,
                        children: dbCategories.filter(c => c.parent_id === sub.id),
                    })),
            }))
    ), [dbCategories]);

    // Misma función que usa la tienda pública: garantiza que la vista previa del
    // admin coincida exactamente con lo que ve el cliente (precio tachado + final).
    const pricingPreview = useMemo(() => getProductPricing({
        price: parseFloat(price) || 0,
        discount: discount ? parseFloat(discount) : undefined,
        originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
    }), [price, discount, originalPrice]);

    const formatMoney = (value: number) =>
        value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const promotionReferencePrice = useMemo(() => {
        if (product?.originalPrice && product.originalPrice > 0) return product.originalPrice;
        if (product?.price && product.price > 0) return product.price;
        return undefined;
    }, [product]);

    const syncPromotionFromPrice = (nextPriceValue: string, ignoreDiscountTouched = false) => {
        if (!product || (discountTouched && !ignoreDiscountTouched)) return;

        const nextPrice = parseFloat(nextPriceValue);
        if (!promotionReferencePrice || !Number.isFinite(nextPrice) || nextPrice <= 0) return;

        if (nextPrice < promotionReferencePrice) {
            const nextDiscount = calculateDiscountPercentage(promotionReferencePrice, nextPrice);
            setOriginalPrice(promotionReferencePrice.toString());
            setDiscount(nextDiscount ? nextDiscount.toString() : '');
            return;
        }

        if (product.originalPrice && nextPrice >= product.originalPrice) {
            setOriginalPrice('');
            setDiscount('');
            return;
        }

        setOriginalPrice(product.originalPrice?.toString() || '');
        setDiscount(product.discount?.toString() || '');
    };

    useEffect(() => {
        if (isOpen) {
            const savedCategory = product?.category || '';
            setExpandedVariantOptions({});
            fetchCategoriesTree().then(cats => {
                setDbCategories(cats);
                // Normaliza: busca la categoría de forma case-insensitive y usa el
                // nombre exacto de la DB para que coincida con el option del árbol.
                const matched = cats.find(c => c.name.toLowerCase() === savedCategory.toLowerCase());
                setCategory(matched ? matched.name : savedCategory);
            });
            setActiveTab(tabs[0]);
            if (product) {
                setName(product.name || '');
                setCategory(savedCategory);
                setPrice(product.price?.toString() || '');
                setStock(product.stock?.toString() || '');
                setCondition(product.condition || 'new');
                setStatus(product.status || 'active');
                setImages(
                    product.images && product.images.length > 0
                        ? [...product.images]
                        : product.imageUrl ? [product.imageUrl] : []
                );
                setOriginalPrice(product.originalPrice?.toString() || '');
                setDiscount(product.discount?.toString() || '');
                setDiscountTouched(false);
                setFreeShipping(product.freeShipping || false);
                setDescription(product.description || '');
                setFeaturesText((product.features || []).join('\n'));
                setWarranty(product.warranty || '');
                setReturnPolicy(product.returnPolicy || '');
                const dbStock = product.stock ?? 0;
                setVariants(
                    (product.variants || []).map(v => ({
                        name: v.name,
                        optionsText: v.options.join(', '),
                        stockByOption: dbStock === 0 && v.stockByOption
                            ? Object.fromEntries(Object.keys(v.stockByOption).map(k => [k, 0]))
                            : v.stockByOption,
                        colorsByOption: v.colorsByOption,
                    }))
                );
                setSizeGuide(product.sizeGuide
                    ? {
                        type: product.sizeGuide.type ?? 'indumentaria',
                        columns: product.sizeGuide.columns
                            ?? [...DEFAULT_SIZE_COLUMNS[product.sizeGuide.type ?? 'indumentaria']],
                        rows: product.sizeGuide.rows,
                    }
                    : { type: 'indumentaria', columns: [...DEFAULT_SIZE_COLUMNS.indumentaria], rows: [] }
                );
                setSpecifications(product.specifications ? [...product.specifications] : []);
                setFaqs(product.faqs ? [...product.faqs] : []);
            } else {
                resetForm();
            }
            setError('');
        }
    }, [isOpen, product]);

    const resetForm = () => {
        setName('');
        setCategory('');
        setPrice('');
        setStock('');
        setCondition('new');
        setStatus('active');
        setImages([]);
        setOriginalPrice('');
        setDiscount('');
        setDiscountTouched(false);
        setFreeShipping(false);
        setDescription('');
        setFeaturesText('');
        setWarranty('');
        setReturnPolicy('');
        setVariants([]);
        setExpandedVariantOptions({});
        setSizeGuide({ type: 'indumentaria', columns: [...DEFAULT_SIZE_COLUMNS.indumentaria], rows: [] });
        setNewColInput('');
        setSpecifications([]);
        setFaqs([]);
        setCustomColorName('');
        setCustomColorHex('#000000');
        setFieldErrors({});
    };

    const buildPayload = () => {
        const validImages = images.filter(url => url.trim() !== '');
        const builtVariants = sanitizeProductVariants(
            variants.map((variant) => ({
                name: variant.name,
                options: variant.optionsText.split(','),
                stockByOption: variant.stockByOption,
                colorsByOption: variant.colorsByOption,
            }))
        ) ?? [];
        const totalStock = getProductStockFromVariants(builtVariants) ?? (parseInt(stock) || 0);

        return {
            name,
            category: category.trim().replace(/\b\w/g, c => c.toUpperCase()),
            price: parseFloat(price),
            originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
            stock: totalStock,
            imageUrl: validImages[0] || '',
            images: validImages,
            condition,
            description,
            discount: discount ? parseFloat(discount) : undefined,
            freeShipping,
            variants: builtVariants,
            specifications,
            features: featuresText.split('\n').map(f => f.trim()).filter(Boolean),
            faqs,
            warranty,
            returnPolicy,
            sizeGuide: sizeGuide.rows.length > 0 ? sizeGuide : undefined,
            status,
        };
    };

    const executeSave = async () => {
        setSaving(true);
        setError('');

        try {
            const token = await getAuthToken();
            const payload = buildPayload();

            if (product?.id) {
                const savedData = await updateProductApi(product.id, payload, token);
                const finalStatus = savedData?.data?.status ?? payload.status;
                updateProduct(product.id, { ...payload, status: finalStatus });
            } else {
                const savedData = await createProduct(payload, token);
                const newProduct: AdminProduct = {
                    id: savedData?.data?.id || Date.now().toString(),
                    ...payload,
                    status: savedData?.data?.status ?? payload.status,
                };
                addProduct(newProduct);
            }

            resetForm();
            onClose();
            onSaved?.();
        } catch (err) {
            setError(extractErrorMessage(err, 'No se pudo guardar el producto'));
        } finally {
            setSaving(false);
        }
    };

    const handleSave = async () => {
        // Validación de borde en el cliente (el backend revalida nombre y precio).
        if (!name.trim()) {
            setFieldErrors({ name: 'El nombre es requerido' });
            setActiveTab('Datos Básicos');
            return;
        }

        const priceValue = parseFloat(price);
        if (!Number.isFinite(priceValue) || priceValue <= 0) {
            setFieldErrors({ price: 'El precio es requerido y debe ser mayor a 0' });
            setActiveTab('Datos Básicos');
            return;
        }

        // Un producto "Activo" sin stock se muestra igual en la tienda marcado
        // "Sin stock" (no se puede comprar), pero requiere que el usuario lo
        // confirme explícitamente en lugar de guardarlo en silencio.
        const payload = buildPayload();
        if (payload.status === 'active' && (payload.stock ?? 0) <= 0) {
            setActiveTab('Datos Básicos');
            setOutOfStockConfirmOpen(true);
            return;
        }

        setFieldErrors({});
        await executeSave();
    };

    const addImage = () => setImages(prev => [...prev, '']);
    const removeImage = (i: number) => setImages(prev => prev.filter((_, j) => j !== i));
    const updateImage = (i: number, value: string) => {
        setImages(prev => {
            const updated = [...prev];
            updated[i] = value;
            return updated;
        });
    };
    const moveImageUp = (i: number) => {
        if (i === 0) return;
        setImages(prev => {
            const updated = [...prev];
            [updated[i - 1], updated[i]] = [updated[i], updated[i - 1]];
            return updated;
        });
    };
    const moveImageDown = (i: number) => {
        setImages(prev => {
            if (i === prev.length - 1) return prev;
            const updated = [...prev];
            [updated[i], updated[i + 1]] = [updated[i + 1], updated[i]];
            return updated;
        });
    };

    const handlePickerSelect = (selectedUrls: string[]) => {
        const newUrls = selectedUrls.filter(url => !images.includes(url));
        setImages(prev => [...prev, ...newUrls]);
    };

    const getNormalizedOptionsFromText = (variantName: string, optionsText: string) => (
        getNormalizedVariantOptions(variantName, optionsText.split(','))
    );

    const syncVariantState = (
        variantName: string,
        optionsText: string,
        stockByOption?: Record<string, number>,
        colorsByOption?: Record<string, string[]>
    ) => {
        const options = getNormalizedOptionsFromText(variantName, optionsText);
        const isSizeVariantName = isSizeVariant(variantName);

        // Solo preservamos las entradas que estaban explícitamente configuradas
        // (array no vacío). Los talles sin configurar quedan como undefined para
        // que ProductDetail los trate como "todos los colores disponibles".
        const nextColorsByOption = isSizeVariantName && colorsByOption
            ? (() => {
                const result = options.reduce<Record<string, string[]>>((acc, option) => {
                    const existing = colorsByOption[option];
                    if (existing && existing.length > 0) acc[option] = existing;
                    return acc;
                }, {});
                return Object.keys(result).length > 0 ? result : undefined;
            })()
            : undefined;

        return {
            optionsText: options.join(', '),
            stockByOption: isSizeVariantName
                ? options.reduce<Record<string, number>>((acc, option) => {
                    acc[option] = Math.max(0, stockByOption?.[option] ?? 0);
                    return acc;
                }, {})
                : undefined,
            colorsByOption: nextColorsByOption,
        };
    };

    const toggleVariantOptions = (variantIndex: number) => {
        setExpandedVariantOptions(prev => ({
            ...prev,
            [variantIndex]: !prev[variantIndex],
        }));
    };

    const updateVariantOptionStock = (variantIndex: number, option: string, rawValue: string) => {
        const nextStock = Math.max(0, Number.parseInt(rawValue.replace(/\D/g, ''), 10) || 0);

        setVariants(prev => prev.map((variant, index) => {
            if (index !== variantIndex) return variant;

            return {
                ...variant,
                stockByOption: {
                    ...(variant.stockByOption || {}),
                    [option]: nextStock,
                },
            };
        }));
    };

    const addVariantOption = (variantIndex: number, rawValue: string) => {
        let added = false;

        setVariants(prev => prev.map((variant, index) => {
            if (index !== variantIndex) return variant;

            const candidate = normalizeVariantOption(variant.name, rawValue);
            if (!candidate) return variant;

            const currentOptions = getNormalizedOptionsFromText(variant.name, variant.optionsText);
            if (currentOptions.includes(candidate)) return variant;

            added = true;
            const syncedState = syncVariantState(
                variant.name,
                [...currentOptions, candidate].join(', '),
                variant.stockByOption,
                variant.colorsByOption
            );

            return {
                ...variant,
                ...syncedState,
            };
        }));

        return added;
    };

    const addVariant = () => setVariants(prev => [...prev, { name: '', optionsText: '' }]);
    const removeVariant = (i: number) => {
        setVariants(variants.filter((_, j) => j !== i));
        setExpandedVariantOptions(prev => {
            const next: Record<number, boolean> = {};
            Object.entries(prev).forEach(([key, value]) => {
                const numericKey = Number(key);
                if (numericKey < i) next[numericKey] = value;
                if (numericKey > i) next[numericKey - 1] = value;
            });
            return next;
        });
    };
    const updateVariant = (i: number, field: 'name' | 'optionsText', value: string) => {
        setVariants(prev => prev.map((variant, index) => {
            if (index !== i) return variant;

            const nextName = field === 'name' ? value : variant.name;
            const nextOptionsText = field === 'optionsText' ? value : variant.optionsText;
            const syncedState = syncVariantState(nextName, nextOptionsText, variant.stockByOption, variant.colorsByOption);

            return {
                ...variant,
                [field]: value,
                ...syncedState,
                name: nextName,
            };
        }));
    };

    const updateVariantColorsByOption = (variantIndex: number, talleOption: string, selectedColors: string[]) => {
        setVariants(prev => prev.map((variant, idx) => {
            if (idx !== variantIndex) return variant;
            const next = { ...(variant.colorsByOption ?? {}), [talleOption]: selectedColors };
            // Array vacío = sin restricción: eliminar la key para que undefined quede claro
            if (selectedColors.length === 0) delete next[talleOption];
            const hasAny = Object.keys(next).length > 0;
            return {
                ...variant,
                colorsByOption: hasAny ? next : undefined,
            };
        }));
    };

    const changeSizeGuideType = (type: SizeGuideType) => {
        setSizeGuide({ type, columns: [...DEFAULT_SIZE_COLUMNS[type]], rows: [] });
    };

    const addSizeGuideColumn = (col: string) => {
        const trimmed = col.trim();
        if (!trimmed) return;
        setSizeGuide(prev => ({
            ...prev,
            columns: [...(prev.columns ?? []), trimmed].filter((c, i, a) => a.indexOf(c) === i),
        }));
        setNewColInput('');
    };

    const removeSizeGuideColumn = (col: string) => {
        setSizeGuide(prev => ({
            ...prev,
            columns: (prev.columns ?? []).filter(c => c !== col),
            rows: prev.rows.map(row => {
                const newValues = { ...row.values };
                delete newValues[col];
                return { ...row, values: newValues };
            }),
        }));
    };

    const addSizeGuideRow = () => setSizeGuide(prev => ({
        ...prev,
        rows: [...prev.rows, { label: '', values: {} }],
    }));

    const removeSizeGuideRow = (rowIdx: number) => setSizeGuide(prev => ({
        ...prev,
        rows: prev.rows.filter((_, i) => i !== rowIdx),
    }));

    const updateSizeGuideRowLabel = (rowIdx: number, label: string) => setSizeGuide(prev => ({
        ...prev,
        rows: prev.rows.map((row, i) => i === rowIdx ? { ...row, label } : row),
    }));

    const updateSizeGuideRowValue = (rowIdx: number, size: string, value: string) => setSizeGuide(prev => ({
        ...prev,
        rows: prev.rows.map((row, i) => i === rowIdx ? { ...row, values: { ...row.values, [size]: value } } : row),
    }));

    const addSpec = () => setSpecifications([...specifications, { label: '', value: '' }]);
    const removeSpec = (i: number) => setSpecifications(specifications.filter((_, j) => j !== i));
    const updateSpec = (i: number, field: 'label' | 'value', value: string) => {
        const updated = [...specifications];
        updated[i] = { ...updated[i], [field]: value };
        setSpecifications(updated);
    };

    const handleCreateCategory = async () => {
        if (!newCatName.trim()) return;
        setSavingCategory(true);
        setCategoryError('');
        try {
            const parentCat = newCatParentId ? dbCategories.find(c => c.id === newCatParentId) : null;
            const level = parentCat ? parentCat.level + 1 : 1;
            const created = await createCategory(newCatName.trim(), newCatParentId, level);
            const updated = await fetchCategoriesTree();
            setDbCategories(updated);
            setCategory(created.name);
            setShowCategoryModal(false);
            setNewCatName('');
            setNewCatParentId(null);
        } catch (err) {
            setCategoryError(extractErrorMessage(err, 'No se pudo crear la categoría'));
        } finally {
            setSavingCategory(false);
        }
    };

    const handleDeleteCategory = async (id: string, name: string) => {
        setDeleteCatConfirm({ id, name });
    };

    const confirmDeleteCategory = async () => {
        if (!deleteCatConfirm) return;
        const { id, name } = deleteCatConfirm;
        setDeletingCatId(id);
        setManageCatError('');
        try {
            await deleteCategory(id);
            const updated = await fetchCategoriesTree();
            setDbCategories(updated);
            if (category === name) setCategory('');
        } catch (err) {
            setManageCatError(extractErrorMessage(err, 'No se pudo eliminar la categoría'));
        } finally {
            setDeletingCatId(null);
        }
    };

    const addFaq = () => setFaqs([...faqs, { question: '', answer: '' }]);
    const removeFaq = (i: number) => setFaqs(faqs.filter((_, j) => j !== i));
    const updateFaq = (i: number, field: 'question' | 'answer', value: string) => {
        const updated = [...faqs];
        updated[i] = { ...updated[i], [field]: value };
        setFaqs(updated);
    };

    return (
        <>
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={product ? 'Editar Producto' : 'Nuevo Producto'}
        >
            <div className="product-modal-container">
                <div className="product-modal-sidebar">
                    {tabs.map(tab => {
                        const hasError = tab === 'Datos Básicos' && Object.keys(fieldErrors).length > 0;
                        return (
                            <button
                                key={tab}
                                className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab)}
                            >
                                {tab}
                                {hasError && <span className="tab-btn__error-dot" />}
                            </button>
                        );
                    })}
                </div>

                <div className="product-modal-content">
                    {error && (
                        <div style={{ color: 'red', marginBottom: '1rem', padding: '0.5rem', background: '#fff0f0', borderRadius: '0.25rem' }}>
                            {error}
                        </div>
                    )}
                    {/* ── DATOS BÁSICOS ── */}
                    {activeTab === 'Datos Básicos' && (
                        <div className="tab-pane">
                            <h3>Datos Básicos</h3>
                            <div className="admin-form-grid">
                                <div className={`form-group${fieldErrors.name ? ' form-group--error' : ''}`}>
                                    <label>Nombre del producto</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: Remera Básica"
                                        value={name}
                                        onChange={e => { setName(e.target.value); if (fieldErrors.name) setFieldErrors(prev => { const n = {...prev}; delete n.name; return n; }); }}
                                    />
                                    {fieldErrors.name && <span className="field-error-msg">{fieldErrors.name}</span>}
                                </div>
                                <div className={`form-group${fieldErrors.category ? ' form-group--error' : ''}`}>
                                    <label>Categoría</label>
                                    <div className="cat-drop-wrapper">
                                        {catDropOpen && (
                                            <div
                                                className="cat-drop-backdrop"
                                                onClick={() => setCatDropOpen(false)}
                                            />
                                        )}
                                        <button
                                            type="button"
                                            className={`cat-drop-trigger${catDropOpen ? ' cat-drop-trigger--open' : ''}`}
                                            onClick={() => setCatDropOpen(o => !o)}
                                        >
                                            <span className={category ? '' : 'cat-drop-placeholder'}>
                                                {category || '-- Seleccionar categoría --'}
                                            </span>
                                            <svg className="cat-drop-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="6 9 12 15 18 9" />
                                            </svg>
                                        </button>
                                        {catDropOpen && (
                                            <div className="cat-drop-panel">
                                                <div
                                                    className="cat-drop-item"
                                                    onClick={() => { setCategory(''); setCatDropOpen(false); }}
                                                >
                                                    <span className="cat-drop-placeholder">-- Seleccionar categoría --</span>
                                                </div>
                                                {/* Fallback: categoría actual no encontrada en el árbol */}
                                                {category && !dbCategories.some(c => c.name.toLowerCase() === category.toLowerCase()) && (
                                                    <div
                                                        className="cat-drop-item cat-drop-item--active"
                                                        onClick={() => setCatDropOpen(false)}
                                                    >
                                                        {category}
                                                    </div>
                                                )}
                                                {dbCategories.filter(c => c.level === 1).map(root => {
                                                    const children = dbCategories.filter(c => c.parent_id === root.id);
                                                    const rootExpanded = expandedCatIds.has(root.id);
                                                    return (
                                                        <div key={root.id} className="cat-drop-group">
                                                            <div className="cat-drop-group-row">
                                                                <div
                                                                    className={`cat-drop-item cat-drop-item--root${category === root.name ? ' cat-drop-item--active' : ''}`}
                                                                    onClick={() => { setCategory(root.name); setCatDropOpen(false); setExpandedCatIds(new Set()); }}
                                                                >
                                                                    {root.name}
                                                                </div>
                                                                {children.length > 0 && (
                                                                    <button
                                                                        type="button"
                                                                        className="cat-drop-expand"
                                                                        onClick={() => toggleCatExpand(root.id)}
                                                                    >
                                                                        {rootExpanded ? '▲ ocultar' : 'ver más'}
                                                                    </button>
                                                                )}
                                                            </div>
                                                            {rootExpanded && children.map(child => {
                                                                const grandchildren = dbCategories.filter(c => c.parent_id === child.id);
                                                                const childExpanded = expandedCatIds.has(child.id);
                                                                return (
                                                                    <div key={child.id} className="cat-drop-subgroup">
                                                                        <div className="cat-drop-group-row">
                                                                            <div
                                                                                className={`cat-drop-item cat-drop-item--sub${category === child.name ? ' cat-drop-item--active' : ''}`}
                                                                                onClick={() => { setCategory(child.name); setCatDropOpen(false); setExpandedCatIds(new Set()); }}
                                                                            >
                                                                                {child.name}
                                                                            </div>
                                                                            {grandchildren.length > 0 && (
                                                                                <button
                                                                                    type="button"
                                                                                    className="cat-drop-expand cat-drop-expand--sm"
                                                                                    onClick={() => toggleCatExpand(child.id)}
                                                                                >
                                                                                    {childExpanded ? '▲ ocultar' : 'ver más'}
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                        {childExpanded && grandchildren.map(gc => (
                                                                            <div
                                                                                key={gc.id}
                                                                                className={`cat-drop-item cat-drop-item--subsub${category === gc.name ? ' cat-drop-item--active' : ''}`}
                                                                                onClick={() => { setCategory(gc.name); setCatDropOpen(false); setExpandedCatIds(new Set()); }}
                                                                            >
                                                                                {gc.name}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    {dbCategories.length > 0 && (
                                        <button
                                            type="button"
                                            className="cat-manage-link"
                                            onClick={() => { setShowManageCatModal(true); setManageCatError(''); }}
                                        >
                                            Gestionar categorías
                                        </button>
                                    )}
                                    {fieldErrors.category && <span className="field-error-msg">{fieldErrors.category}</span>}
                                </div>
                                <div className={`form-group${fieldErrors.price ? ' form-group--error' : ''}`}>
                                    <label>Precio ($)</label>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={price}
                                        onChange={e => {
                                            setPrice(e.target.value);
                                            syncPromotionFromPrice(e.target.value);
                                            if (fieldErrors.price) setFieldErrors(prev => { const n = {...prev}; delete n.price; return n; });
                                        }}
                                    />
                                    {fieldErrors.price && <span className="field-error-msg">{fieldErrors.price}</span>}
                                </div>
                                <div className={`form-group${fieldErrors.stock ? ' form-group--error' : ''}`}>
                                    <label>{managesStockFromVariants ? 'Stock total' : 'Stock disponible'}</label>
                                    {managesStockFromVariants ? (
                                        <div className="stock-derived-card">
                                            <strong>{derivedVariantStock}</strong>
                                            <span>Se calcula automáticamente desde los talles configurados en Variantes.</span>
                                        </div>
                                    ) : (
                                        <input
                                            type="number"
                                            placeholder="0"
                                            value={stock}
                                            onChange={e => { setStock(e.target.value); if (fieldErrors.stock) setFieldErrors(prev => { const n = {...prev}; delete n.stock; return n; }); }}
                                        />
                                    )}
                                    {fieldErrors.stock && <span className="field-error-msg">{fieldErrors.stock}</span>}
                                </div>
                                <div className="form-group">
                                    <label>Condición</label>
                                    <select
                                        value={condition}
                                        onChange={e => setCondition(e.target.value as 'new' | 'used')}
                                    >
                                        <option value="new">Nuevo</option>
                                        <option value="used">Usado</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Estado</label>
                                    <select
                                        value={status}
                                        onChange={e => setStatus(e.target.value as 'active' | 'inactive')}
                                    >
                                        <option value="active">Activo</option>
                                        <option value="inactive">Inactivo</option>
                                    </select>
                                </div>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label>Imágenes del producto</label>
                                    <p style={{ fontSize: '0.82rem', color: '#666', margin: '0 0 0.75rem' }}>
                                        La primera imagen será la principal. Podés agregar, reordenar o eliminar imágenes usando URLs.
                                    </p>
                                    <div className="img-manager">
                                        {images.length === 0 && (
                                            <p className="img-manager__empty">Sin imágenes. Agregá al menos una URL.</p>
                                        )}
                                        {images.map((url, i) => (
                                            <div key={i} className="img-manager__row">
                                                <div className="img-manager__order">
                                                    <button
                                                        type="button"
                                                        className="img-manager__move-btn"
                                                        onClick={() => moveImageUp(i)}
                                                        disabled={i === 0}
                                                        title="Subir"
                                                    >▲</button>
                                                    <span className="img-manager__idx">
                                                        {i === 0
                                                            ? <span className="img-manager__badge">Principal</span>
                                                            : i + 1
                                                        }
                                                    </span>
                                                    <button
                                                        type="button"
                                                        className="img-manager__move-btn"
                                                        onClick={() => moveImageDown(i)}
                                                        disabled={i === images.length - 1}
                                                        title="Bajar"
                                                    >▼</button>
                                                </div>
                                                <div className="img-manager__preview">
                                                    {url.trim() ? (
                                                        <img
                                                            src={url}
                                                            alt={`Imagen ${i + 1}`}
                                                            className="img-manager__thumb"
                                                            onError={e => {
                                                                (e.target as HTMLImageElement).style.opacity = '0';
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="img-manager__thumb img-manager__thumb--empty" />
                                                    )}
                                                </div>
                                                <input
                                                    type="url"
                                                    className="img-manager__input"
                                                    placeholder="https://ejemplo.com/imagen.jpg"
                                                    value={url}
                                                    onChange={e => updateImage(i, e.target.value)}
                                                />
                                                <button
                                                    type="button"
                                                    className="img-manager__delete-btn"
                                                    onClick={() => removeImage(i)}
                                                    title="Eliminar imagen"
                                                >✕</button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="img-manager__actions">
                                        <button
                                            type="button"
                                            className="admin-btn-secondary"
                                            onClick={addImage}
                                        >
                                            + Agregar imagen
                                        </button>
                                        <button
                                            type="button"
                                            className="admin-btn-secondary"
                                            onClick={() => setPickerOpen(true)}
                                        >
                                            <Images size={14} /> Seleccionar de Cloudinary
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── VARIANTES ── */}
                    {activeTab === 'Variantes' && (
                        <div className="tab-pane">
                            <h3>Variantes</h3>
                            <p style={{ color: '#666', fontSize: '0.88rem', marginBottom: '1rem' }}>
                                Ej: nombre "Color" con opciones desde la paleta — nombre "Talle" con opciones "S, M, L, XL"
                            </p>
                            <div className="variants-container">
                            {variants.map((v, i) => {
                                const isColorVariant = v.name.toLowerCase() === 'color';
                                const selectedColors = v.optionsText
                                    .split(',').map(s => s.trim()).filter(Boolean);
                                return (
                                    <div key={i} className="variant-card">
                                        <div className="admin-form-grid">
                                            <div className="form-group">
                                                <label>Nombre de variante</label>
                                                <input
                                                    type="text"
                                                    placeholder="Ej: Color"
                                                    value={v.name}
                                                    onChange={e => updateVariant(i, 'name', e.target.value)}
                                                />
                                            </div>
                                            {isColorVariant ? (
                                                <div className="form-group">
                                                    <label>Colores disponibles</label>
                                                    <div className="color-palette-picker">
                                                        {Object.entries(COLOR_MAP).map(([colorName, hex]) => {
                                                            const isSelected = selectedColors.includes(colorName);
                                                            return (
                                                                <button
                                                                    key={colorName}
                                                                    type="button"
                                                                    title={colorName}
                                                                    className={`color-palette__swatch${isSelected ? ' color-palette__swatch--selected' : ''}`}
                                                                    style={{ backgroundColor: hex }}
                                                                    onClick={() => {
                                                                        const current = new Set(selectedColors);
                                                                        if (current.has(colorName)) {
                                                                            current.delete(colorName);
                                                                        } else {
                                                                            current.add(colorName);
                                                                        }
                                                                        updateVariant(i, 'optionsText', [...current].join(', '));
                                                                    }}
                                                                />
                                                            );
                                                        })}
                                                        {Object.entries(customPaletteColors).map(([colorName, hex]) => {
                                                            const entry = `${colorName}|${hex}`;
                                                            const isSelected = selectedColors.includes(entry);
                                                            return (
                                                                <div key={colorName} className="color-palette__swatch-wrapper">
                                                                    <button
                                                                        type="button"
                                                                        title={colorName}
                                                                        className={`color-palette__swatch color-palette__swatch--saved-custom${isSelected ? ' color-palette__swatch--selected' : ''}`}
                                                                        style={{ backgroundColor: hex }}
                                                                        onClick={() => {
                                                                            const current = new Set(selectedColors);
                                                                            if (current.has(entry)) {
                                                                                current.delete(entry);
                                                                            } else {
                                                                                current.add(entry);
                                                                            }
                                                                            updateVariant(i, 'optionsText', [...current].join(', '));
                                                                        }}
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        className="color-palette__swatch-delete"
                                                                        title={`Eliminar ${colorName} de la paleta`}
                                                                        onClick={() => {
                                                                            deleteCustomPaletteColor(colorName);
                                                                            const newSelected = selectedColors.filter(c => c !== entry);
                                                                            if (newSelected.length !== selectedColors.length) {
                                                                                updateVariant(i, 'optionsText', newSelected.join(', '));
                                                                            }
                                                                        }}
                                                                    >✕</button>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    {/* Colores custom ya agregados */}
                                                    {selectedColors.filter(c => c.includes('|#')).length > 0 && (
                                                        <div className="color-custom-tags">
                                                            {selectedColors.filter(c => c.includes('|#')).map(c => {
                                                                const pipeIdx = c.indexOf('|#');
                                                                const cName = c.slice(0, pipeIdx);
                                                                const cHex = c.slice(pipeIdx + 1);
                                                                return (
                                                                    <span key={c} className="color-custom-tag">
                                                                        <span className="color-custom-tag__dot" style={{ backgroundColor: cHex }} />
                                                                        {cName}
                                                                        <button
                                                                            type="button"
                                                                            className="color-custom-tag__remove"
                                                                            onClick={() => {
                                                                                const current = selectedColors.filter(s => s !== c);
                                                                                updateVariant(i, 'optionsText', current.join(', '));
                                                                            }}
                                                                        >✕</button>
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                    {selectedColors.length > 0 && (
                                                        <p className="color-palette__selected-label">
                                                            Seleccionados: {selectedColors.map(c => c.includes('|#') ? c.slice(0, c.indexOf('|#')) : c).join(', ')}
                                                        </p>
                                                    )}
                                                    {/* Agregar color personalizado */}
                                                    {(() => {
                                                        const trimmed = customColorName.trim().toLowerCase();
                                                        const existingNames = selectedColors.map(c =>
                                                            c.includes('|#') ? c.slice(0, c.indexOf('|#')).toLowerCase() : c.toLowerCase()
                                                        );
                                                        const isInSelected = trimmed.length > 0 && existingNames.includes(trimmed);
                                                        const isInColorMap = trimmed.length > 0 && Object.keys(COLOR_MAP).some(k => k.toLowerCase() === trimmed);
                                                        const isInCustomPalette = trimmed.length > 0 && Object.keys(customPaletteColors).some(k => k.toLowerCase() === trimmed);
                                                        const isDuplicate = isInSelected || isInColorMap || isInCustomPalette;
                                                        const duplicateMsg = isInSelected
                                                            ? 'Ya existe ese color en la lista'
                                                            : isInColorMap
                                                            ? 'Ya existe ese color en la paleta'
                                                            : 'Ya existe ese color en los colores guardados';
                                                        return (
                                                            <>
                                                                <div className="color-custom-add">
                                                                    <span className="color-custom-add__label">Color personalizado:</span>
                                                                    <input
                                                                        type="text"
                                                                        className={`color-custom-add__name${isDuplicate ? ' color-custom-add__name--error' : ''}`}
                                                                        placeholder="Nombre (ej: Turquesa)"
                                                                        value={customColorName}
                                                                        onChange={e => setCustomColorName(e.target.value)}
                                                                    />
                                                                    <input
                                                                        type="color"
                                                                        className="color-custom-add__picker"
                                                                        value={customColorHex}
                                                                        onChange={e => setCustomColorHex(e.target.value)}
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        className="color-custom-add__btn"
                                                                        disabled={!customColorName.trim() || isDuplicate}
                                                                        onClick={() => {
                                                                            const t = customColorName.trim();
                                                                            if (!t) return;
                                                                            const newEntry = `${t}|${customColorHex}`;
                                                                            const current = selectedColors.filter(Boolean);
                                                                            updateVariant(i, 'optionsText', [...current, newEntry].join(', '));
                                                                            // Guardar en paleta si no existe en COLOR_MAP ni en paleta custom
                                                                            const inMap = Object.keys(COLOR_MAP).some(k => k.toLowerCase() === t.toLowerCase());
                                                                            const inCustom = Object.keys(customPaletteColors).some(k => k.toLowerCase() === t.toLowerCase());
                                                                            if (!inMap && !inCustom) {
                                                                                saveCustomPaletteColor(t, customColorHex);
                                                                            }
                                                                            setCustomColorName('');
                                                                            setCustomColorHex('#000000');
                                                                        }}
                                                                    >
                                                                        + Agregar
                                                                    </button>
                                                                </div>
                                                                {isDuplicate && (
                                                                    <p className="color-custom-add__duplicate">
                                                                        {duplicateMsg}
                                                                    </p>
                                                                )}
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            ) : (
                                                <div className="form-group">
                                                    <label>Opciones disponibles</label>
                                                    <div className="options-editor">
                                                        <div className="options-list">
                                                            {(() => {
                                                                const isTalleVariant = isSizeVariant(v.name);
                                                                const options = getNormalizedOptionsFromText(v.name, v.optionsText);
                                                                const shouldCollapseOptions = options.length > DEFAULT_VISIBLE_VARIANT_OPTIONS;
                                                                const isExpanded = expandedVariantOptions[i] || false;
                                                                const visibleOptions = shouldCollapseOptions && !isExpanded
                                                                    ? options.slice(0, DEFAULT_VISIBLE_VARIANT_OPTIONS)
                                                                    : options;

                                                                return visibleOptions.map((option) => {
                                                                    const normalizedOption = normalizeVariantOption(v.name, option);
                                                                    const currentStock = v.stockByOption?.[normalizedOption] ?? 0;

                                                                    return (
                                                                        <div key={normalizedOption} className={`option-tag${isTalleVariant ? ' option-tag--size' : ''}`}>
                                                                            <div className="option-tag__content">
                                                                                <span className="option-tag__label">{option}</span>
                                                                                {isTalleVariant && (
                                                                                    <label className="option-tag__stock-field">
                                                                                        <span className="option-tag__stock-label">Stock</span>
                                                                                        <input
                                                                                            type="text"
                                                                                            inputMode="numeric"
                                                                                            pattern="[0-9]*"
                                                                                            placeholder="0"
                                                                                            value={currentStock}
                                                                                            onChange={(e) => {
                                                                                                updateVariantOptionStock(i, normalizedOption, e.target.value);
                                                                                            }}
                                                                                            className="option-tag__stock-input"
                                                                                            aria-label={`Stock para talle ${option}`}
                                                                                        />
                                                                                    </label>
                                                                                )}
                                                                            </div>
                                                                            <button
                                                                                type="button"
                                                                                className="option-tag__remove"
                                                                                aria-label={`Eliminar opción ${option}`}
                                                                                onClick={() => {
                                                                                    const remaining = options.filter(currentOption => currentOption !== normalizedOption);
                                                                                    updateVariant(i, 'optionsText', remaining.join(', '));
                                                                                }}
                                                                            >
                                                                                <X size={14} />
                                                                            </button>
                                                                        </div>
                                                                    );
                                                                });
                                                            })()}
                                                        </div>
                                                        {(() => {
                                                            const totalOptions = getNormalizedOptionsFromText(v.name, v.optionsText).length;
                                                            if (totalOptions <= DEFAULT_VISIBLE_VARIANT_OPTIONS) return null;

                                                            const isExpanded = expandedVariantOptions[i] || false;
                                                            const hiddenCount = totalOptions - DEFAULT_VISIBLE_VARIANT_OPTIONS;

                                                            return (
                                                                <button
                                                                    type="button"
                                                                    className="options-toggle-btn"
                                                                    onClick={() => toggleVariantOptions(i)}
                                                                >
                                                                    {isExpanded ? 'Ver menos' : `Ver más (${hiddenCount})`}
                                                                </button>
                                                            );
                                                        })()}
                                                        <div className="option-input-group">
                                                            <input
                                                                type="text"
                                                                placeholder={`Ej: ${v.name === 'Talle' ? 'XL' : v.name === 'Material' ? 'Algodón' : 'Nueva opción'}`}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        e.preventDefault();
                                                                        const added = addVariantOption(i, e.currentTarget.value);
                                                                        if (added) {
                                                                            e.currentTarget.value = '';
                                                                        }
                                                                    }
                                                                }}
                                                            />
                                                            <button
                                                                type="button"
                                                                className="option-add-btn"
                                                                onClick={(e) => {
                                                                    const input = (e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement);
                                                                    if (input) {
                                                                        const added = addVariantOption(i, input.value);
                                                                        if (added) {
                                                                            input.value = '';
                                                                            input.focus();
                                                                        }
                                                                    }
                                                                }}
                                                            >
                                                                <Plus size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        {/* ── Color por talle ── */}
                                        {isSizeVariant(v.name) && (() => {
                                            const colorVariant = variants.find(vv => vv.name.toLowerCase() === 'color');
                                            if (!colorVariant) return null;
                                            const allColorOptions = colorVariant.optionsText
                                                .split(',').map(s => s.trim()).filter(Boolean);
                                            if (allColorOptions.length === 0) return null;
                                            const talleOptions = getNormalizedOptionsFromText(v.name, v.optionsText);
                                            if (talleOptions.length === 0) return null;
                                            return (
                                                <div className="colors-by-talle-section">
                                                    <p className="colors-by-talle-section__title">
                                                        Colores disponibles por talle
                                                        <span className="colors-by-talle-section__optional">(opcional)</span>
                                                    </p>
                                                    <p className="colors-by-talle-section__hint">
                                                        Por defecto todos los colores están disponibles en cada talle. Tocá un talle para restringir cuáles se pueden elegir.
                                                    </p>
                                                    <div className="cbt-accordion">
                                                        {talleOptions.map(talleOpt => {
                                                            const selectedForTalle = v.colorsByOption?.[talleOpt] ?? [];
                                                            const isConfigured = selectedForTalle.length > 0;
                                                            const isExpanded = expandedTalleCbt === talleOpt;
                                                            return (
                                                                <div key={talleOpt} className={`cbt-item${isConfigured ? ' cbt-item--active' : ''}${isExpanded ? ' cbt-item--open' : ''}`}>
                                                                    {/* Cabecera: siempre visible, clickeable */}
                                                                    <button
                                                                        type="button"
                                                                        className="cbt-item__header"
                                                                        onClick={() => setExpandedTalleCbt(isExpanded ? null : talleOpt)}
                                                                    >
                                                                        <span className="cbt-item__size">{talleOpt}</span>
                                                                        <div className="cbt-item__preview">
                                                                            {isConfigured ? (
                                                                                <>
                                                                                    {selectedForTalle.slice(0, 6).map(c => {
                                                                                        const { hex } = parseColorOption(c);
                                                                                        return <span key={c} className="cbt-item__dot" style={{ background: hex }} />;
                                                                                    })}
                                                                                    {selectedForTalle.length > 6 && (
                                                                                        <span className="cbt-item__more">+{selectedForTalle.length - 6}</span>
                                                                                    )}
                                                                                </>
                                                                            ) : (
                                                                                <span className="cbt-item__free">Todos disponibles</span>
                                                                            )}
                                                                        </div>
                                                                        <span className={`cbt-item__chevron${isExpanded ? ' cbt-item__chevron--open' : ''}`}>›</span>
                                                                    </button>

                                                                    {/* Cuerpo expandido: grilla de colores con nombre */}
                                                                    {isExpanded && (
                                                                        <div className="cbt-item__body">
                                                                            <div className="cbt-color-grid">
                                                                                {allColorOptions.map(colorOpt => {
                                                                                    const { name: colorName, hex: colorHex } = parseColorOption(colorOpt);
                                                                                    const isChecked = selectedForTalle.includes(colorOpt);
                                                                                    return (
                                                                                        <button
                                                                                            key={colorOpt}
                                                                                            type="button"
                                                                                            className={`cbt-color-card${isChecked ? ' cbt-color-card--on' : ''}`}
                                                                                            onClick={() => {
                                                                                                const next = isChecked
                                                                                                    ? selectedForTalle.filter(c => c !== colorOpt)
                                                                                                    : [...selectedForTalle, colorOpt];
                                                                                                updateVariantColorsByOption(i, talleOpt, next);
                                                                                            }}
                                                                                        >
                                                                                            <span className="cbt-color-card__circle" style={{ background: colorHex }}>
                                                                                                {isChecked && <span className="cbt-color-card__check">✓</span>}
                                                                                            </span>
                                                                                            <span className="cbt-color-card__name">{colorName}</span>
                                                                                        </button>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                            {isConfigured && (
                                                                                <button
                                                                                    type="button"
                                                                                    className="cbt-reset"
                                                                                    onClick={() => updateVariantColorsByOption(i, talleOpt, [])}
                                                                                >
                                                                                    Quitar restricción
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                        <button
                                            className="admin-btn-secondary"
                                            style={{ marginTop: '0.25rem' }}
                                            onClick={() => removeVariant(i)}
                                        >
                                            Eliminar variante
                                        </button>
                                    </div>
                                );
                            })}
                            </div>
                            <div className="add-variant-btn-wrapper">
                                <button className="admin-btn-secondary" style={{ width: '100%' }} onClick={addVariant}>
                                    + Agregar variante
                                </button>
                            </div>

                            {/* ── Guía de talles ── */}
                            <div className="size-guide-editor">
                                <p className="size-guide-editor__title">Guía de talles</p>
                                <div className="size-guide-type-selector">
                                    <button
                                        type="button"
                                        className={`size-guide-type-btn${sizeGuide.type === 'indumentaria' ? ' size-guide-type-btn--active' : ''}`}
                                        onClick={() => changeSizeGuideType('indumentaria')}
                                    >
                                        Indumentaria
                                    </button>
                                    <button
                                        type="button"
                                        className={`size-guide-type-btn${sizeGuide.type === 'calzado' ? ' size-guide-type-btn--active' : ''}`}
                                        onClick={() => changeSizeGuideType('calzado')}
                                    >
                                        Calzado
                                    </button>
                                </div>
                                <p className="size-guide-editor__hint">
                                    {sizeGuide.type === 'calzado'
                                        ? 'Configurá las medidas por número (ej: "Largo plantilla" → 35: 22.5 cm, 36: 23 cm). El usuario la verá en el botón "Ver guía de talles".'
                                        : 'Configurá las medidas por talle (ej: "Pecho" → S: 86 cm, M: 91 cm). El usuario la verá en el botón "Ver guía de talles".'}
                                </p>

                                <div className="size-guide-cols-manager">
                                    <span className="size-guide-cols-label">Talles:</span>
                                    <div className="size-guide-cols-chips">
                                        {(sizeGuide.columns ?? []).map(col => (
                                            <span key={col} className="size-guide-col-chip">
                                                {col}
                                                <button
                                                    type="button"
                                                    className="size-guide-col-chip__del"
                                                    onClick={() => removeSizeGuideColumn(col)}
                                                    title={`Quitar talle ${col}`}
                                                >
                                                    <X size={10} />
                                                </button>
                                            </span>
                                        ))}
                                        <div className="size-guide-col-add">
                                            <input
                                                type="text"
                                                className="size-guide-col-add__input"
                                                placeholder={sizeGuide.type === 'calzado' ? 'Ej: 43' : 'Ej: XXXL'}
                                                value={newColInput}
                                                onChange={e => setNewColInput(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSizeGuideColumn(newColInput); } }}
                                            />
                                            <button
                                                type="button"
                                                className="size-guide-col-add__btn"
                                                onClick={() => addSizeGuideColumn(newColInput)}
                                            >
                                                + Agregar
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {(sizeGuide.columns ?? []).length > 0 && (
                                    <>
                                        <div className="size-guide-table-wrapper">
                                            <table className="size-guide-table">
                                                <thead>
                                                    <tr>
                                                        <th className="size-guide-table__label-col">Medida</th>
                                                        {(sizeGuide.columns ?? []).map(s => (
                                                            <th key={s} className="size-guide-table__size-col">{s}</th>
                                                        ))}
                                                        <th className="size-guide-table__del-col" />
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {sizeGuide.rows.map((row, rowIdx) => (
                                                        <tr key={rowIdx}>
                                                            <td>
                                                                <input
                                                                    type="text"
                                                                    className="size-guide-table__input"
                                                                    placeholder={sizeGuide.type === 'calzado' ? 'Ej: Largo plantilla (cm)' : 'Ej: Pecho (cm)'}
                                                                    value={row.label}
                                                                    onChange={e => updateSizeGuideRowLabel(rowIdx, e.target.value)}
                                                                />
                                                            </td>
                                                            {(sizeGuide.columns ?? []).map(s => (
                                                                <td key={s}>
                                                                    <input
                                                                        type="text"
                                                                        className="size-guide-table__input size-guide-table__input--value"
                                                                        placeholder="—"
                                                                        value={row.values[s] ?? ''}
                                                                        onChange={e => updateSizeGuideRowValue(rowIdx, s, e.target.value)}
                                                                    />
                                                                </td>
                                                            ))}
                                                            <td>
                                                                <button
                                                                    type="button"
                                                                    className="size-guide-table__del-btn"
                                                                    onClick={() => removeSizeGuideRow(rowIdx)}
                                                                    title="Eliminar fila"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        {sizeGuide.rows.length === 0 && (
                                            <p className="size-guide-editor__empty">Sin filas. Agregá una medida para empezar.</p>
                                        )}
                                        <button
                                            type="button"
                                            className="admin-btn-secondary"
                                            style={{ marginTop: '0.5rem' }}
                                            onClick={addSizeGuideRow}
                                        >
                                            + Agregar medida
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── PROMOCIONES ── */}
                    {activeTab === 'Promociones' && (
                        <div className="tab-pane">
                            <h3>Promociones</h3>
                            <div className="admin-form-grid">
                                <div className="form-group">
                                    <label>Descuento (%)</label>
                                    <input
                                        type="number"
                                        placeholder="Ej: 20"
                                        value={discount}
                                        min="0"
                                        max="100"
                                        onChange={e => {
                                            setDiscountTouched(Boolean(e.target.value));
                                            setDiscount(e.target.value);
                                            if (!e.target.value) {
                                                setOriginalPrice('');
                                                syncPromotionFromPrice(price, true);
                                            }
                                        }}
                                    />
                                    {price && (
                                        pricingPreview.hasPromotion ? (
                                            <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                                                Vista del cliente:{' '}
                                                <span style={{ textDecoration: 'line-through' }}>${formatMoney(pricingPreview.originalPrice ?? 0)}</span>
                                                {' → '}
                                                <strong>${formatMoney(pricingPreview.finalPrice)}</strong>
                                                {pricingPreview.discountPercentage ? ` (${pricingPreview.discountPercentage}% OFF)` : ''}
                                            </p>
                                        ) : (
                                            <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                                                Sin promoción: el cliente verá ${formatMoney(parseFloat(price) || 0)}
                                            </p>
                                        )
                                    )}
                                </div>
                                <div className="form-group">
                                    <label>Envío gratis</label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '0.5rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={freeShipping}
                                            onChange={e => setFreeShipping(e.target.checked)}
                                        />
                                        Activar envío gratis
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── DESCRIPCIÓN ── */}
                    {activeTab === 'Descripción' && (
                        <div className="tab-pane">
                            <h3>Descripción</h3>
                            <div className="form-group">
                                <label>Descripción del producto</label>
                                <textarea
                                    rows={5}
                                    placeholder="Descripción detallada del producto..."
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label>Características principales (una por línea)</label>
                                <textarea
                                    rows={4}
                                    placeholder={"Tela de algodón 100%\nLavado a mano\nDisponible en varios colores"}
                                    value={featuresText}
                                    onChange={e => setFeaturesText(e.target.value)}
                                />
                            </div>
                            <div className="admin-form-grid">
                                <div className="form-group">
                                    <label>Garantía</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: 6 meses"
                                        value={warranty}
                                        onChange={e => setWarranty(e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Política de devolución</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: 30 días para devoluciones"
                                        value={returnPolicy}
                                        onChange={e => setReturnPolicy(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── ESPECIFICACIONES ── */}
                    {activeTab === 'Especificaciones' && (
                        <div className="tab-pane">
                            <h3>Especificaciones técnicas</h3>
                            <p style={{ color: '#666', fontSize: '0.88rem', marginBottom: '1rem' }}>
                                Ej: "Material" → "100% Algodón", "Talle" → "S / M / L / XL"
                            </p>
                            {specifications.map((spec, i) => (
                                <div
                                    key={i}
                                    style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}
                                >
                                    <input
                                        type="text"
                                        placeholder="Característica"
                                        value={spec.label}
                                        onChange={e => updateSpec(i, 'label', e.target.value)}
                                        style={{ flex: 1 }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Valor"
                                        value={spec.value}
                                        onChange={e => updateSpec(i, 'value', e.target.value)}
                                        style={{ flex: 1 }}
                                    />
                                    <button
                                        className="admin-btn-secondary"
                                        style={{ flexShrink: 0 }}
                                        onClick={() => removeSpec(i)}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                            <button className="admin-btn-secondary mt-2" onClick={addSpec}>
                                + Agregar especificación
                            </button>
                        </div>
                    )}

                    {/* ── FAQ ── */}
                    {activeTab === 'FAQ' && (
                        <div className="tab-pane">
                            <h3>Preguntas frecuentes</h3>
                            {faqs.map((faq, i) => (
                                <div
                                    key={i}
                                    style={{
                                        border: '1px solid #e0e0e0',
                                        borderRadius: '0.5rem',
                                        padding: '1rem',
                                        marginBottom: '0.75rem',
                                    }}
                                >
                                    <div className="form-group">
                                        <label>Pregunta</label>
                                        <input
                                            type="text"
                                            placeholder="¿Cuál es el tiempo de entrega?"
                                            value={faq.question}
                                            onChange={e => updateFaq(i, 'question', e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Respuesta</label>
                                        <textarea
                                            rows={3}
                                            placeholder="La entrega demora entre 3 y 5 días hábiles..."
                                            value={faq.answer}
                                            onChange={e => updateFaq(i, 'answer', e.target.value)}
                                        />
                                    </div>
                                    <button
                                        className="admin-btn-secondary"
                                        onClick={() => removeFaq(i)}
                                    >
                                        Eliminar pregunta
                                    </button>
                                </div>
                            ))}
                            <button className="admin-btn-secondary mt-2" onClick={addFaq}>
                                + Agregar pregunta
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {showCategoryModal && (
                <div
                    className="cat-modal-overlay"
                    onClick={() => { setShowCategoryModal(false); setNewCatName(''); setCategoryError(''); setNewCatParentId(null); }}
                >
                    <div className="cat-modal cat-modal--create" onClick={e => e.stopPropagation()}>
                        <h4 className="cat-modal__title">Nueva Categoría</h4>
                        <div className="form-group">
                            <label>Nombre</label>
                            <input
                                type="text"
                                placeholder="Ej: Vestidos"
                                value={newCatName}
                                onChange={e => setNewCatName(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && newCatName.trim()) handleCreateCategory(); }}
                                autoFocus
                            />
                        </div>
                        <div className="form-group">
                            <label>¿Dónde agregarla?</label>
                            <select
                                className="cat-parent-select"
                                value={newCatParentId ?? '__root__'}
                                onChange={e => setNewCatParentId(e.target.value === '__root__' ? null : e.target.value)}
                            >
                                <option value="__root__">— Categoría principal (nivel 1)</option>
                                {(() => {
                                    const opts: React.ReactElement[] = [];
                                    const addOpt = (cat: Category, depth: number) => {
                                        const prefix = '\u00a0\u00a0\u00a0'.repeat(depth) + (depth > 0 ? '↳ ' : '');
                                        opts.push(
                                            <option key={cat.id} value={cat.id}>
                                                {prefix}{cat.name}
                                            </option>
                                        );
                                        if (cat.level < 2) {
                                            dbCategories
                                                .filter(c => c.parent_id === cat.id)
                                                .forEach(child => addOpt(child, depth + 1));
                                        }
                                    };
                                    dbCategories.filter(c => c.level === 1).forEach(root => addOpt(root, 0));
                                    return opts;
                                })()}
                            </select>
                            <p className="cat-location-hint">
                                {newCatParentId ? (() => {
                                    const parent = dbCategories.find(c => c.id === newCatParentId);
                                    if (!parent) return null;
                                    if (parent.level === 1) {
                                        return <>Subcategoría de <strong>{parent.name}</strong></>;
                                    }
                                    const grandparent = dbCategories.find(c => c.id === parent.parent_id);
                                    return <>Subcategoría de <strong>{parent.name}</strong>{grandparent ? <> (dentro de {grandparent.name})</> : null}</>;
                                })() : 'Se creará como categoría principal'}
                            </p>
                        </div>
                        {categoryError && (
                            <p className="cat-modal__error">{categoryError}</p>
                        )}
                        <div className="cat-modal__actions">
                            <button
                                type="button"
                                className="admin-btn-secondary"
                                onClick={() => { setShowCategoryModal(false); setNewCatName(''); setCategoryError(''); setNewCatParentId(null); }}
                                disabled={savingCategory}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                className="admin-btn-primary"
                                onClick={handleCreateCategory}
                                disabled={!newCatName.trim() || savingCategory}
                            >
                                {savingCategory ? 'Guardando...' : 'Crear categoría'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showManageCatModal && (
                <div
                    className="cat-modal-overlay"
                    onClick={() => { setShowManageCatModal(false); setManageCatError(''); }}
                >
                    <div className="cat-modal cat-modal--manage" onClick={e => e.stopPropagation()}>

                        {/* ── Header ── */}
                        <div className="cat-manage-header">
                            <div className="cat-manage-header-info">
                                <h4 className="cat-manage-title">Gestionar Categorías</h4>
                                <p className="cat-manage-subtitle">
                                    {categoryTree.length} principal{categoryTree.length !== 1 ? 'es' : ''} · {dbCategories.length} en total
                                </p>
                            </div>
                            <button
                                type="button"
                                className="cat-manage-close-btn"
                                onClick={() => { setShowManageCatModal(false); setManageCatError(''); }}
                                title="Cerrar"
                            >
                                ✕
                            </button>
                        </div>

                        {/* ── Hint ── */}
                        <div className="cat-manage-hint">
                            <p>Eliminar una categoría también elimina sus subcategorías. Pasá el cursor (o tocá) para ver las acciones.</p>
                        </div>

                        {/* ── Error ── */}
                        {manageCatError && <p className="cat-modal__error" style={{ margin: '0.6rem 1.25rem 0' }}>{manageCatError}</p>}

                        {/* ── Tree body ── */}
                        <div className="cat-manage-body">
                            {categoryTree.length === 0 ? (
                                <div className="cat-list__empty">
                                    <FolderOpen size={36} strokeWidth={1.5} className="cat-list__empty-icon" />
                                    <p>No hay categorías creadas aún.</p>
                                    <p className="cat-list__empty-sub">Usá el botón de abajo para crear la primera.</p>
                                </div>
                            ) : (
                                <div className="cat-tree">
                                    {categoryTree.map(cat => (
                                        <div key={cat.id} className="cat-tree-node">
                                            {/* Nivel 1 */}
                                            <div className="cat-tree-row cat-tree-row--1">
                                                <span className="cat-tree-icon">
                                                    <Folder size={16} strokeWidth={1.8} />
                                                </span>
                                                <span className="cat-tree-name">{cat.name}</span>
                                                {cat.children.length > 0 && (
                                                    <span className="cat-tree-badge">{cat.children.length}</span>
                                                )}
                                                <div className="cat-tree-actions">
                                                    <button
                                                        type="button"
                                                        className="cat-tree-add-btn"
                                                        title={`Agregar subcategoría en "${cat.name}"`}
                                                        onClick={() => {
                                                            setNewCatParentId(cat.id);
                                                            setShowManageCatModal(false);
                                                            setNewCatName('');
                                                            setCategoryError('');
                                                            setShowCategoryModal(true);
                                                        }}
                                                    >
                                                        <Plus size={11} strokeWidth={2.5} /> Sub
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="cat-tree-del-btn"
                                                        disabled={deletingCatId === cat.id}
                                                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                                        title="Eliminar categoría"
                                                    >
                                                        {deletingCatId === cat.id ? '…' : <X size={13} strokeWidth={2.5} />}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Nivel 2 */}
                                            {cat.children.length > 0 && (
                                                <div className="cat-tree-children">
                                                    {cat.children.map(sub => (
                                                        <div key={sub.id} className="cat-tree-node">
                                                            <div className="cat-tree-row cat-tree-row--2">
                                                                <span className="cat-tree-icon cat-tree-icon--sub">
                                                                    <FolderOpen size={14} strokeWidth={1.8} />
                                                                </span>
                                                                <span className="cat-tree-name cat-tree-name--sub">{sub.name}</span>
                                                                {sub.children.length > 0 && (
                                                                    <span className="cat-tree-badge">{sub.children.length}</span>
                                                                )}
                                                                <div className="cat-tree-actions">
                                                                    <button
                                                                        type="button"
                                                                        className="cat-tree-add-btn cat-tree-add-btn--sm"
                                                                        title={`Agregar subcategoría en "${sub.name}"`}
                                                                        onClick={() => {
                                                                            setNewCatParentId(sub.id);
                                                                            setShowManageCatModal(false);
                                                                            setNewCatName('');
                                                                            setCategoryError('');
                                                                            setShowCategoryModal(true);
                                                                        }}
                                                                    >
                                                                        <Plus size={10} strokeWidth={2.5} /> Sub
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="cat-tree-del-btn cat-tree-del-btn--sm"
                                                                        disabled={deletingCatId === sub.id}
                                                                        onClick={() => handleDeleteCategory(sub.id, sub.name)}
                                                                        title="Eliminar"
                                                                    >
                                                                        {deletingCatId === sub.id ? '…' : <X size={12} strokeWidth={2.5} />}
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Nivel 3 */}
                                                            {sub.children.length > 0 && (
                                                                <div className="cat-tree-children cat-tree-children--deep">
                                                                    {sub.children.map(subsub => (
                                                                        <div key={subsub.id} className="cat-tree-row cat-tree-row--3">
                                                                            <span className="cat-tree-icon cat-tree-icon--subsub">
                                                                                <Dot size={16} strokeWidth={3} />
                                                                            </span>
                                                                            <span className="cat-tree-name cat-tree-name--subsub">{subsub.name}</span>
                                                                            <div className="cat-tree-actions">
                                                                                <button
                                                                                    type="button"
                                                                                    className="cat-tree-del-btn cat-tree-del-btn--sm"
                                                                                    disabled={deletingCatId === subsub.id}
                                                                                    onClick={() => handleDeleteCategory(subsub.id, subsub.name)}
                                                                                    title="Eliminar"
                                                                                >
                                                                                    {deletingCatId === subsub.id ? '…' : <X size={11} strokeWidth={2.5} />}
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ── Footer ── */}
                        <div className="cat-manage-footer">
                            <button
                                type="button"
                                className="admin-btn-secondary"
                                onClick={() => {
                                    setShowManageCatModal(false);
                                    setManageCatError('');
                                    setNewCatParentId(null);
                                    setNewCatName('');
                                    setCategoryError('');
                                    setShowCategoryModal(true);
                                }}
                            >
                                + Nueva categoría
                            </button>
                            <button
                                type="button"
                                className="admin-btn-primary"
                                onClick={() => { setShowManageCatModal(false); setManageCatError(''); }}
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="product-modal-footer">
                <button className="admin-btn-secondary" onClick={onClose} disabled={saving}>
                    Cancelar
                </button>
                <button
                    className="admin-btn-primary"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? 'Guardando...' : 'Guardar producto'}
                </button>
            </div>

        </Modal>

        <ConfirmationModal
            isOpen={outOfStockConfirmOpen}
            onClose={() => setOutOfStockConfirmOpen(false)}
            title="Producto sin stock"
            message='Este producto no tiene stock disponible, pero está configurado como "Activo". ¿Deseás mostrarlo igualmente en la tienda indicando que está Sin stock?'
            status="error"
            actionButtonText="Mostrar igualmente"
            cancelButtonText="Cancelar"
            onActionClick={() => {
                setOutOfStockConfirmOpen(false);
                void executeSave();
            }}
        />

        <ConfirmationModal
            isOpen={deleteCatConfirm !== null}
            onClose={() => setDeleteCatConfirm(null)}
            title={`Eliminar "${deleteCatConfirm?.name}"`}
            message="También se eliminarán sus subcategorías. Esta acción no se puede deshacer."
            status="error"
            actionButtonText="Eliminar"
            cancelButtonText="Cancelar"
            onActionClick={confirmDeleteCategory}
        />

        <CloudinaryImagePicker
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            onSelect={handlePickerSelect}
        />

        </>
    );
};

export default ProductModal;
