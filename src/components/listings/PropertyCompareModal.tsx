import React from 'react';
import { Property } from '../../types';
import { X, Check, Minus, Bed, Bath, Sun, Droplet, Shield, Wifi, Car, Dog, Armchair } from 'lucide-react';

interface PropertyCompareModalProps {
  properties: Property[];
  onClose: () => void;
  onRemove: (propertyId: string) => void;
  onSelectProperty: (property: Property) => void;
}

export const PropertyCompareModal: React.FC<PropertyCompareModalProps> = ({
  properties,
  onClose,
  onRemove,
  onSelectProperty,
}) => {
  if (properties.length === 0) return null;

  const compareFeatures = [
    { label: 'Monthly Rent (USD)', getVal: (p: Property) => `$${p.rentUsd}/mo` },
    { label: 'Estimated ZiG', getVal: (p: Property) => p.rentZig ? `ZiG ${p.rentZig.toLocaleString()}` : '-' },
    { label: 'Security Deposit', getVal: (p: Property) => `$${p.depositUsd}` },
    { label: 'Location', getVal: (p: Property) => `${p.suburb}, ${p.city}` },
    { label: 'Property Type', getVal: (p: Property) => p.propertyType },
    { label: 'Bedrooms', getVal: (p: Property) => `${p.bedrooms} Beds` },
    { label: 'Bathrooms', getVal: (p: Property) => `${p.bathrooms} Baths` },
    { label: 'Availability', getVal: (p: Property) => p.availability },
    {
      label: 'Solar Backup',
      hasIcon: true,
      getVal: (p: Property) =>
        p.amenities.some(a => a.toLowerCase().includes('solar')),
    },
    {
      label: 'Borehole Water',
      hasIcon: true,
      getVal: (p: Property) =>
        p.amenities.some(a => a.toLowerCase().includes('borehole')),
    },
    {
      label: 'Fast WiFi',
      hasIcon: true,
      getVal: (p: Property) =>
        p.amenities.some(a => a.toLowerCase().includes('wifi')),
    },
    {
      label: 'Prepaid ZESA',
      hasIcon: true,
      getVal: (p: Property) =>
        p.amenities.some(a => a.toLowerCase().includes('zesa')),
    },
    {
      label: 'Furnished',
      hasIcon: true,
      getVal: (p: Property) =>
        p.amenities.some(a => a.toLowerCase().includes('furnished')),
    },
    {
      label: '24/7 Security / Walled',
      hasIcon: true,
      getVal: (p: Property) =>
        p.amenities.some(a => a.toLowerCase().includes('security') || a.toLowerCase().includes('walled')),
    },
    {
      label: 'Pet Friendly',
      hasIcon: true,
      getVal: (p: Property) =>
        p.amenities.some(a => a.toLowerCase().includes('pet')),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-bold">Compare Properties Side-by-Side</h2>
            <p className="text-xs text-slate-300">Comparing {properties.length} selected accommodation options</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto flex-1 p-4">
          <div className="min-w-[600px]">
            {/* Property Cards Header Row */}
            <div className="grid grid-cols-4 gap-3 pb-4 border-b border-slate-200">
              <div className="text-xs font-bold text-slate-400 self-end pb-2">
                Features & Specs
              </div>
              {properties.map(p => (
                <div key={p.id} className="relative bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col justify-between">
                  <button
                    onClick={() => onRemove(p.id)}
                    className="absolute top-1.5 right-1.5 p-1 bg-white/90 rounded-full text-slate-400 hover:text-rose-500 shadow-2xs"
                    title="Remove from comparison"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <img
                    src={p.photos[0]}
                    alt={p.name}
                    className="w-full h-24 object-cover rounded-lg mb-2"
                  />
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{p.name}</h4>
                  <p className="text-xs text-slate-500">{p.suburb}, {p.city}</p>
                  <p className="text-sm font-extrabold text-emerald-700 mt-1">${p.rentUsd}/mo</p>
                  <button
                    onClick={() => {
                      onClose();
                      onSelectProperty(p);
                    }}
                    className="mt-2 w-full py-1 text-center text-[11px] font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition"
                  >
                    View Details
                  </button>
                </div>
              ))}
              {/* Fill remaining slots up to 3 */}
              {Array.from({ length: 3 - properties.length }).map((_, i) => (
                <div
                  key={`empty_${i}`}
                  className="border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center p-4 text-center text-xs text-slate-400"
                >
                  Select another property to compare
                </div>
              ))}
            </div>

            {/* Feature Rows */}
            <div className="divide-y divide-slate-100 text-xs">
              {compareFeatures.map((row, idx) => (
                <div
                  key={idx}
                  className={`grid grid-cols-4 gap-3 py-2.5 items-center ${
                    idx % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'
                  }`}
                >
                  <div className="font-medium text-slate-700 pl-2">
                    {row.label}
                  </div>
                  {properties.map(p => {
                    const val = row.getVal(p);
                    if (row.hasIcon) {
                      return (
                        <div key={p.id} className="text-center">
                          {val ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs">
                              <Check className="w-4 h-4 text-emerald-600" /> Yes
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
                              <Minus className="w-4 h-4" /> No
                            </span>
                          )}
                        </div>
                      );
                    }
                    return (
                      <div key={p.id} className="font-semibold text-slate-900 text-center">
                        {String(val)}
                      </div>
                    );
                  })}
                  {Array.from({ length: 3 - properties.length }).map((_, i) => (
                    <div key={`empty_cell_${i}`} className="text-center text-slate-300">
                      -
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
