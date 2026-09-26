import React, { useState, useMemo } from 'react';
import { Property, PropertyType } from '../../types';
import { PropertyCard } from './PropertyCard';
import { PropertyDetails } from './PropertyDetails';
import { PropertyCompareModal } from './PropertyCompareModal';
import { RentalApplicationModal } from './RentalApplicationModal';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import {
  Search,
  SlidersHorizontal,
  X,
  Sun,
  Droplet,
  Wifi,
  Scale,
  Heart,
  Plus,
  Building,
  RotateCcw,
  Tag,
  Home,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ZIMBABWE_PROVINCES, getAllCitiesAndTowns } from '../../data/zimbabweLocations';

interface PropertyListProps {
  onOpenCreateListing: () => void;
  onStartChat: (recipientId: string, recipientName: string, propertyId: string) => void;
}

export const PropertyList: React.FC<PropertyListProps> = ({
  onOpenCreateListing,
  onStartChat,
}) => {
  const { role, currentUser } = useAuth();

  // Search & Filter State
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'rental' | 'sale'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [selectedProvince, setSelectedProvince] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [maxRent, setMaxRent] = useState<number>(1000);
  const [minBeds, setMinBeds] = useState<number>(0);
  const [onlySolar, setOnlySolar] = useState(false);
  const [onlyBorehole, setOnlyBorehole] = useState(false);
  const [onlyWifi, setOnlyWifi] = useState(false);
  const [onlyFurnished, setOnlyFurnished] = useState(false);
  const [onlyPetFriendly, setOnlyPetFriendly] = useState(false);
  const [onlySaved, setOnlySaved] = useState(false);

  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [applyingProperty, setApplyingProperty] = useState<Property | null>(null);
  const [comparedProperties, setComparedProperties] = useState<Property[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  // Pagination / Lazy Virtualized batch size
  const [displayCount, setDisplayCount] = useState(12);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Live queries from local reactive IndexedDB
  const allProperties = useLiveQuery(() => db.properties.toArray(), []) || [];
  const savedListingIds = useLiveQuery(
    async () => {
      if (!currentUser) return [];
      const saved = await db.savedProperties.where('userId').equals(currentUser.id).toArray();
      return saved.map(s => s.propertyId);
    },
    [currentUser?.id]
  ) || [];

  // Filter properties in memory (fast and offline)
  const filteredProperties = useMemo(() => {
    return allProperties.filter(property => {
      // Disappear from active listings if marked taken/occupied for >= 24 hours
      if (property.availability === 'Occupied') {
        const occupiedTimestamp = property.occupiedAt || property.updatedAt || property.createdAt;
        const elapsed = Date.now() - occupiedTimestamp;
        if (elapsed >= 24 * 60 * 60 * 1000) {
          return false; // Disappears from active listings after 24h
        }
      }

      // Filter by Listing Category (All vs Rental vs Sale)
      if (categoryFilter !== 'all') {
        const cat = property.listingCategory || 'rental';
        if (cat !== categoryFilter) return false;
      }

      if (onlySaved && !savedListingIds.includes(property.id)) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = property.name.toLowerCase().includes(q);
        const matchesSuburb = property.suburb.toLowerCase().includes(q);
        const matchesCity = property.city.toLowerCase().includes(q);
        const matchesType = property.propertyType.toLowerCase().includes(q);
        const matchesDesc = property.description.toLowerCase().includes(q);
        if (!matchesName && !matchesSuburb && !matchesCity && !matchesType && !matchesDesc) {
          return false;
        }
      }

      if (selectedCity !== 'All' && property.city.toLowerCase() !== selectedCity.toLowerCase()) {
        return false;
      }

      if (selectedProvince !== 'All' && property.province.toLowerCase() !== selectedProvince.toLowerCase()) {
        return false;
      }

      if (selectedType !== 'All' && property.propertyType !== selectedType) {
        return false;
      }

      if (property.rentUsd > maxRent) {
        return false;
      }

      if (minBeds > 0 && property.bedrooms < minBeds) {
        return false;
      }

      if (onlySolar && !property.amenities.some(a => a.toLowerCase().includes('solar'))) {
        return false;
      }

      if (onlyBorehole && !property.amenities.some(a => a.toLowerCase().includes('borehole'))) {
        return false;
      }

      if (onlyWifi && !property.amenities.some(a => a.toLowerCase().includes('wifi'))) {
        return false;
      }

      if (onlyFurnished && !property.amenities.some(a => a.toLowerCase().includes('furnished'))) {
        return false;
      }

      if (onlyPetFriendly && !property.amenities.some(a => a.toLowerCase().includes('pet'))) {
        return false;
      }

      return true;
    });
  }, [
    allProperties,
    savedListingIds,
    onlySaved,
    searchQuery,
    selectedCity,
    selectedProvince,
    selectedType,
    maxRent,
    minBeds,
    onlySolar,
    onlyBorehole,
    onlyWifi,
    onlyFurnished,
    onlyPetFriendly,
  ]);

  const visibleProperties = filteredProperties.slice(0, displayCount);

  const toggleCompare = (p: Property) => {
    if (comparedProperties.some(c => c.id === p.id)) {
      setComparedProperties(comparedProperties.filter(c => c.id !== p.id));
    } else {
      if (comparedProperties.length >= 3) {
        showToast('You can compare a maximum of 3 properties simultaneously.');
        return;
      }
      setComparedProperties([...comparedProperties, p]);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCity('All');
    setSelectedProvince('All');
    setSelectedType('All');
    setMaxRent(1000);
    setMinBeds(0);
    setOnlySolar(false);
    setOnlyBorehole(false);
    setOnlyWifi(false);
    setOnlyFurnished(false);
    setOnlyPetFriendly(false);
    setOnlySaved(false);
  };

  const quickCities = ['All', 'Harare', 'Bulawayo', 'Gweru', 'Mutare', 'Chinhoyi', 'Victoria Falls'];

  const propertyTypeOptions: (PropertyType | 'All')[] = [
    'All',
    'Cottage',
    'Apartment',
    'Flat',
    'House',
    'Student Accommodation',
    'Room',
    'Shared Room',
  ];

  const activeFiltersCount =
    (selectedCity !== 'All' ? 1 : 0) +
    (selectedProvince !== 'All' ? 1 : 0) +
    (selectedType !== 'All' ? 1 : 0) +
    (maxRent < 1000 ? 1 : 0) +
    (minBeds > 0 ? 1 : 0) +
    (onlySolar ? 1 : 0) +
    (onlyBorehole ? 1 : 0) +
    (onlyWifi ? 1 : 0) +
    (onlyFurnished ? 1 : 0) +
    (onlyPetFriendly ? 1 : 0) +
    (onlySaved ? 1 : 0);

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 space-y-4">
      {/* Toast Notice */}
      {toastMessage && (
        <div className="bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-md flex items-center justify-between animate-in fade-in duration-150">
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white ml-2 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Search & Action Bar */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search suburb (Avondale, Hillside...), city, or features..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-2xs outline-hidden"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilterDrawer(true)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition shadow-2xs ${
              activeFiltersCount > 0
                ? 'bg-emerald-700 text-white border-emerald-700'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-white text-emerald-800 text-[10px] font-bold flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Add Listing Button for Landlords */}
          {(role === 'landlord' || role === 'property_manager') && (
            <button
              onClick={onOpenCreateListing}
              className="flex md:hidden items-center justify-center p-2 rounded-xl bg-emerald-700 text-white shadow-2xs hover:bg-emerald-800 transition"
              title="Add Listing"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick Filter Pills Row */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {/* Saved toggle */}
          <button
            onClick={() => setOnlySaved(!onlySaved)}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition ${
              onlySaved
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Heart className={`w-3 h-3 ${onlySaved ? 'fill-current' : ''}`} />
            <span>Saved ({savedListingIds.length})</span>
          </button>

          {/* Solar quick pill */}
          <button
            onClick={() => setOnlySolar(!onlySolar)}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition ${
              onlySolar
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Sun className="w-3 h-3 text-amber-600" />
            <span>Solar Backup</span>
          </button>

          {/* Borehole quick pill */}
          <button
            onClick={() => setOnlyBorehole(!onlyBorehole)}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition ${
              onlyBorehole
                ? 'bg-sky-100 text-sky-900 border border-sky-300'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Droplet className="w-3 h-3 text-sky-600" />
            <span>Borehole Water</span>
          </button>

          {/* Quick city pills */}
          <div className="h-4 w-px bg-slate-300 mx-1 shrink-0" />
          {quickCities.map(city => (
            <button
              key={city}
              onClick={() => setSelectedCity(city)}
              className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition ${
                selectedCity === city
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {city}
            </button>
          ))}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-800">{filteredProperties.length}</span> Zimbabwe accommodation listings
        </p>

        {activeFiltersCount > 0 && (
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
          >
            <RotateCcw className="w-3 h-3" />
            Reset Filters
          </button>
        )}
      </div>

      {/* Virtualized / Batched Listings Grid */}
      {allProperties.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3 shadow-2xs">
          <Building className="w-12 h-12 text-emerald-600/60 mx-auto" />
          <h3 className="font-extrabold text-slate-900 text-sm">Clean Database Ready for Industry Data</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            All sample data has been cleared. Real landlords, agents, and property managers can add verified property listings to the persistent cloud database.
          </p>
          {(role === 'landlord' || role === 'property_manager' || role === 'admin') ? (
            <button
              onClick={onOpenCreateListing}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 transition cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Publish First Property Listing</span>
            </button>
          ) : (
            <p className="text-[11px] text-emerald-700 font-medium">
              Sign in as a Landlord or Administrator to publish real properties.
            </p>
          )}
        </div>
      ) : visibleProperties.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
          <Building className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-900 text-sm">No properties match your filters</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search criteria, widening the price budget, or resetting filters.
          </p>
          <button
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1 px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 cursor-pointer"
          >
            Show All Listings
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleProperties.map(property => (
            <PropertyCard
              key={property.id}
              property={property}
              onSelect={p => setSelectedProperty(p)}
              onApply={p => setApplyingProperty(p)}
              onMessageOwner={p => onStartChat(p.landlordId, p.landlordName, p.id)}
              onToggleCompare={toggleCompare}
              isCompared={comparedProperties.some(c => c.id === property.id)}
            />
          ))}
        </div>
      )}

      {/* Infinite load more button if long list */}
      {visibleProperties.length < filteredProperties.length && (
        <div className="text-center pt-4">
          <button
            onClick={() => setDisplayCount(prev => prev + 12)}
            className="px-6 py-2.5 bg-white border border-slate-300 text-slate-800 font-semibold text-xs rounded-xl shadow-2xs hover:bg-slate-50 transition"
          >
            Load More Listings ({filteredProperties.length - visibleProperties.length} remaining)
          </button>
        </div>
      )}

      {/* Floating Compare Bar if items selected */}
      {comparedProperties.length > 0 && (
        <div className="fixed bottom-16 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200 border border-slate-800">
          <div className="flex items-center gap-1.5 text-xs">
            <Scale className="w-4 h-4 text-emerald-400" />
            <span>
              <strong>{comparedProperties.length}</strong> / 3 selected to compare
            </span>
          </div>
          <button
            onClick={() => setShowCompareModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs transition"
          >
            Compare Now
          </button>
          <button
            onClick={() => setComparedProperties([])}
            className="text-slate-400 hover:text-white p-1"
            title="Clear comparison"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Detailed View Modal */}
      {selectedProperty && (
        <PropertyDetails
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
          onStartChat={onStartChat}
        />
      )}

      {/* Quick Rental Application Modal directly from Card CTA */}
      {applyingProperty && (
        <RentalApplicationModal
          property={applyingProperty}
          isOpen={!!applyingProperty}
          onClose={() => setApplyingProperty(null)}
          onSuccess={() => showToast(`Rental application prepared & submitted for "${applyingProperty.name}"!`)}
        />
      )}

      {/* Side-by-Side Comparison Modal */}
      {showCompareModal && (
        <PropertyCompareModal
          properties={comparedProperties}
          onClose={() => setShowCompareModal(false)}
          onRemove={id => setComparedProperties(comparedProperties.filter(c => c.id !== id))}
          onSelectProperty={p => {
            setShowCompareModal(false);
            setSelectedProperty(p);
          }}
        />
      )}

      {/* Advanced Filter Drawer */}
      {showFilterDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-2xs">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto p-5 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="font-bold text-base text-slate-900">Advanced Search Filters</h3>
                <button
                  onClick={() => setShowFilterDrawer(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Province Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Province</label>
                <select
                  value={selectedProvince}
                  onChange={e => setSelectedProvince(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                >
                  <option value="All">All 10 Provinces</option>
                  {ZIMBABWE_PROVINCES.map(p => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* City Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">City or Town</label>
                <select
                  value={selectedCity}
                  onChange={e => setSelectedCity(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                >
                  <option value="All">All Cities & Towns</option>
                  {getAllCitiesAndTowns().map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Property Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Property Type</label>
                <select
                  value={selectedType}
                  onChange={e => setSelectedType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                >
                  {propertyTypeOptions.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Maximum Rent */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>Max Rent (USD)</span>
                  <span className="text-emerald-700">${maxRent}/mo</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={2000}
                  step={25}
                  value={maxRent}
                  onChange={e => setMaxRent(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>$50</span>
                  <span>$1,000</span>
                  <span>$2,000+</span>
                </div>
              </div>

              {/* Minimum Bedrooms */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Minimum Bedrooms</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[0, 1, 2, 3, 4].map(b => (
                    <button
                      key={b}
                      onClick={() => setMinBeds(b)}
                      className={`py-1.5 rounded-lg text-xs font-semibold border transition ${
                        minBeds === b
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      {b === 0 ? 'Any' : `${b}+`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Zimbabwe Infrastructure Toggles */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <p className="text-xs font-bold text-slate-900">Zimbabwe Infrastructure Must-Haves</p>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlySolar}
                    onChange={e => setOnlySolar(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Solar Backup Power (Load-shedding immune)</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyBorehole}
                    onChange={e => setOnlyBorehole(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Borehole Water & Jojo Tank System</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyWifi}
                    onChange={e => setOnlyWifi(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>High-Speed WiFi</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyFurnished}
                    onChange={e => setOnlyFurnished(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Furnished</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyPetFriendly}
                    onChange={e => setOnlyPetFriendly(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Pet Friendly</span>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex gap-2">
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex-1 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-xl hover:bg-slate-50"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setShowFilterDrawer(false)}
                className="flex-1 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl"
              >
                Show Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
